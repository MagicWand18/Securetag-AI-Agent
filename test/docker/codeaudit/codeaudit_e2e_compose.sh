#!/usr/bin/env bash
set -euo pipefail

# Configuración
TENANT_ID="${TENANT_ID:-tenantA}"
ZIP_PATH="${1:-}"
COMPOSE_FILE="docker-compose.yml"

# Utilidades
die() { echo "[ERROR] $*" >&2; exit 1; }
info() { echo "[INFO] $*"; }

# Entrada: solicitar ruta si no se pasó como parámetro
if [ -z "${ZIP_PATH}" ]; then
  read -r -p "Ruta del archivo .zip: " ZIP_PATH
fi
[ -f "${ZIP_PATH}" ] || die "Archivo .zip no existe: ${ZIP_PATH}"

# Limpieza previa (opcional, para asegurar estado limpio)
info "Limpiando contenedores previos..."
docker compose down -v || true

# Build y arranque de App y DB
info "Arrancando infraestructura (App + DB)..."
docker compose up -d --build securetag-db securetag-app

# Espera activa a health OK
info "Comprobando salud de App..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8080/healthz | grep -q '"ok":true'; then
    break
  fi
  sleep 1
done

# Upload del ZIP
info "Subiendo ZIP..."
RESP=$(curl -s -X POST http://localhost:8080/codeaudit/upload -F "file=@${ZIP_PATH}" -F "profile=auto")

# Extraer taskId
TASK_ID=$(python3 - <<'PY'
import sys,json
try:
  print(json.loads(sys.stdin.read()).get("taskId",""))
except Exception:
  print("")
PY
<<< "${RESP}")
if [ -z "${TASK_ID}" ]; then
  TASK_ID=$(echo "${RESP}" | sed -n 's/.*"taskId":"\([^"[:space:]]*\)".*/\1/p')
fi
[ -n "${TASK_ID}" ] || { echo "Respuesta del upload:"; echo "${RESP}"; die "No se pudo obtener taskId"; }

info "TaskId: ${TASK_ID}"

# Ejecutar Worker (one-off)
info "Ejecutando Worker..."
docker compose run --rm securetag-worker

# Poll del resultado
info "Consultando resultado para taskId=${TASK_ID}..."
OUT=""
for i in $(seq 1 60); do
  OUT=$(curl -s "http://localhost:8080/codeaudit/${TASK_ID}")
  STATUS=$(python3 - <<'PY'
import sys,json
try:
  print(json.loads(sys.stdin.read()).get("status",""))
except Exception:
  print("")
PY
<<< "${OUT}")
  if [ "${STATUS}" = "completed" ] || [ "${STATUS}" = "failed" ]; then
    break
  fi
  sleep 1
done

# Mostrar salida final y guardar copia
echo "${OUT}"
RESULT_FILE="data/${TENANT_ID}/results/${TASK_ID}.json"
# Asegurar que el directorio existe (aunque el volumen lo mapea, localmente puede no estar si docker lo creó como root)
mkdir -p "$(dirname "${RESULT_FILE}")"
echo "${OUT}" > "${RESULT_FILE}"
info "Resultado exportado: ${RESULT_FILE}"

# No hacemos docker-compose down al final para permitir depuración, 
# pero el usuario puede hacerlo manualmente.
