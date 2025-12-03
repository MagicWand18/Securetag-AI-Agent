# Plan de Implementación Multi-Agente para Securetag SaaS

Este documento define la ruta de trabajo para convertir Securetag Agent en un SaaS robusto, diseñado para ser ejecutado por múltiples agentes de IA en paralelo.

## 🚦 Guía de Ejecución y Estatus Actual

Para saber qué agente ejecutar, consulta esta tabla dinámica. El **Agente Supervisor** actualizará esta sección.

| Agente | Estatus Actual | ¿Puede Ejecutarse? | Dependencia |
| :--- | :--- | :--- | :--- |
| **Supervisor** | 🟢 **Activo** | ✅ **SI** | N/A |
| **Infra** | 🟢 **Activo** | ✅ **SI** | Deploy scripts listos. Siguiente: Integración DO+RunPod |
| **Server** | ✅ **Completado** | ⏸️ **Standby** | Auth implementado. Todas las tareas completadas |
| **Worker** | ✅ **Completado** | ⏸️ **Standby** | LLM integrado. Todas las tareas completadas |
| **Fine-tuning** | ✅ **Completado** | ⏸️ **Standby** | Modelo `securetag-v1` entrenado |

> **Estado Actual (Iteración 10 - 2025-12-01)**:
> - **Infra Agent**: ✅ CI/CD y Scripts de Despliegue (DO/RunPod) completados.
> - **Fine-tuning Agent**: ✅ Modelo `securetag-v1` (Llama 3.1 8B) entrenado y validado
> - **Worker Agent**: ✅ LLM Client integrado con análisis automático High/Critical
> - **Server Agent**: ✅ Autenticación y Multi-tenancy implementados

> **Recomendación**: Priorizar **Infra Agent** para conectar entornos de producción (DigitalOcean + RunPod).

## 🎯 Objetivo General
Transformar el agente de ciberseguridad (CLI) en una API SaaS multi-tenant, resiliente y escalable, con soporte para herramientas externas (Semgrep, etc.), ejecución en contenedores Docker, y generación de datasets para fine-tuning de LLMs.

## 🏗️ Arquitectura y Componentes
El sistema se compone de tres pilares principales que pueden evolucionar en paralelo:

1.  **API Server (App)**: Gestiona endpoints, autenticación, y orquestación de tareas (productor).
2.  **Worker**: Consume tareas, ejecuta herramientas (Semgrep, Nuclei, etc.) y reporta resultados (consumidor).
3.  **Base de Datos (PostgreSQL)**: Fuente única de verdad para tareas, resultados y logs.
4.  **LLM Service**: Modelo fine-tuned `securetag-v1` en Ollama para análisis de hallazgos.

## 🤖 Roles de Agentes y Paralelización
Para maximizar la eficiencia, el trabajo se divide en "Tracks" independientes que pueden ser asignados a diferentes agentes.

### 🟢 Track 1: Backend & API (Agente "Server")
**Objetivo**: Migrar la API a una arquitectura 100% Database-Centric y robustecer los endpoints.

*   **Tarea 1.1: Eliminación de Dependencia de Archivos (DB-Only)** [x]
    *   **Contexto**: Actualmente `src/server/index.ts` y `routes/codeaudit.ts` leen `tasks.json` si falla la BD o como fallback.
    *   **Acción**:
        *   Refactorizar `GET /scans/{id}` para leer **exclusivamente** de `securetag.task` y `securetag.scan_result`.
        *   Refactorizar `GET /codeaudit/index` y `latest` para usar `SELECT` SQL.
        *   Eliminar lógica de lectura/escritura en `tasks.json` y `results.json`.
        *   Manejar errores: Si la BD falla, devolver 503 (Service Unavailable), no caer en archivos locales.
    *   **Archivos clave**: `src/server/index.ts`, `src/server/routes/codeaudit.ts`.
    *   **Estado**: ✅ Completado (Iteración 1)

*   **Tarea 1.2: Health Checks y Gating** [x]
    *   **Acción**:
        *   Implementar `GET /healthz/db` que verifique conexión a PG.
        *   En `POST /codeaudit/upload` y `POST /scans/web`, verificar conexión antes de aceptar. Si falla, retornar 503 inmediato.
    *   **Estado**: ✅ Completado (Iteración 2)
    *   **Evidencia**: `EVIDENCE_Server_2_20251119.md`

