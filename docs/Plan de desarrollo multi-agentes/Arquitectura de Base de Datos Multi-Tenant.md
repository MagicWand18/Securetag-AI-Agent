# Arquitectura de Base de Datos Multi-Tenant

          
**Objetivo**
- Diseñar una arquitectura de datos multi‑tenant, escalable y segura.
- Inicialmente cubrir `codeaudit` sin bloquear la expansión a escaneos web, OSINT, SSL, PCAP, etc.

**Principios Multi‑Tenant**
- Particionamiento por `tenant_id` en todas las tablas clave.
- Aislamiento lógico: consultas siempre condicionadas por `tenant_id` y control de acceso por rol/plan.
- Evitar acoplar la lógica de negocio al motor; usar claves estables (`uuid`) y tipos claros.
- Artefactos grandes fuera de la BD transaccional (almacenamiento de objetos) y métricas en almacenamiento optimizado para series temporales.

**Capas de Datos**
- Metadatos relacionales: entidades principales, estados, relaciones y auditoría.
- Almacenamiento de objetos: zips subidos, reportes grandes, evidencias, capturas, documentos generados.
- Cola persistente: orquestación de tareas, visibilidad y reintentos.
- Series temporales: métricas de ejecución (latencia, tasas de error, uso de herramientas).
- Caché rápida: estados recientes de colas/health de workers.
- Índices y particionamiento: por `tenant_id`, `created_at`, `type`, y claves externas.

**Modelo Lógico (Core)**
- `tenant(id, name, plan, created_at, settings)` — configuración y límites por plan.
- `user(id, tenant_id, email, role, created_at)` — propietario de acciones y auditoría.
- `project(id, tenant_id, name, settings, created_at)` — agrupador lógico de tareas/resultados.
- `task(id, tenant_id, project_id, type, status, payload_json, retries, created_at, started_at, finished_at, priority)`
- `tool_execution(id, tenant_id, task_id, tool, args_json, exit_code, started_at, finished_at, stdout_ref, stderr_ref, metrics_json)`
- `scan_result(id, tenant_id, task_id, summary_json, storage_path, created_at)` — resumen por tarea.
- `finding(id, tenant_id, task_id, source_tool, rule_id, rule_name, severity, category, cwe, cve, file_path, line, fingerprint, evidence_ref, created_at)` — normalizado y reutilizable para cualquier escaneo.
- `artifact(id, tenant_id, task_id, kind, storage_path, size_bytes, hash, created_at)` — evidencias, capturas, reportes.
- `quota_usage(id, tenant_id, window_start, window_end, tokens_used, requests_count, storage_bytes)` — control de cuotas.
- `audit_log(id, tenant_id, user_id, action, resource_type, resource_id, metadata_json, created_at)` — trazabilidad.

Relaciones clave:
- `tenant 1..N user/project/task`
- `project 1..N task`
- `task 1..N tool_execution/finding/artifact`
- `task 1..1 scan_result` (por tipo de escaneo)

Estados:
- `task.status`: `queued|running|retrying|timeout|completed|failed|dead_letter`

Índices recomendados:
- `(tenant_id, created_at)` en `task`, `finding`, `tool_execution`, `artifact`
- `(tenant_id, status, priority, created_at)` en `task` para planificador
- `(tenant_id, task_id)` en tablas dependientes
- `(tenant_id, source_tool, severity)` en `finding` para consultas analíticas

**Esquema Mínimo para Codeaudit (MVP)**
- `codeaudit_upload(id, tenant_id, project_id, task_id, file_name, storage_path, size_bytes, created_at)` — referencia al zip subido.
- `task` con `type='codeaudit'`, `payload_json` incluyendo `profile` y rutas de trabajo esperadas por el Worker (corresponde al flujo actual `src/server/index.ts:76-131`).
- `tool_execution` con `tool='semgrep'` y `stdout_ref` al JSON crudo (en almacenamiento de objetos).
- `finding` poblado desde el JSON de semgrep:
  - `source_tool='semgrep'`, `rule_id`/`rule_name` del resultado, `severity` mapeada, `file_path`, `line`, `fingerprint`, y `evidence_ref` al bloque original.
- `scan_result` con `summary_json` (totales por severidad, reglas, archivos) y `storage_path` al reporte completo.

Con esto, `codeaudit` queda funcional y el esquema ya es utilizable por otros escaneos: se reaprovechan `task`, `tool_execution`, `finding`, `artifact`, `scan_result`.

**Evolución y Escalabilidad**
- Tipificar `task.type` para nuevos flujos (`web`, `osint`, `pcap`, `ssl`), sin modificar el modelo base.
- Añadir tablas específicas por tipo cuando se requiera metadata propia:
  - `webscan_target(task_id, url, flags_json)`
  - `pcap_session(task_id, capture_ref, packet_count, protocol_stats_json)`
  - `osint_target(task_id, target_type, target_value, scope_json)`
- Mantener `finding` genérico con `source_tool` y enriquecer con taxonomías estandarizadas (CWE/CVE/OWASP Top 10).
- Métricas en series temporales por `tenant_id` y `type`: latencia, tasa de éxito, volumen procesado; sirven para auto‑escalado y cuotas.

**Cuotas y Auditoría**
- `quota_usage` por ventana deslizante por `tenant_id`: número de tareas, tamaño de subidas, ejecuciones de IA (tokens/peticiones).
- Validaciones en encolado y en Worker; rechazos registrados en `audit_log`.
- Puntos de captura:
  - En App: al crear `task` (`POST /scans/web`, `POST /codeaudit/upload`) y al finalizar (`/queue/result`) según `src/server/index.ts:46-75`, `src/server/index.ts:144-166`.
  - En Worker: por ejecución de herramientas (`src/worker/entrypoint.ts:64-73`), almacenando `tool_execution`.

**Migración desde Archivos**
- Fase 1: Escribir en paralelo a BD y a archivos existentes para compatibilidad (lectura prioritaria desde BD si existe).
- Fase 2: Desactivar escritura a archivos, mantener solo exportaciones a `artifact.storage_path` cuando aplique.
- Fase 3: Eliminar dependencias de `tasks.json/results.json` del servidor (`src/server/index.ts:64-69`, `src/server/index.ts:152-165`).
- Validación: scripts de consistencia para reconciliar tareas y resultados; índices de backfill por `tenant_id`.

**Orquestación y Cola Persistente**
- Colas por `tenant_id` (o clave compuesta) y soporte de:
  - Visibilidad con expiración para evitar tareas perdidas.
  - Reintentos con backoff y tope, transiciones automáticas a `retrying|dead_letter`.
  - Prioridades y “rate limiting” por `tenant_id` alineadas con `quota_usage`.
- Persistir reclamos de tareas, heartbeats y resultados en `task` + `tool_execution`.

**Siguiente Paso**
- Si te parece bien este diseño, preparo:
  - Un catálogo de columnas y restricciones para el MVP de `codeaudit` (DDL orientado a implementación).
  - El mapeo de salida de semgrep a `finding` y `scan_result` según el parseo actual del Worker (`src/worker/entrypoint.ts:63-73`).
  - Un plan de cambio en el servidor para leer/escribir tareas y resultados desde la BD preservando el contrato actual de endpoints.