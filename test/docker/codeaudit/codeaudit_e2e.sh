#!/usr/bin/env bash
set -euo pipefail

# Configuración
TENANT_ID="${TENANT_ID:-tenantA}"
ZIP_PATH="${1:-}"
NETWORK_NAME="core-net"

# Utilidades
die() { echo "[ERROR] $*" >&2; exit 1; }
info() { echo "[INFO] $*"; }

# Entrada: solicitar ruta si no se pasó como parámetro
if [ -z "${ZIP_PATH}" ]; then
  read -r -p "Ruta del archivo .zip: " ZIP_PATH
fi
[ -f "${ZIP_PATH}" ] || die "Archivo .zip no existe: ${ZIP_PATH}"

# Build de imágenes (idempotente)
info "Construyendo imágenes..."
docker build -f docker/worker/Dockerfile -t core-worker:dev .
docker build -f docker/app/Dockerfile -t core-api:dev .

# Red de Docker: crear sólo si no existe
info "Verificando red ${NETWORK_NAME}..."
if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  docker network create "${NETWORK_NAME}"
fi

# Base de datos PostgreSQL 18.1
docker rm -f core-db >/dev/null 2>&1 || true
docker run -d --name core-db --network "${NETWORK_NAME}" \
  -e POSTGRES_DB=securetag \
  -e POSTGRES_USER=securetag \
  -e POSTGRES_PASSWORD=securetagpwd \
  -v "$(pwd)/data/postgres:/var/lib/postgresql" \
  postgres:18.1

# Estructura de volúmenes por tenant
mkdir -p "data/${TENANT_ID}/uploads" "data/${TENANT_ID}/work" "data/${TENANT_ID}/db" "data/${TENANT_ID}/results"

# Arrancar App en la red interna
info "Arrancando App..."
docker rm -f core-api >/dev/null 2>&1 || true
docker run -d --name core-api --network "${NETWORK_NAME}" -p 8080:8080 \
  -e TENANT_ID="${TENANT_ID}" \
  -e DB_DIR="/var/securetag/${TENANT_ID}/db" \
  -e UPLOADS_DIR="/var/securetag/${TENANT_ID}/uploads" \
  -e WORK_DIR="/var/securetag/${TENANT_ID}/work" \
  -e RESULTS_DIR="/var/securetag/${TENANT_ID}/results" \
  -e DATABASE_URL="postgres://securetag:securetagpwd@core-db:5432/securetag" \
  -v "$(pwd)/data:/var/securetag" securetag-app:dev

# Espera activa a health OK
info "Comprobando salud de App..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8080/healthz | grep -q '"ok":true'; then
    break
  fi
  sleep 1
done

# Upload del ZIP (sin fijar Content-Type manual)
info "Subiendo ZIP..."
RESP=$(curl -s -X POST http://localhost:8080/codeaudit/upload -F "file=@${ZIP_PATH}" -F "profile=auto")

# Extraer taskId de forma robusta (Python y fallback sed)
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

# Ejecutar Worker en la red interna
info "Ejecutando Worker..."
docker run --rm --network "${NETWORK_NAME}" \
  -e TENANT_ID="${TENANT_ID}" \
  -e APP_HOST=core-api \
  -e APP_PORT=8080 \
  -e RESULTS_DIR="/var/securetag/${TENANT_ID}/results" \
  -e DATABASE_URL="postgres://securetag:securetagpwd@core-db:5432/securetag" \
  -e SEMGREP_APP_TOKEN="${SEMGREP_APP_TOKEN:-}" \
  -e SEMGREP_ANONYMOUS_USER_ID="${SEMGREP_ANONYMOUS_USER_ID:-}" \
  -e SEMGREP_HAS_SHOWN_METRICS_NOTIFICATION="${SEMGREP_HAS_SHOWN_METRICS_NOTIFICATION:-true}" \
  -v "$(pwd)/data:/var/securetag" core-worker:dev || true

# Poll del resultado hasta completed/failed (máx 60s)
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

# Mostrar salida final y guardar copia útil en results/
echo "${OUT}"
RESULT_FILE="data/${TENANT_ID}/results/${TASK_ID}.json"
echo "${OUT}" > "${RESULT_FILE}"
info "Resultado exportado: ${RESULT_FILE}"