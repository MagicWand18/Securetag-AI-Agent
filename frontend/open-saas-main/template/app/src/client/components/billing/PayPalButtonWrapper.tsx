import { useEffect } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { createPayPalOrder, capturePayPalOrder } from "wasp/client/operations";
import { useToast } from "../../hooks/use-toast";

interface PayPalButtonWrapperProps {
  packageId: string;
  onSuccess?: (newCredits: number) => void;
}

export function PayPalButtonWrapper({ packageId, onSuccess }: PayPalButtonWrapperProps) {
  const [{ options, isPending }, dispatch] = usePayPalScriptReducer();
  const { toast } = useToast();

  // Asegurarnos de que la moneda sea USD (o la que configuremos)
  useEffect(() => {
    dispatch({
      type: "resetOptions",
      value: {
        ...options,
        currency: "USD",
      },
    } as any); // Cast as any to avoid strict typing issues with the reducer action
  }, [packageId]);

  return (
    <>
      {isPending && <div className="text-center text-sm text-muted-foreground animate-pulse">Cargando PayPal...</div>}
      <PayPalButtons
        style={{ layout: "vertical", shape: "rect" }}
        disabled={isPending}
        forceReRender={[packageId]} // Re-renderizar si cambia el paquete seleccionado
        
        createOrder={async (data, actions) => {
          try {
            // 1. Llamar al backend para crear la orden
            // Esto asegura que el precio y los items sean correctos desde el servidor
            const response = await createPayPalOrder({ packageId });
            return response.orderId;
          } catch (error: any) {
            console.error("Error creating order:", error);
            toast({
              title: "Error al iniciar pago",
              description: error.message || "No se pudo conectar con el servidor.",
              variant: "destructive",
            });
            throw error;
          }
        }}

        onApprove={async (data, actions) => {
          try {
            // 2. Llamar al backend para capturar el pago
            // Esto verifica la transacción y asigna los créditos
            const response = await capturePayPalOrder({ paypalOrderId: data.orderID });
            
            if (response.success) {
              toast({
                title: "¡Pago Exitoso!",
                description: `Se han añadido créditos a tu cuenta. Saldo actual: ${response.newCredits}`,
                variant: "default", // O "success" si tienes ese variante configurada
              });
              if (onSuccess) {
                onSuccess(response.newCredits);
              }
            }
          } catch (error: any) {
            console.error("Error capturing order:", error);
            toast({
              title: "Error al procesar pago",
              description: error.message || "El pago fue aprobado por PayPal pero falló al registrarse en nuestro sistema. Contacta soporte.",
              variant: "destructive",
            });
          }
        }}

        onError={(err) => {
          console.error("PayPal onError:", err);
          toast({
            title: "Error de PayPal",
            description: "Ocurrió un error con la ventana de pago de PayPal.",
            variant: "destructive",
          });
        }}
      />
    </>
  );
}
