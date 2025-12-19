# Plan de Implementación: User Identity Banning & Revocation (Task 10.6)

**Fecha**: 2025-12-18
**Responsable**: Agente Server
**Objetivo**: Implementar un sistema de baneo granular por usuario que incluya la revocación en cascada de sus credenciales (API Keys) activas.

---

## 📋 Resumen Ejecutivo
Este plan detalla los pasos para permitir que los administradores bloqueen el acceso a usuarios específicos. El sistema no solo debe impedir el acceso futuro, sino cortar inmediatamente cualquier sesión activa revocando las API Keys asociadas y almacenando el bloqueo en memoria para una latencia cero.

## 🏗️ Arquitectura de la Solución

### 1. Componente de Seguridad (`src/server/security.ts`)
*   **Estado actual**: Maneja bloqueos por IP, API Key Hash y Tenant ID.
*   **Cambio**: 
    *   Agregar `bannedUsers: Set<string>` al caché en memoria.
    *   Sincronizar `type = 'user'` desde la tabla `security_ban`.
    *   Actualizar firma `isBanned(ip, apiKeyHash, tenantId, userId)`.

### 2. Middleware de Autenticación (`src/middleware/auth.ts`)
*   **Estado actual**: Valida API Key y cheque bans de IP/Key/Tenant.
*   **Cambio**: 
    *   Recuperar `user_id` en la consulta de validación de API Key.
    *   Pasar `user_id` a la función `isBanned`.
    *   Rechazar con `403 Forbidden` si el usuario está baneado.

### 3. API de Administración (`src/server/index.ts`)
*   **Nuevos Endpoints**:
    *   `POST /admin/users/:userId/ban`: Ejecuta el bloqueo y la revocación.
    *   `POST /admin/users/:userId/unban`: Restaura el acceso del usuario (las keys revocadas permanecen revocadas por seguridad).

### 4. Lógica de Revocación en Cascada (Cascading Revocation)
Al banear un usuario, el sistema ejecutará atómicamente:
1.  **Persistencia del Ban**: Insertar en `security_ban` (User).
2.  **Identificación de Credenciales**: Buscar todas las API Keys donde `user_id = :userId`.
3.  **Invalidación DB**: `UPDATE api_key SET is_active = false`.
4.  **Invalidación Memoria**: Insertar hashes de keys en `security_ban` (`type='api_key'`) para efecto inmediato.

---

## 📅 Fases de Ejecución

### ✅ Fase 1: Core Logic (Security Module)
- [ ] Modificar `src/server/security.ts` para soportar `userId`.
- [ ] Actualizar `syncBans` y `cleanupStore`.

### ✅ Fase 2: Auth Middleware Integration
- [ ] Modificar query SQL en `src/middleware/auth.ts`.
- [ ] Integrar chequeo de `isBanned` con `userId`.

### ✅ Fase 3: Admin API & Cascading Logic
- [ ] Implementar rutas `/admin/users/...`.
- [ ] Implementar función `banUserCascade` que orqueste DB y Memoria.

### ✅ Fase 4: Verificación
- [ ] Crear script `tests/manual_ban_test.sh`.
- [ ] Ejecutar prueba de concepto (Crear usuario -> Loguear -> Banear -> Fallar).

---

## 🛡️ Consideraciones de Seguridad
*   **Fail-Closed**: Si la DB falla al consultar el estado del usuario, el sistema debe denegar el acceso por defecto o manejar el error gracefuly (actualmente 500).
*   **Performance**: Los chequeos de baneo se hacen contra sets en memoria (O(1)), evitando latencia en cada request. La sincronización ocurre en background.
*   **Auditabilidad**: Todas las acciones de baneo quedan registradas en `security_ban` con timestamps.
