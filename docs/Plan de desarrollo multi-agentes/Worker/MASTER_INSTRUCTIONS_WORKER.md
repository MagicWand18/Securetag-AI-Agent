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
*   [x] **Tarea 2.4: Integración con LLM Remoto**
    *   Cliente `securetag-v1` implementado.
    *   Análisis automático de hallazgos High/Critical.

*   [x] **Tarea 8.1: Motor SAST Propio (Semgrep OSS)**
    *   Implementación completada externamente y verificada.
    *   El worker ya opera con reglas locales y sin dependencia de nube.

## 📋 Tareas Asignadas

### ✅ Tareas Completadas
*   **Tarea 2.1: Refactorización y Robustez** (Completado)
*   **Tarea 2.2: Estados Avanzados y Heartbeats** (Completado)
*   **Tarea 2.4: Integración con LLM Remoto** (Completado)
*   **Tarea 8.1: Motor SAST Propio** (Completado Externamente)
*   **Tarea 10.1: Contexto Seguro para LLM** (Completado - Worker/Logic)
*   **Tarea 12.1: Progress Tracking (Logic)** (Completado - Cálculo Dinámico & ETA)
*   **Tarea 12.2**: AI Double-Check (Multi-Provider Logic) (Completado - Providers, Fallback & Deep Context)
*   **Tarea 12.3**: Custom Rules Engine (Completado - On-Demand & Automated Research Pipeline)



### 🚀 Tarea Actual: Enterprise Features (Monetización)

**Tarea 12.4: Deep Code Vision Monetization** [ ]
*   **Plan Detallado**: `docs/Plan de desarrollo multi-agentes/Worker/Deep_Code_Vision_Monetization_Plan.md`
*   **Objetivo**: Restringir el contexto extendido (50 líneas) a usuarios Premium.
*   **Acciones**:
    *   **Logic**: Validar `plan` del tenant en `ContextExtractor`.
    *   **Free/Standard**: Solo entregar snippet básico (1-3 líneas).
    *   **Premium**: Entregar contexto completo (50 líneas).
    *   **Integration**: Asegurar que esto aplique tanto para análisis local como para AI Double Check.

**Estado**: 🟢 **Activo**.

### 🔮 Próximos Pasos (Fase 12)
*   **Tarea 12.4: Deep Code Vision Monetization** [ ]

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
