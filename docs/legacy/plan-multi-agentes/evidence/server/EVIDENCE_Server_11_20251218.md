# Documento de Evidencia - Server

**Agente**: Server
**Iteración**: 12.4 (Research Scheduler)
**Fecha**: 2025-12-18
**Estatus**: Completado

## 📋 Reporte Técnico
Se ha implementado el mecanismo de programación (Scheduling) para el "Automated Research Pipeline". Esto permite que el sistema de investigación de amenazas opere de manera totalmente autónoma, disparándose periódicamente sin intervención humana.

*   **Archivos modificados**:
    *   `src/server/index.ts`: Lógica del scheduler y endpoint interno.
    *   `src/worker/TaskExecutor.ts`: Integración del pipeline en el ejecutor de tareas.
    *   `.env`: Variables de configuración.
    *   `docker-compose.yml`: Inyección de variables al contenedor.

*   **Lógica implementada**:
    1.  **Endpoint Interno**: Se creó `POST /internal/scheduler/trigger-research`.
        *   Este endpoint inserta una tarea de tipo `research` en la cola de PostgreSQL (`securetag.task`).
        *   Utiliza `INSERT INTO securetag.task` con `tenant_id='admin'` y `type='research'`.
    2.  **Scheduler Interno (Node.js)**:
        *   Se añadió la función `startInternalScheduler()` que utiliza `setInterval`.
        *   **Frecuencia Configurable**: Por defecto es semanal (7 días), controlada por `RESEARCH_INTERVAL_MS`.
        *   **Ejecución al Inicio**: Opción `RESEARCH_RUN_ON_BOOT=true` para ejecutar inmediatamente al arrancar (útil para pruebas/dev).
        *   **Control Maestro**: `ENABLE_RESEARCH_SCHEDULER=true` para activar/desactivar.
    3.  **Variables de Entorno**:
        *   `ENABLE_RESEARCH_SCHEDULER`: Habilita el cron interno.
        *   `RESEARCH_INTERVAL_MS`: Intervalo en milisegundos (default: 604800000 = 7 días).
        *   `RESEARCH_RUN_ON_BOOT`: Ejecuta la tarea al iniciar el contenedor.

*   **Pruebas de Verificación**:
    *   Se validó la inserción en base de datos.
    *   Se configuró el entorno para permitir pruebas de emulación de tiempo mediante `RESEARCH_INTERVAL_MS` reducido.

## 🚧 Cambios Implementados
*   [x] Endpoint `POST /internal/scheduler/trigger-research`.
*   [x] Lógica de `setInterval` con intervalo configurable.
*   [x] Integración en `TaskExecutor.ts` para procesar tareas `research`.
*   [x] Configuración en `.env` y `docker-compose.yml`.

## 💬 Revisiones y comentarios del supervisor
La implementación cierra el ciclo de automatización. El scheduler ahora es flexible, permitiendo ejecución semanal en producción y ciclos rápidos en desarrollo/pruebas. El sistema es capaz de auto-generar inteligencia de amenazas periódicamente.
