# Plan de Integración de Herramientas, Personalización y MVP SaaS

## 1) Integrar herramientas externas (ej. Semgrep) y requisitos de despliegue — ✅ Completado

- Principio: usar el registro y ejecución centralizada de herramientas externas del proyecto.
  - ✅ Registro y catálogo: `src/agent/tools/ExternalToolManager.ts:40` (arreglo `tools`).
  - ✅ Detección de disponibilidad: `src/agent/tools/ExternalToolManager.ts:136`.
  - ✅ Ejecución controlada: `src/agent/tools/ExternalToolManager.ts:244`.
  - ✅ Guías y estado: `src/agent/tools/ExternalToolManager.ts:298` y `src/agent/tools/ExternalToolManager.ts:337`.

- Añadir Semgrep (análisis estático de código):
  - ✅ Definido en el arreglo `tools`:
    - `name`: `semgrep`
    - `command`: `semgrep`
    - `description`: análisis de seguridad de código fuente.
    - `category`: `analysis`.
    - `installInstructions`: URL o comando del proveedor.
  - ✅ Estado en la CLI: `ExternalToolManager.isAvailable('semgrep')` (`src/cli/commands/tools.ts:31`).
  - ✅ Ejecución controlada: `ExternalToolManager.execute('semgrep', args)`.
  - ✅ Comando dedicado: `securetag-ai codeaudit <path>` (`src/cli/commands/codeaudit.ts:45`) con opciones `--config auto|file`, `--severity info|low|medium|high|critical|all`, `--json`, `--output`.
  - ✅ Mapeo de severidad: `low→INFO`, `medium→WARNING`, `high|critical→ERROR`; `all` no aplica filtro (`src/cli/commands/codeaudit.ts:52`, `src/cli/commands/codeaudit.ts:100-117`).
  - ✅ Normalización de hallazgos a `SecurityFinding` (`src/cli/commands/codeaudit.ts:16-43`).
  - ✅ Entrada Semgrep en registro de herramientas externas (`src/agent/tools/ExternalToolManager.ts:115-121`).
  - ✅ Advertencia en modo interactivo si Semgrep no está instalado (`src/cli/index.ts:80-88`).

### Checklist de integración de una herramienta externa (plantilla)

- Registrar herramienta en el catálogo:
  - `src/agent/tools/ExternalToolManager.ts` → agregar objeto en el arreglo `tools` con `name`, `command`, `description`, `category`, `installInstructions`.
- Verificación de disponibilidad y guía de instalación:
  - `src/cli/commands/tools.ts` → soporte en `--check`, `--available`, `--missing`, `--install-guide`.
- Ejecución controlada:
  - `ExternalToolManager.execute(name, args)` y uso dentro de un comando dedicado o workflow.
- Comando dedicado del CLI (si aplica):
  - Crear `src/cli/commands/<tool>.ts` con `.description()`, `.option()`, parseo de salida y normalización a interfaces del proyecto.
- Registro del comando en la CLI:
  - `src/cli/index.ts` → `program.addCommand(create<CommandName>Command())` y mensaje en “Quick Commands”.
- Ayuda extendida del comando:
  - Usar `.addHelpText('after', ...)` para documentar opciones, comportamiento y ejemplos.
- Documentación del CLI:
  - `docs/CLI_COMMANDS.md` → agregar sección con opciones, notas y ejemplos rápidos.
- Documentación del plan y referencias cruzadas:
  - `docs/SECURETAG_SAAS_PLAN.md` → describir diseño, mapeos, ubicaciones de código y validación.
- Validación de entorno:
  - `ExternalToolManager.generateStatusReport()` en scripts de arranque del SaaS; opcional advertencia en modo interactivo (`src/cli/index.ts`).
- Normalización de resultados:
  - Mapear salida de herramienta a interfaces comunes (`SecurityFinding`, `WebScanResult`, etc.).
- Pruebas y verificación:
  - Pruebas unitarias para parseo/normalización; pruebas de integración para ejecución y flujos.

- Uso típico (pseudocódigo):
  - `checkSemgrepAvailable(): boolean` → consulta al `ExternalToolManager`.
  - `runSemgrepOnPath(path): SemgrepResult` → construye args (config, salida JSON), ejecuta y parsea resultados.
  - `formatSemgrepFindings(result): Finding[]` → normaliza severidades y categorías a las usadas por el proyecto (`src/cli/commands/codeaudit.ts`).

- Consideraciones de Semgrep:
  - Requiere analizar archivos locales o repositorios; diseñar flujo para subida/selección de código o integración con repos remotos.
  - Mantener reglas/configuraciones de seguridad en un directorio controlado del servicio y versionarlas.

- Requisitos de despliegue en la nube (herramientas del sistema):
  - El proyecto detecta herramientas externas y las usa si están instaladas. No vienen empaquetadas: deben instalarse en el entorno.
    - Ejemplo: `nmap` se usa si está presente; se debe instalar en la imagen/host.
  - Mecanismo recomendado: imagen de sistema con instalación declarativa de herramientas (ej. `nmap`, `semgrep`, `nuclei`, etc.) y variables de entorno.
- Validación en arranque: incluir verificación de `semgrep` vía `ExternalToolManager.generateStatusReport()`.
  - Implementado: el CLI puede advertir la ausencia de Semgrep al inicio del modo interactivo (`src/cli/index.ts:80-88`). Para validación de entorno en SaaS, usar `ExternalToolManager.generateStatusReport()`.
  - Mantener un archivo de especificaciones de herramientas (texto) versionado, por ejemplo `docs/tools_requirements.txt`, con entradas: nombre, versión mínima y enlace de instalación.
  - Proveer un script de validación de entorno que ejecute `ExternalToolManager.generateStatusReport()` en el arranque y falle si herramientas críticas no están.

- Ejemplo de contenido `tools_requirements.txt` (plantilla):
  - `nmap >= 7.93` — https://nmap.org/download.html
  - `semgrep >= 1.x` — https://semgrep.dev
  - `nuclei >= 3.x` — https://projectdiscovery.io

## 2) Personalización de marca, textos y colores

Estado: Paleta corporativa aplicada al banner del CLI (completado)
       Etiqueta de respuestas cambiada a rojo con emoji IA (completado)

- Dónde están los textos y estilos:
  - Banner y colores: `src/utils/ui.ts:12` y `src/utils/ui.ts:20` (`ui.banner()`).
  - Colores/gradientes: `src/utils/ui.ts:8` a `src/utils/ui.ts:13`.
  - Mensajes de hallazgos y secciones: `src/utils/ui.ts:85` y `src/utils/ui.ts:133`.
  - Descripciones de comandos: cadenas en `.description()` y `.option()` en cada archivo de `src/cli/commands/*` (ej. `src/cli/commands/webscan.ts:132-150`).
  - Mensajes de herramientas externas: `src/cli/commands/tools.ts:1-155` y generación de guías `ExternalToolManager`.

