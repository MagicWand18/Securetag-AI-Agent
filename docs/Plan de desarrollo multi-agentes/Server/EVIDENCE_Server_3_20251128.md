# Documento de Evidencia - Server

**Agente**: Server
**Iteración**: 3
**Fecha**: 2025-11-28 16:55
**Estatus**: Completado

## 📋 Reporte Técnico
Se implementó autenticación mediante API keys y aislamiento multi-tenant para asegurar la API y preparar el sistema para múltiples clientes. Cada tenant ahora tiene acceso exclusivo a sus propios datos.

*   **Archivos modificados**:
    *   `migrations/003_auth_multitenancy.sql`: Migración para crear tabla `api_key`.
    *   `src/middleware/auth.ts`: Middleware de autenticación que valida `X-API-Key` header.
    *   `src/server/index.ts`: Aplicación de middleware a todos los endpoints protegidos y uso de `tenantId` autenticado.

*   **Lógica implementada**:
    *   **Antes**: 
        - No había autenticación, cualquiera podía acceder a los endpoints.
        - Se usaba `process.env.TENANT_ID` para determinar el tenant.
        - No había aislamiento entre tenants.
    
    *   **Después**: 
        - Todos los endpoints (excepto `/healthz` y `/healthz/db`) requieren `X-API-Key` header válido.
        - El middleware valida la API key contra la tabla `securetag.api_key`.
        - Se verifica expiración de keys y se actualiza `last_used_at`.
        - El `tenantId` se obtiene de la autenticación, no de variables de entorno.
        - Todas las consultas filtran por `tenant_id` del usuario autenticado.
        - Tenant A no puede acceder a datos de Tenant B (aislamiento completo).

*   **Pruebas realizadas**:
    ```bash
    # Test 1: Sin API key - Rechazado con 401
    curl -X POST http://localhost:8081/scans/web \
      -H "Content-Type: application/json" \
      -d '{"url":"http://example.com"}'
    # Resultado: 401 - Missing X-API-Key header
    
    # Test 2: API key inválida - Rechazado con 401
    curl -X POST http://localhost:8081/scans/web \
      -H "Content-Type: application/json" \
      -H "X-API-Key: invalid-key" \
      -d '{"url":"http://example.com"}'
    # Resultado: 401 - Invalid API key
    
    # Test 3: API key válida - Aceptado
    curl -X POST http://localhost:8081/scans/web \
      -H "Content-Type: application/json" \
      -H "X-API-Key: test-key-tenant-a" \
      -d '{"url":"http://example.com"}'
    # Resultado: 202 - Task creada
    
    # Test 4: Aislamiento de tenants
    # Tenant A no puede ver tareas de Tenant B
    curl http://localhost:8081/scans/{tenant-b-task-id} \
      -H "X-API-Key: test-key-tenant-a"
    # Resultado: 404 - Not found (aislamiento funcionando)
    ```

## 🚧 Cambios Implementados
*   [x] Creación de tabla `api_key` (Completado)
*   [x] Middleware de autenticación (Completado)
*   [x] Protección de endpoints (Completado)
*   [x] Aislamiento por tenant_id (Completado)
*   [x] Tests de integración (Completado)

## 🔐 API Keys de Prueba
Para testing, se crearon las siguientes API keys:

**Tenant A** (`tenant-a`):
- `test-key-tenant-a`
- `test-key-tenant-a-2`

**Tenant B** (`tenant-b`):
- `test-key-tenant-b`

## 💬 Revisiones y comentarios del supervisor
*   **Veredicto**: ✅ **Aprobado**
*   **Comentarios**:
    *   [x] **Migración de BD**: Tabla `api_key` creada correctamente con índices apropiados.
    *   [x] **Middleware de Autenticación**: Implementación sólida con validación de hash SHA-256, verificación de expiración y actualización de `last_used_at`.
    *   [x] **Integración en Server**: Todos los endpoints protegidos correctamente (excepto `/healthz` y `/healthz/db`).
    *   [x] **Aislamiento por Tenant**: El `tenantId` se obtiene de la autenticación, no de variables de entorno. Excelente mejora de seguridad.
    *   [x] **Verificación de BD**: Confirmado que tabla `api_key` existe y contiene 3 API keys para 2 tenants diferentes.
    *   [x] **Código Revisado**: 
        *   `src/middleware/auth.ts`: Lógica clara y segura
        *   `src/server/index.ts`: Autenticación aplicada en 5 endpoints protegidos
        *   `migrations/003_auth_multitenancy.sql`: Esquema correcto con foreign keys
    *   [x] **Siguiente Paso**: El Server ha completado todas sus tareas críticas. Pasa a modo de mantenimiento mientras Infra prepara CI/CD.
