# 💰 Plan de Implementación: Sistema de Suscripciones y Economía de Créditos

**Estado**: Planificación
**Fecha**: 2025-12-27
**Objetivo**: Implementar un modelo de negocio híbrido (Suscripción Mensual + Paquetes de Créditos) para asegurar ingresos recurrentes y monetizar el uso intensivo de IA.

---

## 1. Estructura de Niveles (Tiers)

Definimos 3 niveles de servicio para cubrir desde desarrolladores individuales hasta grandes organizaciones.

| Característica | **Free (Starter)** | **Premium (Pro)** | **Enterprise (Elite)** |
| :--- | :---: | :---: | :---: |
| **Costo Mensual** | **$0 USD** | **$29 USD** | **$99 USD** |
| **Créditos Incluidos** | 0 / mes | **50 / mes** ($45 valor) | **200 / mes** ($160 valor) |
| **Límite de Archivo** | **10 MB** | **50 MB** | **200 MB** |
| **Motor de Análisis** | SAST Estándar | **Deep Code Vision**<br>(Contexto Extendido) | **Architectural Flow**<br>(Cross-file Analysis) |
| **AI Double Check** | Acceso (Paga c/créditos) | Acceso (Paga c/créditos) | Acceso (Paga c/créditos) |
| **Custom Rules** | Modelo Standard | Modelos Std & Pro | Modelos Std, Pro & **Max** |
| **Recomendación** | Proyectos pequeños | Freelancers / Startups | Empresas / Equipos |