- Parafraseo manteniendo `Securetag AI`:
  - Buscar cadenas con el nombre de la marca y reformular manteniendo el identificador.
  - Reglas de estilo: tono profesional, conciso, orientado a acción y seguridad.
  - Revisar mensajes en: `src/cli/session.ts:972-1026` (flujo `webscan`), `src/cli/commands/webscan.ts:152-220`.

- Ajuste de colores:
  - Gradientes actualizados a negro, gris, blanco y rojo en `src/utils/ui.ts:8-13`.
  - Etiqueta de salida del agente ahora en rojo con `🧠` en `src/cli/session.ts:963-969`.
  - Prompt del usuario en modo base usa `👤` en `src/cli/session.ts:223-251`.
  - Se mantiene contraste y legibilidad en secciones e iconografía.

- Propuesta de centralización (opcional):
  - Introducir un módulo `messages` con claves y plantillas parametrizadas.
  - `messages.get('welcome', { product: 'Securetag AI' })` y usarlo en UI y comandos.
  - Permite i18n y personalización sin tocar cada archivo.

- Pseudocódigo de proceso:
  - `scanStrings(): String[]` → buscar ocurrencias de marca y textos principales.
  - `rewriteStrings(rules): Diff[]` → aplicar reglas de parafraseo, generar diffs.
  - `applyBrandPalette(palette): void` → actualizar gradientes y colores en `ui.ts`.

## 3) MVP SaaS del proyecto

- Objetivo: exponer las funciones actuales como servicio multi‑tenant, con ejecución segura y escalable, empaquetando componentes en contenedores y orquestándolos.

- Componentes principales:
  - API HTTP: endpoints para crear tareas de escaneo/análisis y consultar resultados.
  - Orquestación: cola de tareas y planificador; estados (`queued`, `running`, `completed`, `failed`).
  - Workers: procesos que invocan los módulos existentes (`WebScanner`, `DesktopScanner`, `OSINT`) y herramientas externas a través de `ExternalToolManager`, ejecutados en contenedores aislados por tenant.
  - Persistencia: base de datos para usuarios, proyectos, tareas, resultados y hallazgos; almacenamiento de objetos para reportes.
  - Autenticación/autorización: control de acceso por rol y límites por plan; auditoría de acciones.
  - Observabilidad: logging estructurado, métricas y alertas.
  - LLM Service (compartido): servicio interno de inferencia IA multi‑tenant, accesible por red interna; aislamiento lógico por cliente (cuotas, límites, auditoría).

- Endpoints mínimos (ejemplos):
  - `POST /scans/web` → body con `url`, opciones (`quick|full`, `timeout`, flags). Devuelve `taskId`.
  - `GET /scans/{id}` → estado y resultado serializado (resumen, hallazgos, enlaces a reporte).
  - `POST /tools/status` → reporte de disponibilidad de herramientas externas.
  - `POST /analysis` → análisis IA sobre hallazgos existentes (`mode`, `model`, `payload`).

- Modelo de datos mínimo:
  - `User(id, email, plan, createdAt)`.
  - `Project(id, userId, name, settings)`.
  - `Task(id, projectId, type, payload, status, createdAt, finishedAt)`.
  - `ScanResult(id, taskId, target, summary, findings[], storagePath)`.

- Flujo de ejecución:
  - API valida entrada y encola tarea.
  - Worker toma tarea, ejecuta escáner/herramienta dentro del contenedor, formatea resultados (p. ej. `WebScanResult`).
  - Persistencia y almacenamiento del reporte; notificación o polling para entrega.

- Seguridad y cumplimiento:
  - Aislar workers y herramientas con límites de recursos y redes.
  - Validar consentimiento de escaneo y uso legítimo; registro de auditoría.
  - Gestión de secretos: fuera del repositorio, con rotación y mínimo privilegio.
  - Retención/portabilidad/borrado de datos por cliente.

- Despliegue y entornos:
  - Entornos separados (desarrollo, pruebas, producción).
  - Imágenes de contenedor por rol: API, Workers, LLM Service; usuario no‑root, filesystem de solo lectura cuando sea viable.
  - Imagen de herramientas externas para Workers: incluir binarios y runtimes requeridos (ver Inventario de herramientas) y validar en el arranque con `ExternalToolManager.generateStatusReport()`.
  - Rutas aisladas por tenant dentro del contenedor (variables `HOME`, `XDG_*` y volúmenes dedicados) para cachés y resultados.
  - Auto‑escalado de workers según cola y métricas de tiempo de proceso.

- Reutilización directa del código:
  - API llama a funciones que ya existen en CLI: `WebScanner` (`src/cli/commands/webscan.ts:152`), `DesktopScanner` (`src/cli/commands/scan.ts:104`), `ExternalToolManager.execute` (`src/agent/tools/ExternalToolManager.ts:244`).
  - El formateo actual a Markdown (`src/cli/commands/webscan.ts:12`) se complementa con salida JSON serializada para API.

- Validación y pruebas:
  - Pruebas unitarias para normalización de hallazgos y parseo de resultados.
  - Pruebas de integración reales para endpoints de API y ejecución de herramientas.
  - Observabilidad: métricas por tipo de tarea, tiempo y éxito/fallo.