*   **Tarea 1.3: Autenticación y Multi-tenancy** [x]
    *   **Contexto**: La API requería autenticación robusta para soportar múltiples tenants de forma segura.
    *   **Objetivo**: Implementar sistema de API Keys para proteger los endpoints y asegurar aislamiento de datos por tenant.
    *   **Acciones completadas**:
        1.  **Modelo de Datos**:
            *   ✅ Creada tabla `api_key` con foreign key a `tenant`.
        2.  **Middleware de Autenticación**:
            *   ✅ Implementado middleware que valida `X-API-Key`.
            *   ✅ Inyecta `tenant_id` en el contexto de la solicitud.
        3.  **Aislamiento**:
            *   ✅ Todas las consultas a BD filtran por `tenant_id` autenticado.
    *   **Criterios de éxito**:
        *   ✅ Endpoints protegidos rechazan solicitudes sin credenciales (401).
        *   ✅ Datos aislados por tenant (queries verificadas).
        *   ✅ Pruebas de integración con múltiples tenants.
    *   **Estado**: ✅ Completado (Iteración 3)
    *   **Evidencia**: `EVIDENCE_Server_3_20251128.md`

### 🔵 Track 2: Worker & Ejecución (Agente "Worker")
**Objetivo**: Mejorar la resiliencia, observabilidad y capacidad del Worker.

*   **Tarea 2.1: Resiliencia y Retries** [x]
    *   **Contexto**: El worker falla si la API no responde.
    *   **Acción**:
        *   Implementar lógica de reintento exponencial en `src/worker/entrypoint.ts` para las llamadas a `/queue/next` y `/queue/result`.
        *   Manejar códigos 503 del servidor esperando antes de reintentar.
    *   **Estado**: ✅ Completado (Iteración 1)

*   **Tarea 2.2: Estados Avanzados y Heartbeats** [x]
    *   **Acción**:
        *   Implementar "latidos" periódicos (cada 30-60s) a la BD (`worker_heartbeat` table).
        *   Soportar estados: `retrying`, `failed` (con razón), `timeout`.
        *   Implementar timeout configurable por tipo de tarea.
    *   **Estado**: ✅ Completado (Iteración 2)
    *   **Evidencia**: `EVIDENCE_Worker_2_20251119.md`

*   **Tarea 2.3: Logging para Fine-Tuning (Data Gen)** [x]
    *   **Contexto**: Necesitamos datos para entrenar al LLM.
    *   **Acción**:
        *   Asegurar que **toda** interacción con herramientas (stdout, stderr, exit code, prompt generado, respuesta del modelo) se guarde en `tool_execution` y tablas de auditoría.
        *   Estandarizar el formato JSON de `metrics_json` en `tool_execution` para incluir tokens usados, tiempo de inferencia, etc.
    *   **Estado**: ✅ Completado (Iteración 1)

*   **Tarea 2.4: Integración con LLM Remoto** [x]
    *   **Contexto**: El worker necesita capacidad de análisis inteligente de hallazgos.
    *   **Acción**:
        *   Implementar clase `LLMClient` que consuma la API de Ollama.
        *   Configurar para usar el modelo `securetag-v1` (Llama 3.1 8B fine-tuned).
        *   En `TaskExecutor`, después de Semgrep, enviar hallazgos High/Critical al LLM.
        *   Guardar análisis ("Triage: True Positive/False Positive", "Recomendación") en la base de datos.
        *   Manejar timeouts o fallos del LLM sin colgar el worker.
    *   **Entregables**:
        *   `src/worker/LLMClient.ts`
        *   Actualización de `TaskExecutor` para usar `securetag-v1`
        *   Tests unitarios del cliente LLM
    *   **Estado**: ✅ Completado (Iteración 3)
    *   **Evidencia**: `EVIDENCE_Worker_3_20251127.md`
    *   **Pruebas**: `test/test_llm_client.mjs` ejecutado exitosamente

### 🟠 Track 3: Infraestructura & DevOps (Agente "Infra")
**Objetivo**: Orquestación local con Docker y preparación para despliegue.

*   **Tarea 3.1: Docker Compose y Red** [x]
    *   **Acción**:
        *   Crear `docker-compose.yml` en la raíz que levante:
            *   `postgres` (con script de init para esquema).
            *   `securetag-app` (construido desde `docker/app/Dockerfile`).
            *   `securetag-worker` (construido desde `docker/worker/Dockerfile`).
            *   `ollama` (opcional, o conectar a host).
        *   Configurar red `securetag-net`.
        *   Definir volúmenes persistentes para DB y datos de tenants.
    *   **Estado**: ✅ Completado (Iteración 1)

