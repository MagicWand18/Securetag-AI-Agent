# Plan de Arquitectura: Sistema Multi-Tenant y Federación de Identidad
**Fecha:** 26 de Diciembre, 2025
**Estado:** ✅ Completado
**Objetivo:** Implementar gestión de organizaciones centralizada en `securetag-db` consumida por el Frontend vía API.

---

## 1. Estrategia: "Identity Linking" (Frontend como Ventana)

En lugar de duplicar la lógica de organizaciones en la base de datos del Frontend (`opensaas-db`), el Frontend actuará como un cliente privilegiado que consulta y gestiona la "Verdad" almacenada en el Backend (`securetag-db`).

### Principios
1.  **Single Source of Truth**: La tabla `securetag.tenant` y `securetag.app_user` en Postgres son la autoridad.
2.  **Identity Linking**: El usuario en Wasp (`opensaas-db`) solo guarda referencias (`ids`) para mapear su sesión local con su identidad en el Backend.
3.  **API Driven UI**: La página de "Configuración de Organización" en el frontend no consulta su propia BD, sino que hace fetch a la API REST de SecureTag.

---

## 2. Fase 1: Backend Core (API REST)
**Estado:** ✅ Completado
**Ubicación**: `src/server/index.ts`, `src/server/routes/tenant.ts`, `src/server/routes/auth-sync.ts`

El backend expone endpoints para que el Frontend (actuando como administrador) pueda gestionar el tenant.

### 2.1 Nuevos Endpoints Implementados
| Método | Endpoint | Descripción | Scope Requerido |
|---|---|---|---|
| `GET` | `/api/v1/tenant/me` | Obtener info del Tenant actual (Nombre, Créditos, Plan). | `tenant:read` |
| `GET` | `/api/v1/tenant/users` | Listar usuarios asociados al Tenant. | `tenant:read` |
| `POST` | `/api/v1/tenant/invite` | Invitar/Crear un usuario en el Tenant. | `tenant:write` |
| `DELETE`| `/api/v1/tenant/users/:id` | Desvincular un usuario del Tenant. | `tenant:write` |
| `PUT` | `/api/v1/tenant/users/:id/role`| Cambiar rol (Admin/Member). | `tenant:write` |
| `POST` | `/api/v1/auth/sync` | Sincronizar usuario Wasp -> SecureTag Core. | `system:write` |

### 2.2 Tareas Técnicas Completadas
- [x] Definir rutas en `src/server/index.ts`.
- [x] Implementar controladores que interactúen con `securetag.app_user` y `securetag.tenant`.
- [x] Actualizar documentación OpenAPI.
- [x] Asegurar que el Middleware de Auth inyecte el `tenant_id` correcto en el contexto.
- [x] Implementar endpoint de sincronización de identidad (`auth-sync.ts`).

---

## 3. Fase 2: Modelo de Datos Frontend (Wasp)
**Ubicación**: `frontend/open-saas-main/template/app/schema.prisma`
**Estado:** ✅ Completado

Necesitamos que el usuario de Wasp sepa "quién es" en el mundo de SecureTag.

### 3.1 Schema Update
Se modificó la entidad `User` en Prisma para incluir `securetagTenantId`, `securetagUserId` y `securetagRole`.

### 3.2 Migración
Se aplicaron las migraciones correspondientes en el entorno Dockerizado.

---

## 4. Fase 3: Sincronización de Identidad (Auth Hooks)
**Ubicación**: `src/auth/hooks.ts` (Wasp)
**Estado:** ✅ Completado

Cuando un usuario se registra o loguea en el Frontend, debemos garantizar que existe en el Backend.

### 4.1 Flujo de Registro (Sign Up)
1.  Usuario se registra en Wasp.
2.  **Hook `onAfterSignup`** llama a `POST /api/v1/auth/sync`.
3.  Backend vincula el email a un Tenant existente (si fue invitado) o crea uno nuevo.
4.  Frontend actualiza el usuario local con los IDs retornados.

---

## 5. Fase 4: UI de Gestión de Organización
**Ubicación**: `src/client/app/OrganizationPage.tsx`
**Estado:** ✅ Completado

La página de configuración ahora es completamente funcional y opera directamente contra la API del Backend.

### 5.1 Componentes Funcionando
- **Info del Tenant**: Muestra nombre, plan y créditos reales.
- **Lista de Miembros**: Muestra usuarios reales del tenant.
- **Invitar Miembro**: Funcionalidad completa de invitación validada.
- **Roles**: Visualización y edición de roles soportada.

---

## 6. Pruebas y Validación
**Estado:** ✅ Completado

Se han realizado pruebas exhaustivas:
1.  **Script Automatizado**: `scripts/validate_tenant_flow.sh` valida todos los endpoints del backend.
2.  **Pruebas Manuales**: Verificación visual de flujos de UI (invitación, listado, duplicados).

El sistema Multi-Tenant está operativo y listo para producción.