- ### 3.1) Imagen de Workers

  - Objetivo: construir una imagen lista para ejecutar los workers con herramientas externas integradas, rutas aisladas por tenant y validación de entorno al arranque.

  - Diseño de la imagen:
    - Directorios:
      - `/opt/securetag/bin` → binarios de herramientas externas (Go y sistema).
      - `/opt/securetag/venv` → entorno Python para `sqlmap` y utilidades.
      - `/opt/securetag/tools` → scripts Bash (ej. `testssl.sh`) y utilidades.
      - `/var/securetag/<tenant>` → volúmenes montados por tenant para cachés/resultados.
    - Usuario/procesos:
      - Usuario no‑root dedicado (`securetag`), `PATH` incluyendo `/opt/securetag/bin`.
      - Filesystem de solo lectura cuando sea viable; permisos de escritura únicamente en volúmenes por tenant.
    - Variables de entorno por ejecución:
      - `HOME=/var/securetag/<tenant>/home`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME` apuntando al volumen del tenant.
      - `LLM_ENDPOINT` interno del clúster, `TENANT_ID` para trazabilidad y cuotas.
    - Validación de entorno:
      - Al arrancar, ejecutar verificación de herramientas usando el gestor: `ExternalToolManager.generateStatusReport()` (`src/agent/tools/ExternalToolManager.ts:136`, `src/agent/tools/ExternalToolManager.ts:244`).
      - Rutas internas de binarios detectadas por el proyecto: `src/agent/tools/ExternalToolManager.ts:170-181`; ejecución usando la ruta local: `src/agent/tools/ExternalToolManager.ts:270-276`.

  - Herramientas a incluir (prioridad MVP):
    - Go: `nuclei`, `ffuf`, `gobuster`, `amass`, `subfinder`, `httpx`, `katana`.
    - Sistema: `nmap`.
    - Python: `sqlmap` (instalación en `venv` con symlink a `/opt/securetag/bin`).
    - Ruby: `wpscan` (gem instalada con `--install-dir` y `--bindir` internos).
    - Bash: `testssl.sh` (script en `/opt/securetag/tools`).
    - Nota: `masscan` en imagen separada o instalación a nivel host controlado por requisitos de red.

  - Entrypoint del contenedor:
    - Arranque del worker que consume la cola y ejecuta `ExternalToolManager.execute(...)` para cada tarea.
    - Healthcheck de proceso y verificación de herramientas disponibles.

  - Seguridad operacional:
    - Límites de CPU/memoria/IO, capacidades de red mínimas, políticas de red.
    - Gestión de secretos fuera de la imagen; inyección por entorno seguro.

  - Checklist y estado:
    - [x] Definir Dockerfile base para Workers (usuario no‑root, PATH, directorios).
    - [x] Definir Dockerfile base para App (build de dist y ejecución CLI).
    - [x] Instalar herramientas Go en `/opt/securetag/bin` con rutas declaradas.
    - [x] Instalar `nmap` en la imagen (o capa del sistema según entorno de ejecución).
    - [x] Crear `venv` Python y preparar `sqlmap` con symlink.
    - [x] Instalar `wpscan` con `--install-dir` y `--bindir` internos.
    - [x] Clonar/preparar `testssl.sh` en `/opt/securetag/tools`.
    - [ ] Configurar variables `HOME` y `XDG_*` por tenant y volúmenes.
    - [x] Añadir validación de entorno al arranque (status report de herramientas).
    - [x] Healthcheck del contenedor y logs estructurados.
    - [x] Prueba local: ejecutar un scan web con `nuclei` y `httpx` y verificar salida.

  - Verificación local (ejemplo de uso):
    - Construir imagen y ejecutar contenedor con volumen de tenant y `LLM_ENDPOINT` configurado.
    - Ejecutar un worker que procese una tarea simple (`webscan`) y confirme la disponibilidad de herramientas.

- ### 3.1.1) Construcción y pruebas
  - Build:
    docker build -f docker/worker/Dockerfile -t securetag-worker:dev .
    docker build -f docker/app/Dockerfile -t securetag-app:dev .
  - Red:
    docker network create securetag-net
  - Worker:
    docker run --rm --network securetag-net -e TENANT_ID=tenantA securetag-worker:dev
    Resultado: salida JSON estructurada con ok: true tras httpx -version .
  - App:
    docker run --rm --network securetag-net -p 8080:8080 securetag-app:dev
    Health: curl http://localhost:8080/healthz → {"ok":true}
    Enqueue: curl -X POST http://localhost:8080/scans/web -d '{"url":"https://example.com","options":{"quick":true}}' → devuelve taskId y log JSON de enqueue.

- ### 3.1.2) Interconexión actual (end‑to‑end)

- Componentes:
  - App Server: `src/server/index.ts:1` expone `GET /healthz`, `POST /scans/web` (crea tarea `queued`), `POST /queue/next` (reclamo y marca `running`), `POST /queue/result` (entrega resultado y marca `completed|failed`), y `GET /scans/{id}` (estado y resultado si existe). Persistencia por tenant en `DB_DIR` (`tasks.json`, `results.json`).
  - Worker: `src/worker/entrypoint.ts:1` reclama tareas vía `POST /queue/next`, ejecuta `ExternalToolManager.execute(...)` (verificación mínima con `httpx`), publica resultados con `POST /queue/result` y emite métricas (`durationMs`).
- Red:
  - Red de contenedores `securetag-net` para interconexión interna.
- Volúmenes y rutas por tenant:
  - Montaje `$(pwd)/data:/var/securetag` y `TENANT_ID=tenantA`.
  - Base de datos por tenant: `/var/securetag/tenantA/db/tasks.json` y `/var/securetag/tenantA/db/results.json`.
- Flujo actual:
  - La App recibe `POST /scans/web` y agrega la tarea a `tasks.json` como `queued`.
  - El Worker reclama la siguiente con `POST /queue/next` (`running`).
  - Ejecuta la verificación mínima y publica resultado con `POST /queue/result` (`completed|failed`).
  - La App responde `GET /scans/{id}` con estado y resultado.
- Comandos de prueba:
  - Crear red: `docker network create securetag-net`.
  - App: `docker run -d --name securetag-app --network securetag-net -p 8080:8080 -e TENANT_ID=tenantA -e DB_DIR=/var/securetag/tenantA/db -v "$(pwd)/data:/var/securetag" securetag-app:dev`.
  - Health: `curl http://localhost:8080/healthz`.
  - Enqueue: `curl -X POST http://localhost:8080/scans/web -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'`.
  - Worker: `docker run --rm --network securetag-net -e TENANT_ID=tenantA -e APP_HOST=securetag-app -e APP_PORT=8080 securetag-worker:dev`.
  - Resultado: `curl http://localhost:8080/scans/<taskId>`.

- ### 3.1.3) MVP codeaudit con Semgrep

- Objetivo: endpoint para subir .zip de proyecto, descomprimir, ejecutar semgrep sobre todo el árbol y generar reporte JSON con hallazgos.
- Plan funcional:
  - Endpoint POST /codeaudit/upload :
    - Recibe multipart/form-data con file .zip , tenantId , profile (opcional).
    - Almacena el zip en /var/securetag/<tenant>/uploads/<taskId>.zip .
    - Descomprime en /var/securetag/<tenant>/work/<taskId>/ .
    - Crea tarea type: "codeaudit" con status: "queued" y guarda en tasks.json .
  - Worker codeaudit:
    - Reclama tareas type: "codeaudit" con /queue/next .
    - Ejecuta semgrep con ExternalToolManager.execute('semgrep', ['--json', '--quiet', '--config', 'auto', '-p', profile?, path]) .
    - Genera un result JSON con todos los hallazgos, métricas y paths.
    - Publica resultado en /queue/result y persiste en results.json .
  - Endpoint GET /codeaudit/{id} :
    - Devuelve estado actual queued|running|completed|failed .
    - Si completed , entrega el JSON completo del reporte (referencia y descarga con paginación si hace falta).
  - Seguridad:
    - Validar tamaño de zip y número de archivos; límites de tiempo y memoria en Worker.
    - Sanitizar paths al descomprimir; ejecutar semgrep con rutas aisladas y usuario no‑root.
    - Registrar auditoría y asociar tenantId y projectId si aplica.
  - Integración en contenedores:
    (Acciones pendientes movidas a "Siguientes pasos (Ejecución)")

