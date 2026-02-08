# Plan de Análisis y Gestión de API Keys (PLAN_8)

## 1. Situación Actual
Actualmente, el sistema depende de una única `securetagApiKey` almacenada en el modelo `User`.
*   **Problema UX**: El usuario debe generar/ingresar esta llave manualmente para que funcione el dashboard web.
*   **Problema Seguridad**: La misma llave se usa para el Frontend (Web) y para integraciones externas (CI/CD). Si se compromete una, se compromete todo.
*   **Limitación**: No hay soporte para múltiples llaves ni rotación sin interrupción.

## 2. Análisis de Viabilidad de Propuestas

### Propuesta 1: Llave Default Oculta
*   **Concepto**: Generar automáticamente una llave para el usuario y usarla "por debajo" en el frontend.
*   **Pros**: Mantiene la arquitectura actual del Core (que espera `X-API-Key`).
*   **Contras**:
    *   "Basura" en la base de datos (llaves que el usuario no gestiona).
    *   Complejidad en el ciclo de vida (¿qué pasa si expira?).
    *   No resuelve el problema de fondo: la identidad web ya está validada por la sesión.

### Propuesta 2: Eliminar Dependencia en Frontend (Recomendada e Implementada)
*   **Concepto**: El Frontend (Web) no debe necesitar una API Key. La autenticación de sesión (Cookie/JWT) en el servidor Wasp es suficiente confianza. El Servidor Wasp se comunica con el Core usando el "Secreto del Sistema".
*   **Mecanismo Técnico**:
    *   El usuario se loguea en la Web -> Wasp valida sesión.
    *   Wasp llama al Core usando `X-SecureTag-System-Secret` + `X-SecureTag-User-Id`.
    *   El Core confía en Wasp (System) y ejecuta la acción en nombre del usuario.
*   **Pros**:
    *   **UX Superior**: El usuario se registra y empieza a usar la herramienta inmediatamente ("Zero Configuration").
    *   **Seguridad**: Separación de preocupaciones. La sesión web es temporal; las API Keys son para máquinas.
    *   **Arquitectura Limpia**: Alineado con patrones SaaS modernos.
*   **Estado**: ✅ Implementado en `sast.ts` y `tenant.ts`.

## 3. Plan de Acción (Enfoque Híbrido)

Adoptaremos un **Enfoque Híbrido**:
1.  **Para la Web (Humanos)**: Implementar la Propuesta 2. Refactorizar `sast.ts` para usar `createSystemClient`. El dashboard funcionará sin que el usuario configure nada. (✅ Completado)
2.  **Para Integraciones (Máquinas)**: Mantener la funcionalidad de "Gestión de API Keys" en la configuración, pero exclusivamente para uso externo (CI/CD, CLI). (✅ Completado)

### Paso 1: Refactorización del Backend (Prioridad Inmediata)
*   Modificar `src/server/actions/sast.ts`.
*   Reemplazar `createSecuretagClient(apiKey)` por `createSystemClient(user.securetagUserId)`.
*   Eliminar chequeos de `if (!apiKey)`.
*   **Estado**: ✅ Completado.

### Paso 2: Modelo de Datos (Para Integraciones)
*   Crear modelo `ApiKey` (1:N) para usuarios que necesiten integrar CI/CD.
    ```prisma
    model ApiKey {
      id        String   @id @default(uuid())
      key       String   @unique // Almacena el HASH de la llave
      label     String
      lastUsed  DateTime?
      createdAt DateTime @default(now())
      user      User     @relation(...)
    }
    ```
*   **Estado**: ✅ Completado (Schema actualizado y migrado).

### Paso 3: Interfaz de Gestión
*   Actualizar `AccountPage.tsx`.
*   Eliminar el input único actual.
*   Agregar sección "Integrations / API Keys" donde el usuario puede generar llaves para sus pipelines.
*   **Estado**: ✅ Completado.

### Paso 4: Hardening de Seguridad
*   Modificar `createApiKey` en `apiKeys.ts` para que solo almacene el hash de la llave en la base de datos local (`opensaas-db`).
*   Asegurar que la llave plana solo se muestre una vez al usuario.
*   **Estado**: ✅ Completado.

## 4. Conclusión
La arquitectura ha sido migrada exitosamente al modelo de "System Secret" para la Web y "API Keys Hash-Only" para integraciones.

## 5. Pendientes y Siguientes Pasos
*   [x] **Migración DB (App)**: Ejecutar migraciones de Wasp y Prisma en `opensaas-db` (✅ Completado).
*   [x] **Migración DB (Core)**: Verificar columnas `label` y `last_used_ip` en `securetag.api_key` (✅ Completado).
*   [ ] **Validación End-to-End**: Probar el flujo completo de escaneo usando una API Key generada desde la nueva interfaz contra el endpoint de upload (`/codeaudit/upload`).
*   [ ] **Limpieza**: Eliminar el campo `securetagApiKey` (deprecated) del modelo `User` en una futura migración para evitar deuda técnica.
