#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Securetag RunPod Deployment Script
# ============================================================================
# Este script configura el servicio LLM en RunPod Serverless
# Requiere: RUNPOD_API_KEY, modelo GGUF, Modelfile
# ============================================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# Verificar variables requeridas
[ -z "${RUNPOD_API_KEY:-}" ] && error "RUNPOD_API_KEY no está configurado"

# Configuración
MODEL_FILE="${MODEL_FILE:-Mixtral_AI_CyberCoder_7b.Q4_K_M.gguf}"
MODELFILE="${MODELFILE:-Modelfile}"
ENDPOINT_NAME="${ENDPOINT_NAME:-securetag-llm}"
GPU_TYPE="${GPU_TYPE:-NVIDIA RTX A4000}"

info "Configurando RunPod Serverless Endpoint..."
info "  Modelo: $MODEL_FILE"
info "  GPU: $GPU_TYPE"

# Verificar que el modelo existe
if [ ! -f "$MODEL_FILE" ]; then
    error "Archivo de modelo no encontrado: $MODEL_FILE"
fi

if [ ! -f "$MODELFILE" ]; then
    error "Modelfile no encontrado: $MODELFILE"
fi

# Crear Dockerfile temporal para RunPod
info "Creando Dockerfile para RunPod..."
cat > Dockerfile.runpod <<'EOF'
FROM ollama/ollama:latest

# Copiar modelo y Modelfile
COPY ${MODEL_FILE} /models/model.gguf
COPY ${MODELFILE} /models/Modelfile

# Script de inicio
COPY runpod-start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 11434

CMD ["/start.sh"]
EOF

# Crear script de inicio
info "Creando script de inicio..."
cat > runpod-start.sh <<'EOF'
#!/bin/bash
set -e

# Iniciar Ollama en background
ollama serve &
OLLAMA_PID=$!

# Esperar a que Ollama esté listo
echo "Esperando a que Ollama esté listo..."
sleep 5

# Crear modelo desde Modelfile
cd /models
ollama create securetag-ai-agent:finetuned -f Modelfile

echo "✅ Modelo cargado: securetag-ai-agent:finetuned"

# Verificar modelo
ollama list

# Mantener contenedor vivo
wait $OLLAMA_PID
EOF

chmod +x runpod-start.sh

# Build de imagen Docker
info "Construyendo imagen Docker..."
DOCKER_IMAGE="securetag-ollama:latest"
docker build -f Dockerfile.runpod -t "$DOCKER_IMAGE" .

# Tag para Docker Hub (RunPod requiere registry público)
DOCKER_HUB_USER="${DOCKER_HUB_USER:-securetag}"
DOCKER_HUB_IMAGE="$DOCKER_HUB_USER/securetag-ollama:latest"

info "Tagging imagen para Docker Hub..."
docker tag "$DOCKER_IMAGE" "$DOCKER_HUB_IMAGE"

# Push a Docker Hub
info "Subiendo imagen a Docker Hub..."
if [ -n "${DOCKER_HUB_TOKEN:-}" ]; then
    echo "$DOCKER_HUB_TOKEN" | docker login -u "$DOCKER_HUB_USER" --password-stdin
fi

docker push "$DOCKER_HUB_IMAGE"

# Crear endpoint en RunPod usando API
info "Creando endpoint serverless en RunPod..."

ENDPOINT_CONFIG=$(cat <<EOF
{
  "name": "$ENDPOINT_NAME",
  "template": {
    "imageName": "$DOCKER_HUB_IMAGE",
    "containerDiskInGb": 20,
    "env": [
      {
        "key": "OLLAMA_HOST",
        "value": "0.0.0.0:11434"
      }
    ],
    "ports": "11434/http"
  },
  "gpuIds": "$GPU_TYPE",
  "workersMin": 0,
  "workersMax": 3,
  "idleTimeout": 5
}
EOF
)

RESPONSE=$(curl -s -X POST "https://api.runpod.io/v2/endpoints" \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$ENDPOINT_CONFIG")

ENDPOINT_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$ENDPOINT_ID" = "null" ] || [ -z "$ENDPOINT_ID" ]; then
    error "Error creando endpoint: $RESPONSE"
fi

info "✅ Endpoint creado exitosamente!"
info "  Endpoint ID: $ENDPOINT_ID"
info "  URL: https://api.runpod.ai/v2/$ENDPOINT_ID"

# Guardar configuración
cat > runpod-config.json <<EOF
{
  "endpoint_id": "$ENDPOINT_ID",
  "endpoint_url": "https://api.runpod.ai/v2/$ENDPOINT_ID",
  "model": "securetag-ai-agent:finetuned",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

info "Configuración guardada en: runpod-config.json"

# Test del endpoint
info "Probando endpoint..."
sleep 10

TEST_RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/$ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "What is SQL injection?",
      "model": "securetag-ai-agent:finetuned"
    }
  }')

if echo "$TEST_RESPONSE" | jq -e '.status == "COMPLETED"' > /dev/null; then
    info "✅ Endpoint funcionando correctamente!"
else
    warn "Endpoint creado pero test falló. Verifica manualmente."
    echo "$TEST_RESPONSE" | jq .
fi

# Cleanup
rm -f Dockerfile.runpod runpod-start.sh

info "🚀 Despliegue de RunPod completado!"
info "Configura OLLAMA_HOST en DigitalOcean:"
info "  OLLAMA_HOST=https://api.runpod.ai/v2/$ENDPOINT_ID"
info "  RUNPOD_API_KEY=$RUNPOD_API_KEY"