- Pruebas end‑to‑end (replicables)
  - Build:
    - `docker build -f docker/worker/Dockerfile -t securetag-worker:dev .`
    - `docker build -f docker/app/Dockerfile -t securetag-app:dev .`
  - Red:
    - `docker network create securetag-net`
  - Volúmenes por tenant:
    - `mkdir -p data/tenantA/uploads data/tenantA/work data/tenantA/db data/tenantA/results`
  - App:
    - `docker run -d --name securetag-app --network securetag-net -p 8080:8080 -e TENANT_ID=tenantA -e DB_DIR=/var/securetag/tenantA/db -e UPLOADS_DIR=/var/securetag/tenantA/uploads -e WORK_DIR=/var/securetag/tenantA/work -v "$(pwd)/data:/var/securetag" securetag-app:dev`
  - Health:
    - `curl http://localhost:8080/healthz` → `{"ok":true}`
  - Crear zip de prueba (ejemplo):
    - `python3 - <<'PY'\nimport zipfile\nz=zipfile.ZipFile('project.zip','w')\nz.writestr('src/main.py','print("hello")')\nz.writestr('README.md','demo')\nz.close()\nprint('ZIP_READY')\nPY`
  - Upload `.zip`:
    - `curl -X POST http://localhost:8080/codeaudit/upload -F "file=@$(pwd)/project.zip" -F "profile=auto"`
    - Respuesta incluye `taskId` y `status: queued`
  - Worker:
    - `docker run --rm --network securetag-net -e TENANT_ID=tenantA -e APP_HOST=securetag-app -e APP_PORT=8080 -v "$(pwd)/data:/var/securetag" securetag-worker:dev`
  - Resultado:
    - `curl http://localhost:8080/codeaudit/<taskId>` devuelve `status` y, si `completed`, JSON crudo de `semgrep`.
  - Notas de seguridad:
    - Límite de tamaño de upload: 50 MB en `POST /codeaudit/upload`.
    - Rutas por tenant aisladas: `uploads/`, `work/`, `db/`.
    - Ejecución de herramientas en contenedor; sin exposición de credenciales.
    - Perfil soportado: `profile=auto` (otros perfiles se ignorarán temporalmente).
  - Script utilitario:
    - `test/docker/codeaudit/codeaudit_e2e.sh /ruta/proyecto.zip` ejecuta el flujo completo (build, red, despliegue, upload, worker y consulta de resultado). Si no se pasa ruta, la solicita de forma interactiva.

    
- ### 3.1.4) Plan para implementación de base de datos para MVP

# Fase 1 — Fundamentos de datos (obligatoria)
- Definir el modelo mínimo multi‑tenant: `tenant`, `user`, `project`, `task`, `codeaudit_upload`, `tool_execution`, `scan_result`, `finding`, `artifact`, `audit_log`, `quota_usage`.
- Establecer claves e índices por `tenant_id`, `created_at`, y relaciones (`task_id`), con restricciones de integridad.
- Diseñar almacenamiento de objetos para artefactos y reportes grandes; rutas y políticas de retención.
- Acordar contratos de serialización (`payload_json`, `args_json`, `metrics_json`) y normalización de hallazgos.
- Estrategia de migración: escritura paralela a archivos + BD, lectura preferente desde BD (compatibilidad mantenida).

Esquema relacional (DDL genérico)
- `tenant(id, name, plan, settings_json, created_at)`
- `user(id, tenant_id, email, role, created_at)`
- `project(id, tenant_id, name, settings_json, created_at)`
- `task(id, tenant_id, project_id, type, status, payload_json, retries, priority, created_at, started_at, finished_at)`
- `codeaudit_upload(id, tenant_id, project_id, task_id, file_name, storage_path, size_bytes, hash, created_at)`
- `tool_execution(id, tenant_id, task_id, tool, args_json, exit_code, started_at, finished_at, stdout_ref, stderr_ref, metrics_json)`
- `scan_result(id, tenant_id, task_id, summary_json, storage_path, created_at)`
- `finding(id, tenant_id, task_id, source_tool, rule_id, rule_name, severity, category, cwe, cve, file_path, line, fingerprint, evidence_ref, created_at)`
- `artifact(id, tenant_id, task_id, kind, storage_path, size_bytes, hash, created_at)`
- `audit_log(id, tenant_id, user_id, action, resource_type, resource_id, metadata_json, created_at)`
- `quota_usage(id, tenant_id, window_start, window_end, tokens_used, requests_count, storage_bytes)`

Índices y restricciones
- Índices por `tenant_id` y `created_at` en `task`, `finding`, `tool_execution`, `artifact`.
- Índices por `tenant_id`, `status`, `priority`, `created_at` en `task` para planificación.
- Unicidad lógica por `finding(fingerprint)` por `tenant_id` opcional para deduplicación.
- Restricciones de claves foráneas: `task(project_id)`, dependencias a `task_id` en tablas hijas.

Contratos de serialización (ejemplos)
- `task.payload_json` (codeaudit): `{ "profile": "auto", "zipPath": "/var/securetag/<tenant>/uploads/<taskId>.zip", "workDir": "/var/securetag/<tenant>/work/<taskId>" }` (corresponde a `src/server/index.ts:114-125`).
- `tool_execution.args_json`: `{ "command": "semgrep", "flags": ["scan","--json","--quiet","--config","auto","--exclude","__MACOSX/**","--exclude","**/._*","--exclude","**/.DS_Store"], "target": "/var/securetag/<tenant>/work/<taskId>" }` (corresponde a `src/worker/entrypoint.ts:63-65`).
- `tool_execution.metrics_json`: `{ "durationMs": <number>, "cpuPct": <number?>, "memBytes": <number?> }`.
- `scan_result.summary_json`: conteos por severidad/regla/archivo, enlaces a artefactos.
- `finding.evidence_ref`: puntero al bloque crudo en reporte del análisis estático.

Almacenamiento de objetos
- Esquema de `storage_path` con soporte para distintos backends: `file:///var/securetag/<tenant>/...`, `s3://bucket/<tenant>/...`.
- Convenciones de rutas: `uploads/<taskId>.zip`, `work/<taskId>/`, `results/<taskId>/report.json`, `artifacts/<taskId>/<kind>.<ext>`.
- Políticas de retención y borrado por tenant: ventanas por tipo de artefacto y tamaño máximo acumulado.

