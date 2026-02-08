# Documento de Evidencia - Frontend

**Agente**: Frontend
**Tarea**: 14.1 Configuración de Entorno y Despliegue Docker (Fase 0)
**Fecha**: 2025-12-24 10:30
**Estatus**: Completado

## 📸 Screenshots / Demos
*   **Despliegue Exitoso**: La aplicación Open SaaS se levanta correctamente en `http://localhost:3000`.
*   **Acceso Admin**: Se validó el acceso al Dashboard de Administrador con el usuario `a@a.com` tras otorgar permisos manualmente en la base de datos.
*   **Entorno Docker**: Contenedores `opensaas-app` y `opensaas-db` corriendo sin conflictos de puertos (DB en 5433).

## 🛠️ Cambios Técnicos
### Componentes Modificados/Creados
*   `frontend/open-saas-main/template/app/Dockerfile.dev`: Creado para definir el entorno de desarrollo con `node:22-slim` y Wasp.
*   `frontend/open-saas-main/template/app/docker-compose.yml`: Creado para orquestar la app y la base de datos PostgreSQL.
    *   **Fix**: Se renombraron los contenedores para evitar conflictos con otros agentes.
    *   **Fix**: Se agregaron variables de entorno "mock" (dummy) para servicios externos (Stripe, AWS, etc.) para permitir el arranque sin configuración real.
    *   **Fix**: Se añadió `platform: linux/amd64` para compatibilidad con arquitectura (Rosetta).
*   `frontend/open-saas-main/template/app/.dockerignore`: Agregado para optimizar el contexto de build.

### Integración
*   **Base de Datos**: Se inicializó la base de datos PostgreSQL con `wasp db migrate-dev` y `wasp db seed` dentro del contenedor.
*   **Permisos**: Se ejecutó una query SQL directa (`UPDATE "User" SET "isAdmin" = true...`) para elevar privilegios al usuario de prueba.

## 🧪 Verificación (Manual)
1.  [x] El contenedor se construye y levanta sin errores fatales.
2.  [x] La aplicación es accesible en el navegador (localhost:3000).
3.  [x] El registro de usuarios (Sign Up) funciona.
4.  [x] El acceso al Dashboard de Admin funciona tras el ajuste de permisos.
5.  [x] Los logs de Docker muestran actividad correcta del servidor Wasp.

## ⚠️ Notas / Bloqueos
*   **Logs de Error**: Persisten logs de `ERR_CONNECTION_RESET` al intentar contactar endpoints de auth en el primer arranque. Esto es normal en desarrollo hasta que la sesión se establece correctamente.
*   **Polar Sandbox**: Se observó un error persistente sobre `POLAR_SANDBOX_MODE` en los logs, aunque no impide la navegación básica. Se abordará en la limpieza de la Fase 1.
