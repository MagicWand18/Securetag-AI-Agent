# Documento de Evidencia - Server

**Agente**: Server
**Iteración**: 6
**Fecha**: 2025-12-19
**Estatus**: Completado

## 📋 Reporte Técnico
Se ha implementado el sistema de baneo granular por usuario y revocación en cascada (Task 10.6).

### 🛡️ Funcionalidades Implementadas
1.  **Baneo de Usuario**: Capacidad de bloquear un usuario específico (`app_user`), impidiendo el acceso futuro independientemente de la IP o API Key que utilice.
2.  **Revocación en Cascada (Kill Switch)**:
    *   Al banear un usuario, el sistema busca automáticamente todas sus API Keys activas.
    *   Se **revocan** permanentemente en la base de datos (`is_active = false`).
    *   Se **banean** instantáneamente en memoria (`security_ban`), cortando cualquier sesión activa sin latencia.
3.  **Endpoint de Administración**:
    *   `POST /admin/users/:userId/ban`: Ejecuta el bloqueo y la revocación.
    *   `POST /admin/users/:userId/unban`: Restaura el acceso del usuario (nota: las keys revocadas permanecen inválidas por seguridad; el usuario debe generar nuevas).
4.  **Middleware Reforzado**:
    *   Ahora verifica `is_active` en cada petición.
    *   Ahora consulta `user_id` y `role` para aplicar políticas RBAC y de baneo.
    *   **Orden de Validación Optimizado ("Fail Fast")**:
        1.  **IP Address** (Costo: 🟢 Muy Bajo): Filtro de infraestructura para detener bots/DDoS en la puerta.
        2.  **API Key** (Costo: 🟢 Bajo): Validación de credenciales técnicas.
        3.  **Tenant** (Costo: 🟡 Medio): Bloqueo de cuentas corporativas.
        4.  **Usuario** (Costo: 🔴 Alto): Validación de identidad de negocio (requiere DB Lookup).
        *Justificación*: Este embudo protege los recursos más costosos (DB) filtrando ataques volumétricos en las capas más baratas (Memoria).

### 🛠️ Archivos Modificados
*   `src/server/security.ts`: Añadido soporte para `bannedUsers` Set y lógica de sincronización.
*   `src/middleware/auth.ts`: 
    *   Actualizada consulta SQL para JOIN con `app_user`.
    *   Añadida validación estricta `apiKeyRecord.is_active === false`.
    *   Integración con `isBanned(..., userId)`.
*   `src/server/index.ts`: Implementación de rutas `/admin/users/...`.

### 🧪 Pruebas Realizadas (`tests/manual_ban_test.sh`)
Se ejecutó un escenario completo de prueba:
1.  **Setup**: Creación de usuario "Victim" y usuario "Admin" con API Keys válidas.
2.  **Acceso Inicial**: Confirmado acceso `200 OK` del usuario Victim.
3.  **Ejecución de Ban**: Admin invoca `/admin/users/:id/ban`.
    *   Respuesta: `{"ok":true,"message":"User ... banned. Revoked 1 API keys."}`
4.  **Verificación de Bloqueo**:
    *   Acceso subsiguiente del Victim: `403 Forbidden` (`Access denied. API Key has been revoked.`).
5.  **Verificación de Estado DB**:
    *   `security_ban`: Registro presente para User ID y API Key Hash.
    *   `api_key`: Registro marcado con `is_active = false`.

**Resultado**: ✅ Éxito rotundo. El sistema responde correctamente bloqueando el acceso de forma inmediata.

## 🚧 Cambios Implementados
*   [x] Lógica Core en `security.ts`
*   [x] Middleware Auth con chequeo de `is_active` y `userId`
*   [x] API Admin para Ban/Unban
*   [x] Script de prueba automatizado

## 💬 Revisiones y comentarios del supervisor
*(Espacio reservado para el Agente Supervisor)*