Migración paralela (archivos → BD)
- Escritura paralela: al crear/enviar resultado de `task`, persistir en BD y mantener `tasks.json`/`results.json` de respaldo (`src/server/index.ts:64-69`, `src/server/index.ts:152-165`).
- Lectura preferente: endpoints leen de BD; si no hay registro, caen a archivos.
- Reconciliación: script de backfill para importar tareas/resultados existentes por tenant.

DDL PostgreSQL 18.1 (MVP codeaudit)
```sql
-- Extensiones recomendadas
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- Esquema lógico
CREATE SCHEMA IF NOT EXISTS securetag;
SET search_path TO securetag;

CREATE TABLE IF NOT EXISTS tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  project_id UUID REFERENCES project(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','retrying','timeout','completed','failed','dead_letter')),
  payload_json JSONB DEFAULT '{}'::jsonb,
  retries INT NOT NULL DEFAULT 0,
  priority SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_task_tenant_created ON task (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_planner ON task (tenant_id, status, priority, created_at);

CREATE TABLE IF NOT EXISTS codeaudit_upload (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  project_id UUID REFERENCES project(id) ON DELETE SET NULL,
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  args_json JSONB DEFAULT '[]'::jsonb,
  exit_code INT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  stdout_ref TEXT,
  stderr_ref TEXT,
  metrics_json JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tool_exec_tenant_task ON tool_execution (tenant_id, task_id, started_at DESC);

CREATE TABLE IF NOT EXISTS scan_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  task_id UUID NOT NULL UNIQUE REFERENCES task(id) ON DELETE CASCADE,
  summary_json JSONB DEFAULT '{}'::jsonb,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  source_tool TEXT NOT NULL,
  rule_id TEXT,
  rule_name TEXT,
  severity TEXT CHECK (severity IN ('info','low','medium','high','critical')),
  category TEXT,
  cwe TEXT,
  cve TEXT,
  file_path TEXT,
  line INT,
  fingerprint TEXT,
  evidence_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finding_tenant_created ON finding (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finding_tenant_severity ON finding (tenant_id, severity);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_finding_fingerprint ON finding (tenant_id, fingerprint) WHERE fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS artifact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artifact_tenant_task ON artifact (tenant_id, task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_log (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  tokens_used BIGINT DEFAULT 0,
  requests_count BIGINT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quota_tenant_window ON quota_usage (tenant_id, window_start, window_end);
```

Convenciones de conexión y despliegue
- Variables: `DATABASE_URL` o `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` en App/Worker.
- Red interna: contenedor dedicado de base de datos en `securetag-net`; App/Worker conectan por host interno.
- Volumen persistente y backups; secretos fuera del repositorio.

# Fase 2 — Integración en App (uploads y estados) ✅ COMPLETADA
- ✅ Persistir `POST /codeaudit/upload` en BD con `codeaudit_upload` y creación de `task` (`type='codeaudit'`).
- ✅ Guardar estados de `task` (`queued|running|completed|failed`) en BD; mantener archivos como respaldo.
- ✅ Exponer `GET /scans/{id}` leyendo de BD con fallback a `results.json` mientras dura la migración.
- ✅ Registrar auditoría de acciones de App en `audit_log` por `tenant_id`.
- ✅ Health checks implementados (`GET /healthz/db`).
- ✅ Gating en endpoints de escritura.

# Fase 3 — Integración en Worker (ejecución y resultados) ✅ COMPLETADA
- ✅ Consumir tareas `codeaudit` y reflejar reclamos en BD (manteniendo el contrato actual de `/queue/next`).
- ✅ Descomprimir subida, ejecutar análisis estático y almacenar artefactos en almacenamiento de objetos (zip y JSON crudo).
- ✅ Insertar `tool_execution` con argumentos, tiempos y `exit_code`; mapear salida de análisis estático a `finding` y `scan_result` normalizados.
- ✅ Publicar resultado y métricas de ejecución en BD.
- ✅ **Integración LLM**: Cliente `LLMClient` implementado para análisis de hallazgos High/Critical con modelo `securetag-v1`.
- ✅ Columna `analysis_json` agregada a tabla `finding` para almacenar análisis del LLM.

# Fase 4 — Estados avanzados y reintentos ✅ COMPLETADA
- ✅ Añadir estados `retrying`, `timeout`, `failed` y contador de reintentos con backoff controlado.
- ✅ Implementar heartbeats/visibilidad de tareas para evitar trabajos huérfanos y expiraciones.
- ✅ Tabla `worker_heartbeat` creada y operativa.
- ✅ Persistir métricas de latencia y tasas por tenant/tipo para observabilidad y planificación.
- ✅ Timeouts configurables por tipo de tarea.

# Fase 5 — Salud de Workers y cuotas ✅ COMPLETADA
- ✅ Registrar salud periódica del Worker: herramientas disponibles, latencia media, últimas ejecuciones, uptime.
- ✅ **Autenticación y Multi-tenancy**: API Keys implementado y aislamiento por `tenant_id` garantizado.
- [ ] Control de cuotas por tenant: límites de tareas, tamaño de subidas y uso de IA; rechazos auditados en `audit_log` (BACKLOG).

# Fase 6 — Preparación para Producción ✅ COMPLETADA
- ✅ **CI/CD**: Configurar GitHub Actions para build, test y deploy automático.
- ✅ **Gestión de Secretos**: Documentar y configurar secretos para producción.
- ✅ **Scripts de Despliegue**: Crear scripts para DigitalOcean/RunPod.
- ✅ **Monitoreo**: Implementar alertas y métricas (Health checks implementados).
- [ ] Migrar de archivos a un backend de cola persistente (Redis/RabbitMQ) (BACKLOG).
- [ ] Integrar con el planificador y máquina de estados avanzada; pruebas de resiliencia y recuperación (BACKLOG).

Dependencias entre fases
- Orden estricto: 1 → 2 → 3 → 4 → 5 → 6. No se puede avanzar a una fase si la anterior no está completa.

# Checklist por fase (seguimiento)
- [x] Fase 1: modelo de datos, índices y contratos definidos (DDL PostgreSQL 18.1 añadido)
- [x] Fase 2: App escribe/lee en BD con compatibilidad de archivos
- [x] Fase 3: Worker persiste ejecuciones, findings y resultados en BD
- [x] Fase 4: estados avanzados y reintentos operativos
- [x] Fase 5: health de Workers operativo y auth implementado
- [x] Fase 6: CI/CD y preparación para producción completada

