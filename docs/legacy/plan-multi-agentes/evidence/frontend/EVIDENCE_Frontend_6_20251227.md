# 🧾 Evidencia de Integración de Facturación (Billing)

**Fecha**: 2025-12-27
**Responsable**: Agente Frontend

## 📝 Resumen de Cambios
Inicio de la implementación del módulo de facturación con PayPal y sistema de créditos.

## 🛠️ Fase 1: Arquitectura de Datos (Schema)
**Estado**: ✅ Completado (Migración aplicada `20251227064504_add_billing_tables`)

### 1. Modificación de `schema.prisma`
Se han agregado los modelos necesarios para soportar el flujo de "Banco y Espejo" y la integración con PayPal.

*   **Nuevo Modelo `Payment`**:
    *   Almacena las transacciones financieras reales (PayPal).
    *   Campos clave: `paypalOrderId`, `amount`, `status`, `creditsAmount`.
    *   Relación 1:N con `CreditUsage`.

*   **Nuevo Modelo `CreditUsage`**:
    *   Registro de auditoría (Ledger) para todo movimiento de créditos.
    *   Tipos: `PURCHASE`, `SCAN`, `REFUND`, `BONUS`.
    *   Permite rastrear en qué se gastó cada crédito.

*   **Actualización de `User`**:
    *   Agregadas relaciones inversas `payments` y `creditUsages`.

### 📄 Código Modificado
`frontend/open-saas-main/template/app/schema.prisma`

```prisma
model Payment {
  id                String          @id @default(uuid())
  createdAt         DateTime        @default(now())
  
  user              User            @relation(fields: [userId], references: [id])
  userId            String

  paypalOrderId     String          @unique
  amount            Float
  currency          String          @default("USD")
  status            String          // PENDING, COMPLETED, FAILED
  creditsAmount     Int
  
  creditUsages      CreditUsage[]
}

model CreditUsage {
  id                String          @id @default(uuid())
  createdAt         DateTime        @default(now())

  user              User            @relation(fields: [userId], references: [id])
  userId            String

  amount            Int             // Positive for purchase/refund, Negative for usage
  type              String          // PURCHASE, SCAN, REFUND, BONUS
  description       String?
  
  payment           Payment?        @relation(fields: [paymentId], references: [id])
  paymentId         String?

  relatedObjectId   String?         // ID of the related object (e.g. Scan ID from securetag-db)
}
```

## 🛠️ Fase 3: Lógica de Servidor (Wasp Actions)
**Estado**: ✅ Completado

Se implementaron las acciones seguras para interactuar con PayPal desde el Backend.

1.  **`src/server/actions/billing.ts`**:
    *   `createPayPalOrder`: Genera la orden en PayPal usando `CREDIT_PACKAGES` definidos en el servidor (No confiamos en el cliente).
    *   `capturePayPalOrder`: Captura el pago, verifica idempotencia, actualiza `User.credits` y crea registro en `CreditUsage` (Transacción Atómica).
2.  **`src/server/queries/billing.ts`**:
    *   `getBillingHistory`: Historial de pagos exitosos.
    *   `getCreditUsageHistory`: Historial de consumo de créditos (Ledger).
3.  **`main.wasp`**:
    *   Registradas las acciones y queries para uso desde el cliente.

## ⚠️ Próximos Pasos (Acción Requerida)
Integrar Frontend (`BillingPage.tsx`) con botones de PayPal.

## 🛠️ Fase 4: Sincronización de Créditos (Frontend <-> Backend)
**Estado**: ✅ Completado

Se implementó un mecanismo robusto para asegurar que el saldo de créditos en `opensaas-db` (Frontend) se refleje correctamente en `securetag-db` (Backend Core).

### Problema Resuelto
Existía una desincronización donde el Frontend mostraba el saldo real (ej: 163) y el Backend mantenía un saldo desactualizado (ej: 1000), lo que podría permitir escaneos sin saldo real o bloquear escaneos legítimos.

### Solución Implementada
1.  **System Client Seguro**:
    *   Se creó `createSystemClient` en `src/server/securetagClient.ts`.
    *   Utiliza `SECURETAG_SYSTEM_SECRET` para autenticarse como "Sistema" ante el Backend Core.
    *   Permite operaciones administrativas (como ajustar créditos) sin intervención del usuario.

2.  **Auto-Sync en Dashboard**:
    *   En `src/server/actions/sast.ts` (`getSastDashboard`), se compara el saldo local con el remoto en cada carga.
    *   Si hay discrepancia, se fuerza una actualización inmediata en el Backend.

3.  **Sync Post-Pago**:
    *   En `src/server/actions/billing.ts` (`capturePayPalOrder`), tras un pago exitoso, se notifica inmediatamente al Backend el nuevo saldo.

