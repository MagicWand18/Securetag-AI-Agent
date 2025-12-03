#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Securetag Integration Verification Script
# ============================================================================
# Verifica la conectividad entre DigitalOcean y RunPod
# ============================================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }

# Cargar variables de entorno
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    error "Archivo .env no encontrado"
    exit 1
fi

# Verificar variables requeridas
if [ -z "${RUNPOD_ENDPOINT_ID:-}" ]; then
    error "RUNPOD_ENDPOINT_ID no está configurado en .env"
    exit 1
fi

if [ -z "${RUNPOD_API_KEY:-}" ]; then
    error "RUNPOD_API_KEY no está configurado en .env"
    exit 1
fi

RUNPOD_URL="https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}"

info "=== Verificación de Integración RunPod ==="
echo ""
info "Endpoint ID: $RUNPOD_ENDPOINT_ID"
info "URL: $RUNPOD_URL"
echo ""

# Test 1: Conectividad básica
info "Test 1: Verificando conectividad a RunPod..."
if curl -s --max-time 5 "https://api.runpod.ai" > /dev/null; then
    success "Conectividad a RunPod OK"
else
    error "No se puede alcanzar api.runpod.ai"
    exit 1
fi

# Test 2: Autenticación
info "Test 2: Verificando autenticación..."
AUTH_TEST=$(curl -s -X POST "${RUNPOD_URL}/run" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
    -d '{"input":{"prompt":"test"}}' \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$AUTH_TEST" | tail -n1)
RESPONSE=$(echo "$AUTH_TEST" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    success "Autenticación exitosa (HTTP $HTTP_CODE)"
else
    error "Autenticación falló (HTTP $HTTP_CODE)"
    echo "Respuesta: $RESPONSE"
    exit 1
fi

# Test 3: Generación de respuesta
info "Test 3: Probando generación de respuesta..."
JOB_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JOB_ID" ]; then
    success "Job creado: $JOB_ID"
    
    # Esperar a que el job complete
    info "Esperando respuesta del modelo..."
    sleep 5
    
    # Obtener resultado
    RESULT=$(curl -s "${RUNPOD_URL}/status/${JOB_ID}" \
        -H "Authorization: Bearer ${RUNPOD_API_KEY}")
    
    STATUS=$(echo "$RESULT" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS" = "COMPLETED" ]; then
        success "Modelo respondió correctamente"
    else
        warn "Job en estado: $STATUS (puede estar en cola)"
    fi
else
    warn "No se pudo obtener Job ID, pero la conexión funciona"
fi

echo ""
success "=== Verificación Completada ==="
echo ""
info "Próximos pasos:"
info "1. Reinicia el Worker: docker compose restart securetag-worker"
info "2. Monitorea logs: docker compose logs -f securetag-worker"
info "3. Envía una tarea de prueba desde tu máquina local"