- ### 3.2) Siguientes pasos (Ejecución)

  - **Worker**: ✅ COMPLETADO
    - ✅ Cambiar el entrypoint para consumir una cola real y ejecutar flujos con `ExternalToolManager.execute(...)`.
    - ✅ Añadir métricas y health detallado (latencia, estado de herramientas).
    - ✅ **LLM Integration**: Cliente `LLMClient` implementado con modelo `securetag-v1`.
    - ⏸️ Standby: Esperando implementación de Auth en Server.

  - **App**: ✅ COMPLETADO
    - ✅ Reemplazar CLI por API completa: definir `POST /scans/web` que encole en un backend de cola y notifique al Worker.
    - ✅ Añadir `GET /scans/{id}` para lectura de estado/resultados.
    - ✅ Implementar autenticación (API Keys) y multi-tenancy.
    - ✅ Middleware de autenticación y validación de `tenant_id`.
    - ⏸️ Standby: Todas las tareas completadas.

  - **Orquestación**: ✅ COMPLETADO
    - ✅ Montar volúmenes por tenant y ajustar `HOME`/`XDG_*` en el runtime.
    - ✅ Configurar `LLM_ENDPOINT` y probar integración del LLM compartido.
    - ✅ Docker Compose con Ollama configurado.
    - ✅ CI/CD y gestión de secretos para producción.
  - **Orquestación**: ✅ COMPLETADO
    - ✅ Montar volúmenes por tenant y ajustar `HOME`/`XDG_*` en el runtime.
    - ✅ Configurar `LLM_ENDPOINT` y probar integración del LLM compartido.
    - ✅ Docker Compose con Ollama configurado.
    - ✅ CI/CD y gestión de secretos para producción.
    - ✅ Conectar entorno DigitalOcean con RunPod.

  - **Fine-tuning**: ✅ COMPLETADO
    - ✅ Modelo `securetag-v1` (Llama 3.1 8B) entrenado en RunPod.
    - ✅ Dataset híbrido generado (Tier 0 + Tier 1 + HuggingFace).
    - ✅ Validación cualitativa exitosa.
    - ⏸️ Standby: Modelo listo para uso en producción.

  - Checklist de ejecución:
    - [x] EntryPoint de Worker inicial y healthcheck.
    - [x] API mínima `GET /healthz` y `POST /scans/web` (enqueue).
    - [x] `GET /scans/{id}` leyendo resultados por tenant.
    - [x] Cola por archivos en volumen compartido por tenant.
    - [x] Métricas básicas (duración de tarea, herramienta usada).
    - [x] Pruebas locales de interconexión contenidas.

  - Próximas tareas (orden recomendado):
    - [x] `GET /scans/{id}` con estados `queued|running|completed|failed`.
    - [x] Incluir `semgrep` en la imagen del Worker.
    - [x] Volúmenes por tenant: habilitar `uploads/` y `work/` además de `db/`.
    - [x] Añadir endpoints `POST /codeaudit/upload` y `GET /codeaudit/{id}` en `src/server/index.ts:1`.
    - [x] Extender el Worker para tipo `codeaudit` y ejecutar `semgrep` vía `ExternalToolManager.execute`.
    - [x] Health del Worker: verificar `semgrep --version` y disponibilidad.
    - [x] Ejecutar pruebas con un `.zip` pequeño y verificar salida JSON.
    - [x] **Integrar LLM en Worker**: Cliente `LLMClient` con modelo `securetag-v1` para análisis de hallazgos.
    - [x] **Implementar autenticación**: API Keys y multi-tenancy en Server (Fase 5).
    - [x] **Preparar Producción**: CI/CD y scripts de despliegue (Fase 6).
    - [x] **Integrar LLM en Worker**: Cliente `LLMClient` con modelo `securetag-v1` para análisis de hallazgos.
    - [x] **Implementar autenticación**: API Keys y multi-tenancy en Server (Fase 5).
    - [x] **Preparar Producción**: CI/CD y scripts de despliegue (Fase 6).
    - [x] **Integrar DigitalOcean con RunPod** (Tarea 3.5).
    - [ ] Sustituir cola por archivos por un backend real (persistente/escalable).
    - [ ] Sustituir cola por archivos por un backend real (persistente/escalable).
    - [ ] Añadir control de cuotas por tenant (límites de tareas, storage, tokens LLM).
    - [ ] Orquestación: montar volúmenes por tenant en Kubernetes y declarar `HOME`/`XDG_*` en despliegues.
    - [ ] CI/CD: GitHub Actions para build, test y deploy automático.

- Orden recomendado (MVP contenedores): ✅ COMPLETADO
  - ✅ Definir imagen base de Workers con herramientas externas claves del inventario (`nuclei`, `nmap`, `ffuf`, `gobuster`, `amass`, `subfinder`, `httpx`, `katana`, `semgrep`) y runtimes (`sqlmap` en venv Python, `wpscan` como gem Ruby, `testssl.sh` como script Bash). Excepción: `masscan` se mantiene fuera o en imagen separada por requisitos de red.
  - ✅ Crear imagen de API y conectar a la misma red interna; exponer endpoints mínimos.
  - ✅ Definir LLM Service compartido con endpoint interno; configurar `LLM_ENDPOINT` y cuotas por tenant.
  - ✅ Ajustar `ExternalToolManager` para que los Workers usen rutas internas de la imagen y entornos aislados.
  - ✅ Desplegar entorno de pruebas con escalado básico y validación de arranque (estado de herramientas).

## 🎯 Próximos Hitos Críticos

### Hito 1: Autenticación y Multi-tenancy (ALTA PRIORIDAD)
**Agente**: Server
**Objetivo**: Asegurar la API y preparar para múltiples clientes.
**Tareas**:
- [ ] Crear tablas `tenants` y `api_keys`
- [ ] Implementar middleware de autenticación (`X-API-Key` o JWT)
- [ ] Asegurar aislamiento de datos por `tenant_id`
- [ ] Tests de integración con múltiples tenants

### Hito 2: Preparación para Producción (MEDIA PRIORIDAD) ✅ COMPLETADO
**Agente**: Infra
**Objetivo**: CI/CD y gestión de secretos.
**Tareas**:
- [x] Configurar GitHub Actions
- [x] Documentar gestión de secretos
- [x] Scripts de despliegue para DigitalOcean/RunPod
- [x] Monitoreo y alertas (Health Checks)

### Hito 3: Integración Final (ALTA PRIORIDAD) ✅ COMPLETADO
**Agente**: Infra
**Objetivo**: Conectar componentes distribuidos.
**Tareas**:
- [x] Configurar `OLLAMA_HOST` en DigitalOcean apuntando a RunPod
- [x] Verificar flujo end-to-end en producción