4.  **Endpoint de Sincronización (Backend Core)**:
    *   Se habilitó `POST /api/v1/tenant/credits/sync` en el Backend Core para recibir estas actualizaciones seguras.

### Código Relevante
`frontend/open-saas-main/template/app/src/server/securetagClient.ts`
```typescript
export const createSystemClient = (userId: string) => {
  // ... configuración con X-SecureTag-System-Secret
};
```

## 🛠️ Fase 5: Sincronización de Planes de Suscripción (Cross-DB)
**Estado**: ✅ Completado
**Migración**: `20251227212117_subscription_refactor` (Reset y Seed aplicados)

Se completó la infraestructura para manejar planes de suscripción recurrentes y su propagación al núcleo del sistema.

### 1. Estandarización de Tipos (Enums)
Se reemplazaron cadenas de texto ambiguas por Enums estrictos en todo el Frontend (`plans.ts`, `schema.prisma`).

*   **SubscriptionTier**: `FREE`, `PREMIUM`, `ENTERPRISE`
*   **SubscriptionStatus**: `ACTIVE`, `CANCELLED`, `PAST_DUE`, `NONE`

### 2. Conexión Backend Core (Securetag-App)
Se implementó el "puente" faltante para que el Backend sepa cuándo un usuario cambia de plan (habilitando/deshabilitando features avanzadas como Deep Code Vision).

*   **Nuevo Endpoint**: `POST /api/v1/tenant/plan/sync` en `securetag-app`.
*   **Funcionalidad**: Recibe `{ plan: "PREMIUM", llm_config: {...} }` y actualiza la tabla `securetag.tenant`.
*   **Seguridad**: Protegido por `X-SecureTag-System-Secret`, permitiendo solo llamadas desde el Frontend autorizado.

### 📄 Código Backend Implementado
`src/server/routes/tenant.ts` (Backend Core)

```typescript
// POST /api/v1/tenant/plan/sync
if (method === 'POST' && path === '/api/v1/tenant/plan/sync') {
  return await syncPlan(authReq, res, tenantId)
}

async function syncPlan(req: AuthenticatedRequest, res: http.ServerResponse, tenantId: string): Promise<boolean> {
  // ... validación de System Secret ...
  await dbQuery(
    'UPDATE securetag.tenant SET plan = $1, llm_config = $2 WHERE id = $3',
    [plan.toLowerCase(), llm_config, tenantId]
  )
  // ...
}
```

### 3. Migración y Limpieza
Dado que el cambio de tipos (`String` -> `Enum`) era incompatible con datos antiguos, se procedió con una estrategia de **"Reset Limpio"** en el entorno de desarrollo:
1.  `prisma migrate reset`: Eliminación de base de datos local.
2.  `prisma migrate dev`: Aplicación de la nueva estructura.
3.  `wasp db seed`: Repoblación con 50 usuarios de prueba con estados de suscripción válidos.

## 🛠️ Fase 6: Integración UI de Suscripciones (BillingPage)
**Estado**: ✅ Completado
**Fecha**: 2025-12-27

Se finalizó la integración visual y lógica de los planes de suscripción en la interfaz de usuario, completando la **Fase 2** del plan original.

### 1. Componentes Visuales y UX
*   **Tarjetas de Planes**: Se implementó una sección comparativa con tarjetas para **Free**, **Premium** y **Enterprise** en `BillingPage.tsx`.
*   **Feedback Visual**: Los botones de suscripción se deshabilitan automáticamente si el usuario ya posee ese plan o uno superior.
*   **Separación de Flujos**: Se mantiene la funcionalidad de compra de créditos independiente de la suscripción.

### 2. Solución Técnica: Aislamiento de Contextos PayPal
Para permitir la coexistencia de pagos únicos (Créditos) y recurrentes (Suscripciones) en la misma página sin conflictos de script:
*   Se eliminó el `PayPalScriptProvider` global de la página.
*   Se implementaron proveedores aislados dentro de los modales de pago específicos.
    *   **Créditos**: `intent: "capture"`
    *   **Suscripciones**: `intent: "subscription"`, `vault: true`

### 3. Lógica de Negocio (Backend)
*   **Query `getSubscriptionPlans`**: Centraliza la configuración de precios y IDs de planes de PayPal (con soporte para variables de entorno de Sandbox/Live).
*   **Action `syncSubscription`**: 
    1.  Valida la orden de suscripción.
    2.  Actualiza `User.subscriptionStatus` a `ACTIVE`.
    3.  Actualiza `User.subscriptionTier`.
    4.  Ejecuta la sincronización cross-db con `securetag-db` (Fase 5).

