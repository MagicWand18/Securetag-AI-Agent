# Flujo E2E de Codeaudit (script e2e)

Este documento muestra de forma visual qué sucede al ejecutar:

```
bash test/docker/codeaudit/codeaudit_e2e.sh test/docker/codeaudit/juice-shop-master.zip
```

## Diagrama de flujo

```
ZIP (host)
  |
  | 1) Upload HTTP (multipart)
  v
securetag-app (contenedor)
  - Guarda ZIP en `uploads`
  - Encola tarea en BD (o archivos)
  |
  | 2) /queue/next (Worker pide tarea)
  v
securetag-worker (contenedor)
  - Reclama tarea
  - Unzip a `work/<taskId>`
  - Ejecuta Semgrep
  - Persiste: `tool_execution`, `finding`, `scan_result`
  |
  | 3) /queue/result (estado final)
  v
securetag-app (contenedor)
  - Actualiza estado de `task` en BD
  - Mantiene compatibilidad en archivos `results.json`
  |
  | 4) Poll de resultado (script)
  v
ZIP (host)
  - Guarda respuesta final en `data/<tenant>/results/<taskId>.json`
```

## Paso a paso

- Inicialización de red y contenedores
  - Crea red `securetag-net` y volúmenes por tenant (`uploads`, `work`, `db`, `results`).
  - Arranca BD `securetag-db` (PostgreSQL 18.1) con volumen persistente.
  - Arranca `securetag-app` con `DATABASE_URL` y directorios mapeados.
  - Referencias: `test/docker/codeaudit/codeaudit_e2e.sh:25-41`.

- Upload del ZIP
  - El script hace `POST /codeaudit/upload` (multipart) a `securetag-app`.
  - La App escribe el ZIP en `uploads/<taskId>.zip` y encola tarea `codeaudit` en BD.
  - Referencias: `src/server/index.ts:82-137`.

- Reclamo de tarea por el Worker
  - El script ejecuta `securetag-worker:dev` en la red interna.
  - El Worker llama `POST /queue/next` y recibe la tarea `codeaudit`.
  - Referencias: `src/worker/entrypoint.ts:31-42`, `src/server/index.ts:144-153`.

- Procesamiento del código
  - Unzip a `work/<taskId>/`.
  - Ejecuta Semgrep sobre el proyecto.
  - Guarda artefacto `semgrep.json` en `results/<taskId>/semgrep.json`.
  - Persiste en BD:
    - `securetag.tool_execution` (herramienta, args, exit_code, tiempos, refs).
    - `securetag.finding` (reglas, severidad, archivo, línea, fingerprint).
    - `securetag.scan_result` (resumen, storage_path).
  - Referencias: `src/worker/entrypoint.ts:55-112`.

- Cierre de ciclo y resultado final
  - El Worker POSTea `/queue/result` con `ok` y `taskId`.
  - La App actualiza `task.status` en BD y escribe `results.json` para compatibilidad.
  - El script hace poll `GET /codeaudit/{taskId}` hasta `completed/failed` y exporta `data/<tenant>/results/<taskId>.json`.
  - Referencias: `src/server/index.ts:167-193`, `test/docker/codeaudit/codeaudit_e2e.sh:82-104`.

## Contenedores y responsabilidades

- `securetag-db`
  - Base de datos PostgreSQL 18.1.
  - Esquema `securetag` con tablas: `tenant`, `task`, `codeaudit_upload`, `tool_execution`, `finding`, `scan_result`.

- `securetag-app`
  - API: `/healthz`, `/codeaudit/upload`, `/queue/next`, `/queue/result`, `/codeaudit/{id}`.
  - Encola y gestiona estado de tareas; guarda ZIPs y resultados.
  - Rutas: `uploads`, `work`, `db`, `results` bajo `/var/securetag/<tenant>/...`.

- `securetag-worker`
  - Reclama tareas, ejecuta herramientas (Semgrep), persiste en BD y artefactos.
  - Reporta estado final mediante `/queue/result`.

## Artefactos y persistencia

- Archivos
  - `uploads/<taskId>.zip`: ZIP subido.
  - `work/<taskId>/`: contenido descomprimido.
  - `results/<taskId>/semgrep.json`: salida detallada de Semgrep.
  - `results/<taskId>.json`: respuesta final del endpoint `GET /codeaudit/{taskId}`.

- Base de datos
  - `task`: estado, tipo y `payload_json`.
  - `codeaudit_upload`: metadatos de upload (nombre, ruta, tamaño).
  - `tool_execution`: trazabilidad de herramientas.
  - `finding`: hallazgos normalizados.
  - `scan_result`: resumen del análisis y referencia a `semgrep.json`.

## Verificaciones útiles

- Última tarea encolada:
```
docker exec -e PGPASSWORD=securetagpwd securetag-db \
  psql -h localhost -U securetag -d securetag \
  -c "SELECT id,type,status FROM securetag.task ORDER BY created_at DESC LIMIT 5;"
```

- Conteos de ejecución, hallazgos y resultados:
```
docker exec -e PGPASSWORD=securetagpwd securetag-db psql -h localhost -U securetag -d securetag -c "SELECT COUNT(*) AS executions FROM securetag.tool_execution;"
docker exec -e PGPASSWORD=securetagpwd securetag-db psql -h localhost -U securetag -d securetag -c "SELECT COUNT(*) AS findings FROM securetag.finding;"
docker exec -e PGPASSWORD=securetagpwd securetag-db psql -h localhost -U securetag -d securetag -c "SELECT COUNT(*) AS scans FROM securetag.scan_result;"
```

- Artefacto Semgrep:
```
ls data/<tenant>/results/<taskId>/semgrep.json && wc -c data/<tenant>/results/<taskId>/semgrep.json
```

## Fallback y compatibilidad

- Si falla la conexión a BD, la App y el Worker mantienen compatibilidad con archivos:
  - Encola y actualiza tareas en `data/<tenant>/db/tasks.json`.
  - Escribe resultados en `data/<tenant>/db/results.json`.