### Hito 3: Escalabilidad (BAJA PRIORIDAD)
**Agente**: Infra + Server
**Objetivo**: Cola persistente y auto-escalado.
**Tareas**:
- [ ] Migrar de archivos a cola persistente (Redis/RabbitMQ)
- [ ] Implementar auto-escalado de workers
- [ ] Pruebas de carga y resiliencia



---

## Respuestas rápidas

- ¿Nmap está integrado o debo descargarlo?
  - Debes instalarlo en el entorno. El proyecto lo detecta y lo usa si está disponible (`src/agent/tools/ExternalToolManager.ts:40`, `src/agent/tools/ExternalToolManager.ts:136`).
  - Si no está instalado, la CLI muestra guía y estado (`src/cli/commands/tools.ts:42`, `src/agent/tools/ExternalToolManager.ts:288`).

- ¿Cómo listar herramientas que faltan?
  - `securetag-ai tools --missing` muestra las ausentes con instrucciones (`src/cli/commands/tools.ts:107`).

  ## 4) Inventario de herramientas

  ### Herramientas internas
  - WebScanner (web) — `src/agent/tools/web/WebScanner.ts:16` (usa `HeaderAnalyzer.ts:18`, `HttpClient.ts`, `Authorization.ts`)
  - HeaderAnalyzer (análisis de headers) — `src/agent/tools/web/HeaderAnalyzer.ts:18`
  - DesktopScanner (sistema) — `src/agent/tools/scanner.ts:9`
  - HardeningChecker (hardening) — `src/agent/tools/hardening.ts:12`
  - OSINT Orchestrator — `src/agent/tools/osint/orchestrator.ts:1` (WHOIS `whois-lookup.ts`, DNS `dns-recon.ts`, subdominios `subdomain-enum.ts`, emails `email-harvest.ts`, usuarios `username-enum.ts`, brechas `breach-check.ts`, tecnologías `tech-detect.ts`, Wayback `wayback.ts`, IP `ip-lookup.ts`, reporter `reporter.ts`)
  - PcapAnalyzer — `src/agent/tools/PcapAnalyzer.ts:1` y PcapReporter `src/agent/tools/PcapReporter.ts:176`
  - DependencyScanner (retire.js wrapper) — `src/agent/tools/DependencyScanner.ts:50`
  - SSLAnalyzer — `src/agent/tools/SSLAnalyzer.ts:47`
  - ScreenshotTool — `src/agent/tools/ScreenshotTool.ts:1`
  - SecurityReporter (formateo CLI) — `src/agent/tools/reporter.ts:1`
  - ExternalToolManager (gestor de herramientas externas) — `src/agent/tools/ExternalToolManager.ts:22`

  ### Herramientas externas
  - nmap — escáner de puertos (scanning) — `src/agent/tools/ExternalToolManager.ts:31` — Integración: ✅ | Instalación: ✅
  - nuclei — escáner de vulnerabilidades (scanning) — `src/agent/tools/ExternalToolManager.ts:38` — Integración: ✅ | Instalación: ❌
    Stack: Go (instalación local vía `GOBIN`)
  - ffuf — fuzzer web (reconnaissance) — `src/agent/tools/ExternalToolManager.ts:45` — Integración: ✅ | Instalación: ❌
    Stack: Go (instalación local vía `GOBIN`)
  - sqlmap — detección/explotación SQLi (exploitation) — `src/agent/tools/ExternalToolManager.ts:52` — Integración: ✅ | Instalación: ❌
    Stack: Python (venv local con symlink a `tools/bin`)
  - wpscan — WordPress scanner (scanning) — `src/agent/tools/ExternalToolManager.ts:59` — Integración: ✅ | Instalación: ❌
    Stack: Ruby (gem con `--install-dir` y `--bindir` locales)
  - testssl.sh — análisis SSL/TLS (scanning) — `src/agent/tools/ExternalToolManager.ts:66` — Integración: ✅ | Instalación: ❌
    Stack: Bash (repo local y symlink a `tools/bin`)
  - gobuster — fuerza bruta directorios/DNS (reconnaissance) — `src/agent/tools/ExternalToolManager.ts:73` — Integración: ✅ | Instalación: ❌
    Stack: Go (instalación local vía `GOBIN`)
  - amass — mapeo de superficie de ataque (reconnaissance) — `src/agent/tools/ExternalToolManager.ts:80` — Integración: ✅ | Instalación: ❌
    Stack: Go (instalación local vía `GOBIN`)
  - masscan — escáner TCP rápido (scanning) — `src/agent/tools/ExternalToolManager.ts:87` — Integración: ✅ | Instalación: ❌
    Stack: C/SO (instalación a nivel sistema por practicidad)
  - subfinder — enumeración pasiva de subdominios (reconnaissance) — `src/agent/tools/ExternalToolManager.ts:94` — Integración: ✅ | Instalación: ❌
    Stack: Go (instalación local vía `GOBIN`)
  - httpx — probing HTTP (reconnaissance) — `src/agent/tools/ExternalToolManager.ts:101` — Integración: ✅ | Instalación: ❌
    Stack: Go (instalación local vía `GOBIN`)
  - katana — crawler/spider (reconnaissance) — `src/agent/tools/ExternalToolManager.ts:108` — Integración: ✅ | Instalación: ❌
    Stack: Go (instalación local vía `GOBIN`)
  - semgrep — análisis estático de código (analysis) — `src/agent/tools/ExternalToolManager.ts:115` (comando `securetag-ai codeaudit` `src/cli/commands/codeaudit.ts:45`) — Integración: ✅ | Instalación: ✅

  - OSV-Scanner — SCA dependencias (analysis) — Integración: ❌ | Instalación: ❌
  - Trivy — SCA, contenedores, secretos (analysis) — Integración: ❌ | Instalación: ❌
  - Anchore Grype — SCA imágenes/SBOM (analysis) — Integración: ❌ | Instalación: ❌
  - OWASP Dependency-Check — SCA CVE/NVD (analysis) — Integración: ❌ | Instalación: ❌
  - CodeQL (CLI) — SAST avanzado (analysis) — Integración: ❌ | Instalación: ❌
  - Bandit — SAST Python (analysis) — Integración: ❌ | Instalación: ❌
  - Gosec — SAST Go (analysis) — Integración: ❌ | Instalación: ❌
  - Brakeman — SAST Rails (analysis) — Integración: ❌ | Instalación: ❌
  - FindSecBugs — SAST Java/Android (analysis) — Integración: ❌ | Instalación: ❌
  - Flawfinder — SAST C/C++ (analysis) — Integración: ❌ | Instalación: ❌
  - Gitleaks — secretos (analysis) — Integración: ❌ | Instalación: ❌
  - TruffleHog — secretos (analysis) — Integración: ❌ | Instalación: ❌
  - detect-secrets — secretos con baseline (analysis) — Integración: ❌ | Instalación: ❌
  - Checkov — IaC multi-stack (analysis) — Integración: ❌ | Instalación: ❌
  - tfsec — IaC Terraform (analysis) — Integración: ❌ | Instalación: ❌
  - Terrascan — IaC multi-proveedor (analysis) — Integración: ❌ | Instalación: ❌
  - KICS — IaC multi-stack (analysis) — Integración: ❌ | Instalación: ❌
  - Kubescape — Kubernetes posture (analysis) — Integración: ❌ | Instalación: ❌
  - Hadolint — Dockerfile linter (analysis) — Integración: ❌ | Instalación: ❌
  - Syft — SBOM generación (supply chain) — Integración: ❌ | Instalación: ❌
  - Cosign — firmas de artefactos (supply chain) — Integración: ❌ | Instalación: ❌
  - SLSA Verifier — verificación SLSA (supply chain) — Integración: ❌ | Instalación: ❌
  - Conftest (OPA) — políticas como código (analysis) — Integración: ❌ | Instalación: ❌
  - ShellCheck — linter de scripts (utils) — Integración: ❌ | Instalación: ❌
  - pre-commit — framework de hooks (utils) — Integración: ❌ | Instalación: ❌
  - ScanCode Toolkit — licencias/compliance (analysis) — Integración: ❌ | Instalación: ❌

  ## 5) Implementación de TOON
  ¿Qué es TOON?
	•	TOON significa Token-Oriented Object Notation.  ￼
	•	Es un formato de serialización de datos diseñado específicamente para contextos de LLM (Large Language Models), cuyo objetivo es reducir el número de tokens consumidos al enviar datos estructurados.  ￼
	•	Principales características:
	•	Elimina buena parte de la “sintaxis extra” de JSON (llaves {}, comillas ", comas ,) para ahorrar tokens.  ￼
	•	Ideal para datos “tabulares” o uniformes: arrays de objetos con misma estructura.  ￼
	•	No necesariamente la mejor opción para datos muy anidados o estructuras complejas no uniformes.  ￼

Ejemplo de conversión de JSON → TOON:
JSON:
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}

