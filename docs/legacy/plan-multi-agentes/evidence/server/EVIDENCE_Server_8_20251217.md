# Documento de Evidencia - Server

**Agente**: Server
**Iteración**: 8 (Progress Tracking)
**Fecha**: 2025-12-17
**Estatus**: Completado

## 📋 Reporte Técnico
Se ha implementado el sistema de seguimiento de progreso para las tareas de auditoría ("Progress Tracking"). Esto permite al worker reportar el avance en tiempo real y al cliente visualizarlo.

*   **Archivos modificados**:
    *   `migrations/013_add_progress_tracking.sql`: Nueva migración para agregar columnas `progress_percent` y `eta_seconds` a la tabla `task`.
    *   `migrations/changelog-master.xml`: Registro de la nueva migración.
    *   `src/server/index.ts`: Implementación del endpoint interno `POST /internal/tasks/:id/progress`.
    *   `src/server/routes/codeaudit.ts`: Actualización de la respuesta de `GET /codeaudit/:id` para incluir los nuevos campos.

*   **Lógica implementada**:
    1.  **Base de Datos**: Se extendió el esquema para almacenar el estado numérico del progreso (0-100) y el tiempo estimado restante (segundos).
    2.  **API Interna**: El endpoint `/internal/tasks/:id/progress` permite al worker actualizar estos valores de forma segura (requiere autenticación).
    3.  **API Pública**: Al consultar el detalle de una tarea (`/codeaudit/:taskId`), ahora se reciben `progress` (ej: "45%") y `eta` (ej: "120s"), permitiendo al frontend mostrar una barra de carga real en lugar de un spinner indeterminado.
    4.  **Formato User-Friendly**: Los campos se devuelven pre-formateados con unidades (`%`, `s`) para facilitar su integración directa en interfaces de usuario.

## 🚧 Cambios Implementados
*   [x] Migración SQL `013_add_progress_tracking.sql`.
*   [x] Endpoint interno `POST /internal/tasks/:id/progress`.
*   [x] Exposición de datos en `GET /codeaudit/:id`.

## 🧪 Verificación
*   **Revisión de Código**: Se verificó que el endpoint interno valida la autenticación y los tipos de datos (0-100 para porcentaje).
*   **Integración**: La migración está lista para ser aplicada automáticamente por Liquibase al levantar el contenedor.

## 💬 Notas Adicionales
El worker deberá ser actualizado posteriormente para llamar a este nuevo endpoint durante su ejecución.
