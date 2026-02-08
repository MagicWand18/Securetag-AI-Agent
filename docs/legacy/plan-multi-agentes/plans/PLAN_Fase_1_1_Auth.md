# Plan de Implementación - Fase 1.1: Seguridad y Gestión de Identidad (Auth)

**Estado**: ✅ Completado y Validado
**Fecha**: 2026-01-02
**Responsable**: Agente FullStack

## 🎯 Objetivo
Garantizar la consistencia absoluta entre la identidad del usuario en el Frontend (`opensaas-db`) y su tenencia en el Core Backend (`securetag-db`). Resolver el problema de "Persistencia Fantasma" donde fallos en la creación del tenant dejan usuarios corruptos en el sistema.

---

## 📋 Tareas de Implementación (Estado: ✅ Completado)

### 1. Robustez en Sincronización (`onAfterSignup`)
**Archivo**: `src/auth/hooks.ts`
**Estado**: ✅ Implementado y Validado

Actualmente, si la llamada al Core falla, el usuario permanece creado en Wasp pero sin Tenant ID, dejándolo en un estado inválido e inutilizable.

*   **Lógica de Compensación (Rollback)**:
    *   Envolver la lógica de sincronización en un bloque `try/catch` robusto.
    *   Si la API del Core responde con error (4xx/5xx) o hay timeout:
        *   Ejecutar inmediatamente `prisma.user.delete({ where: { id: user.id } })`.
        *   Lanzar un `HttpError` con mensaje claro para el usuario ("Error de aprovisionamiento, por favor intente nuevamente").
    *   Esto asegura que la creación de cuenta sea "Todo o Nada".

### 2. Gestión de Ciclo de Vida: Eliminar Cuenta (`deleteAccount`)
**Archivos**: `src/user/operations.ts`, `main.wasp`, `src/server/routes/tenant.ts` (Core)
**Estado**: ✅ Implementado y Validado

Implementar la funcionalidad para que el usuario pueda eliminar su cuenta y todos sus datos asociados.

*   **Schema Update**:
    *   Añadir campo `deletedAt DateTime?` al modelo `User` en `schema.prisma`.
    *   Ejecutar migración: `wasp db migrate-dev name=add_deleted_at_to_user`.
*   **Action `deleteAccount` (Frontend)**:
    *   Verificar que el usuario esté autenticado.
    *   **Paso 1 (Core)**: Llamar a `DELETE /api/v1/tenants/{tenantId}` en el Backend Core.
        *   *Mejora*: Implementada tolerancia a 404 (Si el Core ya borró el tenant, el frontend procede sin error).
    *   **Paso 2 (Frontend)**:
        *   Hard Delete implementado (`prisma.user.delete()`).
*   **Endpoint `deleteTenant` (Backend Core)**:
    *   Implementado `DELETE /api/v1/tenants/:id` en `src/server/routes/tenant.ts`.
    *   Seguridad: Requiere `X-SecureTag-System-Secret` o ser el Owner del tenant.
*   **UI Integration**:
    *   Añadido botón "Danger Zone: Delete Account" en `AccountPage.tsx`.
    *   **Mejora de UX/Seguridad**: Implementado input de confirmación (requiere escribir el email del usuario) para habilitar el botón de borrado, previniendo acciones accidentales.

### 3. Validación de Unicidad Mejorada
**Archivo**: `src/auth/userSignupFields.ts`
**Estado**: ✅ Implementado y Validado

*   Mejorar el manejo de errores en el formulario de registro para capturar el error de Prisma `P2002` (Unique constraint) y mostrar "Este correo ya está registrado" en lugar de un error genérico.

---

## 🧪 Reporte de Pruebas (Validation Report)

Todas las pruebas han sido ejecutadas exitosamente en el entorno Docker local.

| ID | Prueba | Estado | Resultado Observado |
| :--- | :--- | :--- | :--- |
| **T-1.1.1** | **Rollback en Fallo de Sync** | ✅ **PASÓ** | Al detener `securetag-app`, el usuario es borrado inmediatamente de `opensaas-db` tras el fallo. |
| **T-1.1.2** | **Registro Exitoso (End-to-End)** | ✅ **PASÓ** | Usuario y Tenant creados correctamente y vinculados con `securetagTenantId`. |
| **T-1.1.3** | **Unicidad de Email** | ✅ **PASÓ** | Intento de registro duplicado bloqueado con mensaje de error apropiado. |
| **T-1.1.4** | **Borrado de Cuenta** | ✅ **PASÓ** | - Endpoint `DELETE` en Core funciona.<br>- Frontend maneja respuesta.<br>- Usuario eliminado de BD Local (`(0 rows)` verificado con psql). |

### Evidencia de Validación Técnica
Script de prueba automatizado `delete_test.sh` ejecutado con resultado: `{"success":true}`.
Verificación manual en BD: Usuario eliminado exitosamente.

---

## ⚠️ Consideraciones de Seguridad
*   La comunicación entre `opensaas-app` y `securetag-app` ocurre dentro de la red Docker (`securetag-net`), pero se debe validar que el `SECURETAG_SYSTEM_SECRET` esté configurado en variables de entorno para autorizar la creación/borrado de tenants privilegiados.