TOON:
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user


# comando regenerar imagen y hace prueba sast
docker rm -f securetag-app && docker run -d --name securetag-app --network securetag-net -p 8080:8080 -e TENANT_ID=tenantA -e DB_DIR=/var/securetag/tenantA/db -e RESULTS_DIR=/var/securetag/tenantA/results -v "$(pwd)/data:/var/securetag" securetag-app:dev && sleep 1 && TASK_ID=$(jq -r '.[] | select(.type=="codeaudit" and .status=="completed") | .id' data/tenantA/db/tasks.json | head -n 1); echo "TASK_ID=$TASK_ID"; curl -sS "http://localhost:8080/codeaudit/$TASK_ID.html" | sed -n '1,120p'


# credenciales contraseña base de datos postgres
Credenciales por defecto:
- POSTGRES_USER=securetag
- POSTGRES_PASSWORD=securetagpwd
- POSTGRES_DB=securetag

## 6) Beta 2: Motor SAST Propio y Optimizaciones

### 6.1) Motor SAST Propio (Independencia de Semgrep Cloud) ✅ COMPLETADO
**Problema**: La integración actual depende de Semgrep Cloud (Login/Token), lo cual implica usar reglas propietarias con restricciones de licencia para uso comercial en SaaS.
**Solución**: Utilizar el motor Open Source de Semgrep (`semgrep-core` / CLI) gestionando las reglas localmente.

**Arquitectura del Motor Propio**:
1.  **Motor**: Binario `semgrep` OSS ejecutado en contenedores Worker.
2.  **Reglas**:
    *   **Open Source**: Sincronización periódica de reglas comunitarias (semgrep-rules) compatibles con licencia LGPL/Commons.
    *   **Propias (Custom)**: Reglas desarrolladas internamente para patrones específicos de seguridad.
3.  **Gestión**:
    *   Directorio `/opt/securetag/rules` en la imagen del Worker.
    *   Volumen o ConfigMap para actualizar reglas sin reconstruir imagen.
4.  **Ejecución**:
    *   Comando: `semgrep scan --config /opt/securetag/rules --json ...`
    *   Sin flag `--config auto` (que suele llamar a la nube) ni login.

### 6.2) Funcionalidades Pendientes de Beta 1 (Integración)
Estas tareas se mueven de "Backlog" a "Beta 2 Core":

1.  **Backend de Cola Escalable**:
    *   Sustituir la cola basada en polling de DB/Archivos por **Redis** (BullMQ o similar).
    *   Objetivo: Reducir latencia y carga en la base de datos.

2.  **Control de Cuotas (Billing/Limiting)**:
    *   Middleware para verificar límites antes de encolar tareas.
    *   Límites: Scans/mes, Almacenamiento (GB), Tokens LLM.

3.  **Automatización CI/CD**:
    *   Activar pipelines de GitHub Actions para despliegue automático (CD) en DigitalOcean tras push a `main`.

### 6.3) Nuevas Funcionalidades (Beta 2 Extended) ✅ COMPLETADO
Basado en feedback de usuario (Jordan), se añaden las siguientes capacidades:

#### A. Gestión de Proyectos y Alias
**Problema**: Los UUIDs de proyectos son difíciles de recordar/compartir.
**Solución**:
*   Añadir columna `alias` (unique per tenant) a la tabla `project`.
*   Endpoint para crear/actualizar proyectos soportando `alias`.
*   Permitir buscar proyectos por `id` o `alias`.

#### B. Retest y Trazabilidad (Vulnerabilidades Residuales)
**Problema**: Los clientes necesitan verificar si los hallazgos previos fueron corregidos y ver la evolución temporal.
**Solución**:
*   **Concepto de "Scan Run"**: Cada ejecución (`codeaudit`) pertenece a un `project`.
*   **Lógica de "Retest"**:
    *   Al subir un nuevo zip para un proyecto existente, el sistema compara (diff) los hallazgos nuevos con los anteriores.
    *   **Estados de Hallazgo**: `New`, `Fixed`, `Residual` (Persistente).
    *   Histórico de tendencias: Gráfica de # hallazgos por severidad a lo largo del tiempo.
*   **Nuevo Endpoint**: `POST /projects/{id|alias}/retest` (o `scan` con contexto de proyecto).

#### C. Historial y endpoints de consulta
**Solución**:
*   `GET /projects`: Listar proyectos con filtros (alias, fecha).
*   `GET /projects/{id|alias}/history`: Listar ejecuciones (tasks) asociadas a ese proyecto con resumen de resultados.