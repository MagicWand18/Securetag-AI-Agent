# Documentación de Refactorización (sast.ts y apiKeys.ts)

## 1. Cambio de Paradigma: Autenticación de Sistema
Se ha modificado `sast.ts` para eliminar la dependencia de `user.securetagApiKey` en el contexto de la aplicación web. Ahora, todas las operaciones sensibles (`getProjects`, `createScan`, `getSastDashboard`, etc.) utilizan la identidad del sistema (`createSystemClient`) para actuar en nombre del usuario.

## 2. Gestión Segura de API Keys (Harden Security)
Se ha implementado un esquema de seguridad mejorado para las API Keys de integración (CI/CD):

*   **Generación**: La llave plana (`st_live_...`) se genera en memoria.
*   **Almacenamiento**:
    *   **Frontend DB (opensaas-db)**: Se almacena ÚNICAMENTE el hash SHA-256 de la llave en la columna `key`.
    *   **Backend DB (securetag-db)**: Se sincroniza y almacena ÚNICAMENTE el hash SHA-256.
*   **Visualización**: La llave plana se devuelve al usuario **una sola vez** en el momento de la creación. Si el usuario pierde la llave, debe regenerarla.
*   **Listado**: En la interfaz de usuario, se muestra el hash truncado (o los primeros caracteres del hash) como identificador, nunca la llave real.

## 3. Detalles Técnicos
*   **Antes**:
    *   Leía `context.user.securetagApiKey`.
    *   Si era null, retornaba error o estado vacío (`missingKey: true`).
    *   El cliente HTTP usaba `X-API-Key`.
    *   `apiKeys.ts` guardaba la llave plana en la base de datos del frontend.
*   **Ahora**:
    *   Verifica `context.user.securetagUserId` (el vínculo con el Core).
    *   El cliente HTTP usa `X-SecureTag-System-Secret` + `X-SecureTag-User-Id`.
    *   Se eliminó el concepto de `missingKey` en la respuesta del dashboard, ya que ahora siempre está "configurado" si el usuario existe.
    *   `apiKeys.ts` guarda el hash en la DB y solo devuelve la llave plana en el retorno de la función `createApiKey`.

## 4. Beneficios Inmediatos
*   **UX**: El usuario nuevo verá su dashboard activo inmediatamente después del registro, sin configurar nada.
*   **Robustez**: Se eliminan errores por llaves rotadas o expiradas en la sesión web.
*   **Seguridad**:
    *   La llave personal del usuario no viaja en las peticiones del servidor web al core.
    *   Si la base de datos del frontend es comprometida, los atacantes solo obtienen hashes inútiles, no las llaves reales de integración.

## 5. Próximos Pasos (Validación)
Es necesario validar que:
1.  El `SECURETAG_SYSTEM_SECRET` esté correctamente configurado en el entorno.
2.  El `securetagUserId` se esté asignando correctamente al crear el usuario (esto ya debería estar ocurriendo en el flujo de registro/webhook).
3.  La creación y eliminación de API Keys funcione correctamente con el nuevo flujo de hash.