### 4. Archivos Modificados
*   `src/client/pages/settings/BillingPage.tsx` (UI Principal)
*   `src/server/actions/billing.ts` (Lógica de sincronización)
*   `src/server/queries/billing.ts` (Configuración de planes)
*   `src/payment/plans.ts` (Definiciones y IDs)

## ⚠️ Próximos Pasos (Acción Requerida)
*   **Pruebas End-to-End**: Realizar un flujo completo de compra en entorno Sandbox (Registro -> Compra Créditos -> Suscripción -> Escaneo).

## 🛠️ Fase 7: Implementación y Verificación de Webhooks (Crítico)
**Estado**: ✅ Completado
**Fecha**: 2025-12-28

Se implementó el sistema de Webhooks para manejar eventos asíncronos de PayPal (renovaciones automáticas y cancelaciones), asegurando que el estado del usuario se mantenga actualizado sin intervención manual.

### 1. Endpoint Seguro
*   **Ruta**: `POST /webhooks/paypal`
*   **Seguridad**: Verificación de firma criptográfica de PayPal (headers `paypal-transmission-sig`, `paypal-cert-url`, etc.) para prevenir ataques de replay o suplantación.
*   **Validación**: Si la firma falla (ej. pruebas locales sin túnel válido), el servidor responde `403 Forbidden` protegiendo la integridad de los datos.

### 2. Flujos Soportados
*   **`PAYMENT.SALE.COMPLETED`**: Detecta el cobro mensual automático.
    *   Busca al usuario por `billing_agreement_id`.
    *   Asigna los créditos correspondientes al plan (50 o 200).
    *   Registra la transacción en `CreditUsage` y `Payment`.
    *   Sincroniza el nuevo saldo con el Backend Core.
*   **`BILLING.SUBSCRIPTION.CANCELLED`**: Maneja la cancelación desde el panel de PayPal.
    *   Actualiza el estado local a `CANCELLED` (o `NONE` al finalizar el periodo).

### 3. Pruebas de Verificación
Se realizaron pruebas exitosas confirmando:
1.  **Conectividad**: El servidor recibe peticiones externas vía `ngrok`.
2.  **Seguridad**: El sistema rechaza payloads no firmados o con firmas inválidas (Logs: `[PayPal Security] Invalid Webhook Signature`).
3.  **Procesamiento**: El flujo de actualización de créditos y planes se ejecuta correctamente al recibir eventos válidos.

## 🛠️ Fase 3 (Enforcement): Control de Acceso y Límites (Backend)
**Estado**: ✅ Completado
**Fecha**: 2025-12-28

Se implementó la lógica de validación estricta en el Backend (`createScan`) para asegurar que los usuarios no consuman más recursos de los permitidos por su plan o saldo de créditos.

### 1. Sistema de Costos Unificado (Single Source of Truth)
Se creó `src/shared/sastCosts.ts` para centralizar las definiciones de costos y límites, evitando discrepancias entre el Frontend (Calculadora) y el Backend (Cobro).
*   **Costos Base**: Escaneo (5 créditos).
*   **Double Check**: Standard (1), Pro (2), Max (3).
*   **Custom Rules**: Processing Fee (1) + Success Fee (Variable según modelo).

### 2. Validaciones Implementadas (Security by Design)
Antes de procesar cualquier archivo, el servidor verifica:
1.  **Límite de Tamaño de Archivo**:
    *   Free: 10MB
    *   Premium: 50MB
    *   Enterprise: 200MB
2.  **Capacidades del Plan (Tier Enforcement)**:
    *   Si el usuario intenta usar `Custom Rules` en plan Free -> `403 Forbidden`.
    *   Si intenta usar un modelo de IA no permitido -> `403 Forbidden`.
3.  **Economía de Créditos (Pre-Check)**:
    *   Calcula el costo estimado (Worst-Case Scenario) usando `calculateScanCost`.
    *   Si `user.credits < costo` -> `402 Payment Required`.

## 🛠️ Fase 5 (UI): UI de Nuevo Escaneo (NewScanPage)
**Estado**: ✅ Completado
**Fecha**: 2025-12-28

Se integró la validación de costos y créditos en tiempo real en la interfaz de usuario.

### 1. Calculadora Dinámica
*   Se muestra un desglose detallado de los costos estimados (Base + Add-ons).
*   Se actualiza automáticamente al cambiar las opciones (Double Check, Custom Rules).

### 2. Validación Frontend
*   El botón "Start Operation" se bloquea si el usuario no tiene suficientes créditos.
*   Muestra un mensaje de advertencia claro ("INSUFFICIENT FUNDS") con un enlace directo para recargar.
*   Evita llamadas fallidas al servidor mejorando la UX.
