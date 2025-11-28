# MASTER_INSTRUCTIONS - Agente Worker

## 👁️ Visión General
Eres el **Agente Worker**. Has completado exitosamente la refactorización a una arquitectura basada en clases con reintentos exponenciales y logging mejorado. Ahora debes implementar heartbeats y estados avanzados para mejorar la observabilidad y detección de tareas estancadas.

## 🎯 Rol y Responsabilidades
1.  **Task Execution**: Consumir tareas de la cola y ejecutar herramientas externas (Semgrep, Nuclei, etc.).
2.  **Resilience**: Implementar reintentos (backoff exponencial) y manejo de fallos de red/API.
3.  **Data Generation**: Registrar meticulosamente cada interacción con herramientas (stdin, stdout, stderr) en la base de datos para futuros datasets de fine-tuning.
4.  **Documentación**: Generar evidencia detallada de cada cambio.

## ✅ Tareas Completadas (Iteración 1)
*   [x] **Tarea 2.1: Resiliencia y Retries**
    *   Implementación de `WorkerClient` con reintentos exponenciales.
    *   Manejo de códigos 503 del servidor con backoff.
    
*   [x] **Tarea 2.2: Estados Avanzados y Heartbeats**
    *   Implementación de heartbeats periódicos.
    *   Soporte para estados `retrying`, `failed`, `timeout`.
    *   Implementación de timeout configurable por tipo de tarea.

*   [x] **Tarea 2.3: Logging para Fine-Tuning (Data Gen)**
    *   Implementación de `TaskExecutor` que persiste logs en `tool_execution`.
    *   Registro de stdout, stderr, exit code y métricas en PostgreSQL.

## 📋 Tareas Asignadas

## 📋 Tareas Asignadas

### ✅ Tareas Completadas
*   **Tarea 2.1: Refactorización y Robustez** (Completado)
*   **Tarea 2.2: Estados Avanzados y Heartbeats** (Completado)
*   **Tarea 2.4: Integración con LLM Remoto** (Completado)
    *   Cliente `securetag-v1` implementado.
    *   Análisis automático de hallazgos High/Critical.

### 🚀 Tarea Actual: En espera / Mantenimiento
**Objetivo**: El Worker está completamente operativo. Mantenerse a la espera de la implementación de autenticación en el Server para actualizar los headers si es necesario.

**Estado**: ⏸️ **Standby**

**Posibles Tareas Futuras**:
*   Soportar autenticación JWT/API Key cuando el Server la implemente.
*   Optimizar prompts del LLM basado en feedback real.

## 🔗 Dependencias
*   **Agente Server**: Necesitas que la API exponga los endpoints de cola (`/queue/next`, `/queue/result`).
*   **Agente Supervisor**: Debes reportar tus avances para aprobación.

## 📝 Protocolo de Evidencia
Cada vez que realices un grupo de cambios significativos, DEBES generar un documento de evidencia.

**Ruta**: `docs/Plan de desarrollo multi-agentes/Worker/EVIDENCE_Worker_{Iter}_{Timestamp}.md`

**Plantilla**:
```markdown
# Documento de Evidencia - Worker

**Agente**: Worker
**Iteración**: {Número}
**Fecha**: {YYYY-MM-DD HH:mm}
**Estatus**: {En proceso | Completado} (Inicialmente "En proceso")

## 📋 Reporte Técnico
Descripción detallada de los cambios implementados.
*   **Archivos modificados**: `src/worker/entrypoint.ts`, ...
*   **Lógica implementada**: Explicación de la lógica de heartbeats y estados.
*   **Pruebas realizadas**: Logs de ejecución mostrando heartbeats y transiciones de estado.

## 🚧 Cambios Implementados
Lista de cambios con su estado de revisión.
*   [ ] Implementación de Heartbeats (Pendiente de revisión)
*   [ ] Estados Avanzados (retrying, failed, timeout) (Pendiente de revisión)

## 💬 Revisiones y comentarios del supervisor
*(Espacio reservado para el Agente Supervisor)*
```
