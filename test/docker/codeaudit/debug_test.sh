#!/usr/bin/env bash
set -euo pipefail

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO] $*${NC}"; }
error() { echo -e "${RED}[ERROR] $*${NC}" >&2; }

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_SCRIPT="${SCRIPT_DIR}/codeaudit_e2e_compose.sh"
RESULTS_DIR="debug_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p "${RESULTS_DIR}"

# Archivo a probar (tests_basicos.zip)
ZIP_FILE="/Users/master/Downloads/Securetag Agent/test/docker/codeaudit/tests_basicos.zip"

# Asegurar que estamos en el root del proyecto
cd "${SCRIPT_DIR}/../../.."

# Reconstruir Worker (para aplicar cambio de analizar todo)
info "Reconstruyendo Worker..."
export OLLAMA_HOST="https://api.runpod.ai/v2/1z7edlh6wl4r49" 
export RUNPOD_API_KEY="${RUNPOD_API_KEY:-rpa_placeholder}" 
export MODEL="securetag-v1" 
export WORKER_API_KEY="local-dev-key" 
export API_KEY="local-dev-key" 
export TENANT_ID="tenantA"

# Reconstruimos el worker explícitamente
docker compose build core-worker

# Set variables for the E2E script - NO saltamos setup para asegurar limpieza
export SKIP_SETUP="" 
export POLL_MAX=600 

info "Iniciando prueba de depuración para: tests_basicos.zip"

# Ejecutar el script E2E pero capturando logs del worker en segundo plano
# Primero lanzamos el E2E en background? No, el E2E corre el worker con `docker compose run`.
# Como el E2E usa `docker compose run`, los logs salen a stdout del E2E script.
# PERO, queremos ver logs detallados.

# Modificamos temporalmente el E2E para que no use -d en el run? No, usa `run --rm`.
# Lo que haremos es ejecutar el E2E y guardar TODO el output (stdout y stderr) a un archivo
# y luego inspeccionar ese archivo buscando errores de LLM.

LOG_FILE="${RESULTS_DIR}/debug_execution.log"

if bash "${E2E_SCRIPT}" "${ZIP_FILE}" > "${LOG_FILE}" 2>&1; then
    info "Prueba completada. Analizando logs..."
    
    # Buscar errores de LLM en el log
    if grep -i "error" "${LOG_FILE}" | grep -i "llm"; then
        error "Se encontraron errores de LLM en los logs:"
        grep -i "error" "${LOG_FILE}" | grep -i "llm"
    else
        info "No se detectaron errores explícitos de LLM en los logs."
    fi
    
    # Buscar "analyzeFinding called" para ver si se intentó
    COUNT=$(grep -c "analyzeFinding called" "${LOG_FILE}" || true)
    info "Se intentó analizar ${COUNT} hallazgos."
    
    # Verificar resultado JSON
    LATEST_RESULT=$(ls -t data/tenantA/results/*.json | head -n 1)
    if [ -f "${LATEST_RESULT}" ]; then
        cp "${LATEST_RESULT}" "${RESULTS_DIR}/result.json"
        info "Resultado guardado en ${RESULTS_DIR}/result.json"
        cat "${LATEST_RESULT}"
    fi
else
    error "La prueba falló. Ver log completo en ${LOG_FILE}"
fi
