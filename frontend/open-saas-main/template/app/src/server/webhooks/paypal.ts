import { type PaypalWebhook } from 'wasp/server/api';
import { prisma } from 'wasp/server';
import { SubscriptionTier } from '../../payment/plans';
import { cancelSubscriptionInternal, renewSubscriptionInternal } from '../services/billing/subscription';

// Definir tipos básicos del payload de PayPal
interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: {
    billing_agreement_id?: string;
    id?: string; // Para sale_id
    amount?: {
      total: string;
      currency: string;
    };
    state?: string;
    create_time?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Verifica la firma del Webhook de PayPal manualmente (sin SDK pesado).
 * Basado en la documentación oficial de PayPal: https://developer.paypal.com/api/rest/webhooks/rest/#verify-event-signature
 */
async function verifyPayPalSignature(req: any): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('[PayPal Security] PAYPAL_WEBHOOK_ID not configured. Skipping verification (UNSAFE in Production).');
    return process.env.NODE_ENV !== 'production';
  }

  const transmissionId = req.headers['paypal-transmission-id'];
  const transmissionTime = req.headers['paypal-transmission-time'];
  const certUrl = req.headers['paypal-cert-url'];
  const authAlgo = req.headers['paypal-auth-algo'];
  const transmissionSig = req.headers['paypal-transmission-sig'];

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error('[PayPal Security] Missing headers for signature verification.');
    return false;
  }

  // 1. Validar CRC32 del body (PayPal usa CRC32 del raw body)
  // Nota: Wasp/Express ya parseló el body a JSON. Necesitamos el raw string.
  // Si no tenemos acceso al raw body, esto es complicado. 
  // Alternativa: Re-stringificar (puede fallar por espacios) o confiar en un middleware de Wasp que lo exponga.
  // Por ahora, asumiremos que en un entorno real usaríamos el endpoint de verificación de PayPal API
  // para no lidiar con criptografía de bajo nivel y certificados x509.
  
  return await verifyWithPayPalAPI(req.body, req.headers, webhookId);
}

async function verifyWithPayPalAPI(body: any, headers: any, webhookId: string): Promise<boolean> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const apiUrl = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

    if (!clientId || !clientSecret) return false;

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Obtenemos token
    const tokenResp = await fetch(`${apiUrl}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { access_token } = await tokenResp.json() as any;

    // Llamamos a verify-webhook-signature
    const verifyResp = await fetch(`${apiUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            auth_algo: headers['paypal-auth-algo'],
            cert_url: headers['paypal-cert-url'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: webhookId,
            webhook_event: body
        })
    });

    const verifyData = await verifyResp.json() as any;
    return verifyData.verification_status === 'SUCCESS';
}


export const paypalWebhook: PaypalWebhook = async (req, res, context) => {
  // 1. Validación de seguridad ROBUSTA
  try {
      const isValid = await verifyPayPalSignature(req);
      if (!isValid) {
          console.error('[PayPal Security] Invalid Webhook Signature. Rejecting.');
          return res.status(403).json({ error: 'Invalid Signature' });
      }
  } catch (err) {
      console.error('[PayPal Security] Error verifying signature:', err);
      // Fail open in dev, fail closed in prod? 
      // Mejor retornar error para que PayPal reintente cuando arreglemos el servidor.
      return res.status(500).json({ error: 'Verification Failed' });
  }

  const event = req.body as PayPalWebhookEvent;
  console.log(`[PayPal Webhook] Received verified event: ${event.event_type}`);

  try {
    if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
      await handlePaymentSaleCompleted(event, context);
    } else if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED') {
        await handleSubscriptionCancelled(event, context);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[PayPal Webhook] Error processing event:', error);
    return res.status(500).json({ error: error.message });
  }
};

async function handlePaymentSaleCompleted(event: PayPalWebhookEvent, context: any) {
  const subscriptionId = event.resource.billing_agreement_id;
  const transactionId = event.resource.id; // Sale ID
  const amountStr = event.resource.amount?.total;
  const currency = event.resource.amount?.currency || 'USD';
  
  if (!subscriptionId || !transactionId || !amountStr) {
    console.log('[PayPal Webhook] Missing vital data in payload. Ignoring.');
    return;
  }

  // Check idempotency
  const existingPayment = await prisma.payment.findUnique({
      where: { paypalOrderId: transactionId }
  });
  if (existingPayment) {
      console.log(`[PayPal Webhook] Payment ${transactionId} already processed.`);
      return;
  }

  console.log(`[PayPal Webhook] Processing renewal for Subscription ID: ${subscriptionId}`);

  // 1. Buscar Usuario
  const user = await context.entities.User.findFirst({
    where: { subscriptionId: subscriptionId }
  });

  if (!user) {
    console.error(`[PayPal Webhook] User not found for subscription ID: ${subscriptionId}`);
    return;
  }

  // 2. Determinar créditos
  let creditsToAdd = 0;
  if (user.subscriptionTier === SubscriptionTier.PREMIUM) {
    creditsToAdd = 50;
  } else if (user.subscriptionTier === SubscriptionTier.ENTERPRISE) {
    creditsToAdd = 200;
  }

  if (creditsToAdd === 0) {
    console.log(`[PayPal Webhook] User tier is ${user.subscriptionTier}, no credits to add.`);
    return;
  }

  // 3. Ejecutar Lógica Centralizada de Renovación
  await renewSubscriptionInternal(
      user.id,
      creditsToAdd,
      transactionId,
      parseFloat(amountStr),
      currency
  );
}

async function handleSubscriptionCancelled(event: PayPalWebhookEvent, context: any) {
    const subscriptionId = event.resource.billing_agreement_id;
    if (!subscriptionId) return;

    const user = await context.entities.User.findFirst({
        where: { subscriptionId: subscriptionId }
    });

    if (!user) return;

    // Ejecutar Lógica Centralizada de Cancelación
    await cancelSubscriptionInternal(user.id, subscriptionId);
}

