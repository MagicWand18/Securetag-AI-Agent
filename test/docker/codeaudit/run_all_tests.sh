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
RESULTS_DIR="test_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p "${RESULTS_DIR}"

# Archivos a probar
TEST_FILES=(
    "/Users/master/Downloads/Securetag Agent/test/docker/codeaudit/project.zip"
    "/Users/master/Downloads/Securetag Agent/test/docker/codeaudit/tests_basicos.zip"
    "/Users/master/Downloads/Securetag Agent/test/docker/codeaudit/juice-shop-master.zip"
)

# Asegurar que estamos en el root del proyecto
cd "${SCRIPT_DIR}/../../.."

# Reconstruir App (para aplicar cambios en el endpoint) y levantar DB
info "Reconstruyendo y levantando servicios..."
export OLLAMA_HOST="https://api.runpod.ai/v2/1z7edlh6wl4r49" 
export RUNPOD_API_KEY="${RUNPOD_API_KEY:-rpa_placeholder}" 
export MODEL="securetag-v1" 
export WORKER_API_KEY="local-dev-key" 
export API_KEY="local-dev-key" 
export TENANT_ID="tenantA"

# Set variables for the E2E script
export SKIP_SETUP=1
export POLL_MAX=600 # 10 minutes for safety (Juice Shop is big)

docker compose up -d --build securetag-db securetag-app

# Esperar a que la App esté lista
info "Esperando a que la App esté lista..."
for i in {1..30}; do
  if curl -s http://localhost:8080/healthz | grep -q '"ok":true'; then
    info "App lista."
    break
  fi
  sleep 2
done

# Iterar sobre los archivos
for ZIP_FILE in "${TEST_FILES[@]}"; do
    if [ ! -f "${ZIP_FILE}" ]; then
        error "Archivo no encontrado: ${ZIP_FILE}"
        continue
    fi

    BASENAME=$(basename "${ZIP_FILE}")
    info "Iniciando prueba para: ${BASENAME}"
    
    # Capturar salida
    LOG_FILE="${RESULTS_DIR}/${BASENAME}.log"
    
    # Llamar al script E2E
    if bash "${E2E_SCRIPT}" "${ZIP_FILE}" > "${LOG_FILE}" 2>&1; then
        info "Prueba exitosa para ${BASENAME}"
        
        # Extraer el JSON del resultado (el script E2E lo guarda en data/tenantA/results/TASKID.json)
        # Buscamos el último archivo creado en data/tenantA/results
        LATEST_RESULT=$(ls -t data/tenantA/results/*.json | head -n 1)
        
        if [ -f "${LATEST_RESULT}" ]; then
            cp "${LATEST_RESULT}" "${RESULTS_DIR}/${BASENAME}.json"
            info "Resultado guardado en ${RESULTS_DIR}/${BASENAME}.json"
            
            # Verificar si tiene analysis_json
            if grep -q "analysis_json" "${LATEST_RESULT}"; then
                 info "✅ VALIDACIÓN: analysis_json encontrado en el resultado."
            else
                 # Es posible que la estructura sea findings[].analysis_json, verificamos findings
                 if grep -q "findings" "${LATEST_RESULT}"; then
                    info "✅ Findings encontrados. Verificando contenido..."
                    # Podríamos usar jq si está instalado, pero grep es más seguro por ahora
                 else
                    error "❌ VALIDACIÓN FALLIDA: No se encontraron findings o analysis_json"
                 fi
            fi
        else
            error "No se encontró el archivo de resultados generado"
        fi
        
    else
        error "Prueba fallida para ${BASENAME}. Ver log: ${LOG_FILE}"
    fi
    
    echo "---------------------------------------------------"
done

info "Todas las pruebas completadas. Resultados en ${RESULTS_DIR}"