> **Nota sobre Límites de Archivo (Task #4):**
> Para archivos que superen el límite del plan, el sistema rechazará la subida y recomendará: *"Su archivo excede el límite de {MB} de su plan. Recomendamos auditar por componentes separados (Frontend, Backend, Middleware) o actualizar su suscripción."*

---

## 2. Economía de Créditos (Credit Economy)

Unificamos el costo de las operaciones para simplificar el modelo mental del usuario.

| Acción | Costo | Descripción |
| :--- | :---: | :--- |
| **Escaneo SAST** | **5 Créditos** | Análisis completo de un proyecto/repositorio. |
| **AI Double Check (Std)** | 1 Crédito | Validación rápida de hallazgo. |
| **AI Double Check (Pro)** | 2 Créditos | Validación profunda. |
| **Generar Regla** | 1 Crédito | Fee de procesamiento. |
| **Regla Exitosa** | +2 a +9 Créditos | Fee de éxito (según complejidad). |

---

## 3. Plan Técnico de Implementación

### Fase 1: Base de Datos y Backend (Core)
**Estado**: ✅ Completado
**Archivo**: `schema.prisma`, `migrations/*`

Modificación implementada de la entidad `User` para soportar suscripciones recurrentes y garantizar la sincronización con el backend `securetag-db`.

```prisma
// Enums para manejo de estado y nivel de suscripción
enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  NONE
}

enum SubscriptionTier {
  FREE
  PREMIUM
  ENTERPRISE
}

model User {
  // ... campos existentes ...
  
  // Gestión de Suscripción Recurrente
  subscriptionStatus SubscriptionStatus @default(NONE) // Migrado de String a Enum
  subscriptionTier   SubscriptionTier   @default(FREE) // Nuevo campo para control de features
  subscriptionId     String?            // ID de suscripción de PayPal (Billing Agreement ID)
  nextBillingDate    DateTime?          // Fecha del próximo cobro/renovación
  
  // ... resto de campos ...
}
```

**Estrategia de Sincronización (Frontend <-> Backend):**
Dado que existen dos bases de datos (`opensaas-db` y `securetag-db`), la integridad es crítica.
1.  **Trigger**: Al confirmar una suscripción en el Frontend.
2.  **Acción Local**: Actualizar `User` en `opensaas-db`.
3.  **Sync Remoto**: Llamar al endpoint de sistema `POST /tenants/{id}/sync-plan` en SecureTag para actualizar `tenant.plan` y `tenant.llm_config` (habilitando Deep Code Vision).

**Lógica de Renovación (Automática vía Webhook):**
*   **Implementado**: Endpoint `POST /webhooks/paypal` que recibe notificaciones `PAYMENT.SALE.COMPLETED`.
*   Al confirmarse el cobro mensual, el sistema:
    1.  Identifica al usuario por `subscriptionId`.
    2.  Asigna los créditos del mes (50 o 200).
    3.  Registra la transacción en `CreditUsage`.
    4.  Sincroniza el nuevo saldo con SecureTag Core.

### Fase 2: Integración con PayPal (Suscripciones)
**Estado**: Completado ✅
**Archivos**: `src/server/actions/billing.ts`, `src/client/pages/settings/BillingPage.tsx`, `src/payment/plans.ts`

1.  **Backend (Actions & Queries)**:
    *   `getSubscriptionPlans`: Retorna configuración de planes y `PayPal Plan IDs` (Soporte Sandbox/Live).
    *   `syncSubscription`: Action segura que se ejecuta `onApprove` para activar la suscripción localmente y sincronizar con SecureTag Core.
2.  **Frontend (BillingPage)**:
    *   Implementada UI con 3 niveles (Free, Premium, Enterprise).
    *   **Aislamiento de Contexto**: Se separaron los `PayPalScriptProvider` para manejar independientemente pagos únicos (Créditos) y recurrentes (Suscripciones).
    *   Lógica de visualización condicional basada en `user.subscriptionTier`.

### Fase 3: Control de Acceso y Límites (Enforcement)
**Archivo**: `src/server/actions/sast.ts` (Middleware de escaneo)
**Estado**: Completado ✅

Antes de iniciar cualquier tarea de análisis, se deben aplicar las siguientes validaciones de negocio y seguridad:

1.  **Verificación de Créditos (Tabla de Costos)**:
    El sistema debe verificar si el usuario tiene saldo suficiente para la operación base y los add-ons seleccionados.

    | Operación | Costo (Créditos) | Detalle |
    | :--- | :---: | :--- |
    | **Escaneo Base** | **5** | Requisito mínimo. |
    | **AI Double Check (Std)** | +1 | Validación rápida. |
    | **AI Double Check (Pro)** | +2 | Razonamiento avanzado. |
    | **AI Double Check (Max)** | +3 | SOTA (State-of-the-Art). |
    | **Gen. Reglas (Process)**| +1 | Fee por intento de generación. |
    | **Gen. Reglas (Success)**| +2 / +4 / +9 | Fee adicional si la regla se crea (Std/Pro/Max). |

    ```typescript
    // Lógica implementada en sast.ts
    const costEstimation = calculateScanCost({ ... });
    if (context.user.credits < costEstimation.total) {
        throw new HttpError(402, `Insufficient credits. Required: ${costEstimation.total}, Available: ${context.user.credits}.`);
    }
    ```

    **Lógica de Reserva (Worst-Case Scenario):**
    Para operaciones con costo variable, el sistema valida que el usuario posea créditos suficientes para cubrir el *escenario de costo máximo*.

2.  **Verificación de Tamaño de Archivo (Storage Limits)**:
    Implementado cálculo de tamaño estimado desde Base64.
    ```typescript
    const estimatedSizeMb = (args.fileContent.length * 0.75) / (1024 * 1024);
    if (estimatedSizeMb > limits.maxFileSizeMb) {
         throw new HttpError(400, `File size exceeds plan limit of ${limits.maxFileSizeMb}MB.`);
    }
    ```

3.  **Restricción de Features y Modelos (Capabilities Matrix)**:
    Se debe validar que el plan del usuario tenga acceso a los modelos y capacidades solicitadas.

    | Feature / Modelo | Free | Premium | Enterprise |
    | :--- | :---: | :---: | :---: |
    | **Deep Code Vision** | ❌ | ✅ | ✅ |
    | **Architectural Flow** | ❌ | ❌ | ✅ |
    | **Custom Rules (Gen)** | ❌ | ✅ | ✅ |
    | **Modelos Permitidos** | - | `standard`, `pro` | `standard`, `pro`, `max` |

    *Reglas de Validación:*
    *   **Deep Code Vision**: Si `tier == FREE`, desactivar feature (o lanzar error si se fuerza).
    *   **Architectural Flow**: Si `tier != ENTERPRISE`, desactivar feature.
    *   **Custom Rules**:
        *   Si `custom_rules == true` y `tier == FREE` -> **Error 403** (Upgrade Required).
        *   Si `custom_rule_model == 'max'` y `tier != ENTERPRISE` -> **Error 403** (Enterprise Required).

### Fase 4: Interfaz de Usuario (Billing Page)
**Archivo**: `BillingPage.tsx`
**Estado**: Completado ✅

1.  **Nueva Sección "Planes de Suscripción"**:
    *   Diseño de 3 columnas comparativas.
    *   Lógica condicional: Mostrar botón "Upgrade" o "Manage Subscription".
2.  **Compra de Créditos**:
    *   Integración con PayPal Buttons para paquetes de créditos.
    *   Modal de confirmación.

### Fase 5: UI de Nuevo Escaneo (NewScanPage)
**Archivo**: `src/client/pages/sast/NewScanPage.tsx`
**Estado**: Completado ✅

Implementada "Calculadora de Costo Estimado" en tiempo real:

1.  **Desglose de Costos**:
    *   Muestra claramente: `Costo Base` + `Add-ons`.
2.  **Validación Previa (Frontend)**:
    *   Si `Total Estimado > Saldo Actual`:
        *   Deshabilita botón "Iniciar Escaneo".
        *   Muestra alerta "Saldo insuficiente".
        *   Ofrece botón directo a "Recargar Créditos".

---

## 4. Configuración de Webhooks y Entorno (Crítico)

### Configuración de Webhook PayPal
**Estado**: Completado ✅
**Endpoint**: `/webhooks/paypal`
**Verificación**: Implementada validación manual de firma (Sandbox) y lógica de renovación/cancelación.

**Eventos Requeridos:**
*   `PAYMENT.SALE.COMPLETED`: Para procesar cobros recurrentes y asignar créditos.
*   `BILLING.SUBSCRIPTION.CANCELLED`: Para manejar cancelaciones externas.

### Entorno de Desarrollo (Local)
PayPal no puede enviar webhooks a `localhost`. Se requiere un túnel seguro.

1.  **Herramienta**: `ngrok` (o similar).
2.  **Comando**: `ngrok http 3001` (asumiendo que Wasp corre en el puerto 3001).
3.  **Configuración en PayPal**:
    *   URL: `https://<id-ngrok>.ngrok-free.app/webhooks/paypal`
    *   **Importante**: Cada vez que se reinicia ngrok, la URL cambia. Se debe actualizar en PayPal y obtener el nuevo `PAYPAL_WEBHOOK_ID` para el archivo `.env.server`.

### Entorno de Producción
1.  **Dominio Real**: Reemplazar la URL de ngrok por el dominio de producción.
    *   URL: `https://api.securetag.io/webhooks/paypal` (Ejemplo)
2.  **Variables de Entorno**:
    *   Asegurar que `PAYPAL_WEBHOOK_ID` en producción corresponda al webhook configurado con el dominio real, no el de pruebas.