*   **Tarea 3.2: Scripts de E2E Testing** [x]
    *   **Acción**:
        *   Actualizar `test/docker/codeaudit/codeaudit_e2e.sh` para levantar el stack completo con compose y probar el flujo: Upload -> Queue -> Worker (Semgrep) -> Result -> DB Verify.
    *   **Estado**: ✅ Completado (Iteración 1)

*   **Tarea 3.3: Investigación e Implementación de Infraestructura LLM** [x]
    *   **Contexto**: El proyecto usa modelo `securetag-ai-agent:latest` en Ollama localmente.
    *   **Acción**:
        *   Investigar opciones de despliegue: Docker local (Ollama containerizado), DigitalOcean GPU Droplets, RunPod.io.
        *   Crear análisis comparativo de costos, requisitos técnicos, latencia y escalabilidad.
        *   Recomendar mejor opción para desarrollo y producción.
        *   Implementar solución recomendada (agregar a `docker-compose.yml` o documentar configuración externa).
    *   **Archivos clave**: `docker-compose.yml`, documento de investigación en `docs/`.
    *   **Estado**: ✅ Completado (Iteración 2)
    *   **Evidencia**: `EVIDENCE_Infra_2_2025-11-19.md`
    *   **Decisión**: Docker Local (desarrollo) + RunPod Serverless (producción)

*   **Tarea 3.4: Preparación para Despliegue** [x]
    *   **Acción**:
        *   ✅ Configurar CI/CD (GitHub Actions).
        *   ✅ Gestión de secretos para producción.
        *   ✅ Scripts de despliegue para DigitalOcean/RunPod.
    *   **Estado**: ✅ Completado (Iteración 3-4)
    *   **Evidencia**: `EVIDENCE_Infra_3_2025-11-28.md`, `EVIDENCE_Infra_4_2025-12-01.md`

*   **Tarea 3.5: Integración de Entornos (DO + RunPod)** [ ]
    *   **Contexto**: El Worker en DigitalOcean necesita consumir el LLM en RunPod.
    *   **Acción**:
        *   Actualizar scripts de despliegue para inyectar `OLLAMA_HOST` dinámico.
        *   Documentar flujo de conexión.
        *   Verificar conexión end-to-end.
    *   **Estado**: 🔄 En Progreso
    *   **Prioridad**: Alta

### 🟣 Track 4: Fine-tuning & Machine Learning (Agente "Fine-tuning")
**Objetivo**: Generar datasets de alta calidad desde fuentes externas (PDFs, web) y entrenar el modelo LLM para mejorar su rendimiento.

> **Modelo actual**: `securetag-v1` basado en Llama 3.1 8B (fine-tuned)
> **Portabilidad**: Los datasets usan formatos estándar (JSONL) para permitir entrenamiento en otros modelos futuros.

*   **Tarea 4.1: Estrategia de Datos y Extracción** [x]
    *   **Acción**:
        *   Definir esquema de datos para fine-tuning (Input: Hallazgo/Contexto, Output: Análisis/Recomendación).
        *   Implementar scripts para extraer datos de fuentes estructuradas (NIST, MITRE, OWASP).
        *   Generar dataset inicial en formato JSONL.
    *   **Archivos clave**: `scripts/extract_from_web.py`, `scripts/extract_from_pdf.py`, `datasets/raw/`.
    *   **Nota de portabilidad**: El formato JSONL debe ser compatible con Hugging Face, Ollama, LLaMA Factory, y Axolotl para facilitar migración a otros modelos.
    *   **Estado**: ✅ Completado (Iteración 1-2)
    *   **Evidencia**: `EVIDENCE_Finetuning_1_2025-11-20.md`, `EVIDENCE_Finetuning_2_2025-11-21.md`

*   **Tarea 4.2: Preparación de Dataset y Entrenamiento** [x]
    *   **Acción**:
        *   Generado dataset híbrido (Tier 0 + Tier 1 + HuggingFace).
        *   Entrenado Llama 3.1 8B en RunPod (2x H100).
        *   Resultado: Modelo `securetag-v1` validado cualitativamente.
    *   **Estado**: ✅ Completado (Iteración 3-4)
    *   **Evidencia**: `EVIDENCE_Finetuning_3_2025-11-23.md`, `EVIDENCE_Finetuning_4_Completion.md`

*   **Tarea 4.3: Pipeline de Entrenamiento** [x]
    *   **Estado**: ✅ Completado en Iteración 3/4.

*   **Tarea 4.4: Evaluación y Validación** [x]
    *   **Estado**: ✅ Validación manual "A/B testing" completada. Modelo aprobado para uso.

## 📅 Plan de Ejecución Secuencial (Coordinación)

Aunque los agentes trabajan en paralelo, hay hitos de sincronización:

1.  **Fase 1: Cimientos (Infra + DB)** [x]
    *   *Agente Infra*: Crea `docker-compose.yml` y asegura que la BD levante con el esquema correcto.
    *   *Agente Server*: Verifica conexión a BD desde contenedor App.

2.  **Fase 2: Migración a DB-Only (Server)** [x]
    *   *Agente Server*: Elimina código de archivos JSON. Implementa endpoints puros SQL.

3.  **Fase 3: Robustez del Worker (Worker)** [x]
    *   *Agente Worker*: Implementa retries y mejora el logging de `tool_execution`.

4.  **Fase 4: Integración LLM & Logs (Todos)** [x]
    *   *Agente Worker*: Integra llamadas al LLM local (Ollama) para analizar hallazgos y guarda el par (Hallazgo, Análisis) en BD para el dataset.
    *   *Agente Fine-tuning*: Entrena modelo `securetag-v1` con dataset generado.

5.  **Fase 5: Autenticación y Multi-tenancy (Server)** [x]
    *   *Agente Server*: Implementa API Keys y aislamiento por tenant.

6.  **Fase 6: Preparación para Producción (Infra)** [x]
    *   *Agente Infra*: CI/CD, gestión de secretos, scripts de despliegue.

7.  **Fase 7: Integración Final (Infra)** [ ] 🔄 SIGUIENTE
    *   *Agente Infra*: Conectar DigitalOcean con RunPod.

## 📝 Notas para los Agentes
*   **Documentación**: Leer siempre `docs/SECURETAG_SAAS_PLAN.md` antes de tocar código crítico.
*   **Testing**: Cada cambio debe verificarse con `docker-compose up` y una prueba de flujo completa (subir archivo, verificar que se procesa).
*   **Base de Datos**: Asumir que el esquema ya existe (definido en `docs/Arquitectura...`), pero si faltan columnas para métricas/logs, proponer `ALTER TABLE`.

## 🚀 Siguientes Pasos Inmediatos

### Prioridad Alta
1.  **Server Agent**: Completar Tarea 1.3 (Autenticación y Multi-tenancy)
    *   Crear tablas `tenants` y `api_keys`
    *   Implementar middleware de autenticación
    *   Asegurar aislamiento por `tenant_id`

### Prioridad Media
2.  **Infra Agent**: Iniciar Tarea 3.4 (Preparación para Despliegue)
    *   Configurar GitHub Actions para CI/CD
    *   Documentar gestión de secretos
    *   Crear scripts de despliegue

### Backlog
3.  **Worker Agent**: Optimización de prompts LLM basado en feedback real
4.  **Fine-tuning Agent**: Evaluación automatizada a gran escala con `evaluate_models.py`

## 📊 Resumen de Progreso

| Fase | Tareas Completadas | Tareas Pendientes | Progreso |
|------|-------------------|-------------------|----------|
| **Fase 1: Cimientos** | 3/3 | 0/3 | 100% ✅ |
| **Fase 2: DB-Only** | 2/2 | 0/2 | 100% ✅ |
| **Fase 3: Robustez Worker** | 3/3 | 0/3 | 100% ✅ |
| **Fase 4: LLM Integration** | 2/2 | 0/2 | 100% ✅ |
| **Fase 5: Auth & Multi-tenancy** | 1/1 | 0/1 | 100% ✅ |
| **Fase 6: Producción** | 1/1 | 0/1 | 100% ✅ |
| **Fase 7: Integración Final** | 0/1 | 1/1 | 0% 🔄 |

**Progreso Total**: 12/13 tareas completadas (92%)

---

**Última actualización**: 2025-11-27
**Supervisor**: Agente Supervisor
**Próxima revisión**: Al completar Autenticación en Server
