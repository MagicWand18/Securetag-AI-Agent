# Despliegue de Modelo Fine-tuned en RunPod Serverless

**Última actualización**: 2025-11-29  
**Modelo**: `securetag-v1` (Llama 3.1 8B + LoRA adapter)

---

## 🎯 Solución Final: Usar Template Oficial de RunPod

Después de múltiples intentos, la solución definitiva es **adaptar el template oficial** de RunPod Worker Ollama para incluir tu modelo fine-tuned.

### ✅ Ventajas de este enfoque:

1. **Probado y mantenido** por RunPod
2. **Soporte nativo** para streaming y OpenAI API
3. **Manejo robusto** de errores y concurrencia
4. **Preload de modelos** en build time

---

## 📋 Fase 1: Preparar Archivos

### Paso 1.1: Organizar Estructura

```bash
cd /Users/master/Downloads/Securetag\ Agent

# Crear directorio de trabajo
mkdir -p runpod-deploy
cd runpod-deploy

# Copiar template de RunPod
cp -r ../runpod-worker-ollama-master/* .

# Copiar tu modelo fine-tuned
cp ../Modelfile .
cp -r ../mymodel .
```

### Paso 1.2: Crear Dockerfile Adaptado

Crea `Dockerfile.securetag`:

```dockerfile
ARG OLLAMA_VERSION=0.5.4
FROM ollama/ollama:${OLLAMA_VERSION}

ENV PYTHONUNBUFFERED=1
ENV OLLAMA_NUM_GPU=99
ENV OLLAMA_NUM_BATCH=512
ENV OLLAMA_NUM_THREAD=8
ENV OLLAMA_FLASH_ATTENTION=1

WORKDIR /

RUN apt-get update --yes --quiet && DEBIAN_FRONTEND=noninteractive apt-get install --yes --quiet --no-install-recommends \
    software-properties-common gpg-agent build-essential apt-utils \
    && apt-get install --reinstall ca-certificates \
    && add-apt-repository --yes ppa:deadsnakes/ppa && apt update --yes --quiet \
    && DEBIAN_FRONTEND=noninteractive apt-get install --yes --quiet --no-install-recommends \
    python3.11 python3.11-dev python3.11-distutils python3.11-lib2to3 \
    python3.11-gdbm python3.11-tk bash curl && \
    ln -s /usr/bin/python3.11 /usr/bin/python && \
    curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /work

# Copiar código del worker
ADD ./src /work

# Copiar modelo fine-tuned
COPY Modelfile /work/Modelfile
COPY mymodel /work/mymodel

ENV OLLAMA_MODELS="/runpod-volume"

RUN pip install -r requirements.txt && chmod +x /work/start.sh

# Precargar modelo base y crear fine-tuned
RUN ollama serve & \
    sleep 10 && \
    ollama pull llama3.1:8b && \
    cd /work && \
    ollama create securetag-v1 -f Modelfile && \
    pkill ollama

ENTRYPOINT ["/bin/sh", "-c", "/work/start.sh"]
```

---

## 🐳 Fase 2: Construir y Subir Imagen

### Paso 2.1: Construir Imagen

```bash
cd runpod-deploy

# Construir (esto tomará 15-20 minutos)
docker build -f Dockerfile.securetag -t securetag-llm:final .
```

### Paso 2.2: Tag y Push

```bash
# Tag con versión final
docker tag securetag-llm:final magicwand1818/securetag-llm:final

# Push a Docker Hub
docker push magicwand1818/securetag-llm:final
```

---

## 🚀 Fase 3: Desplegar en RunPod

### Paso 3.1: Crear Endpoint

1. Ve a [RunPod Serverless](https://www.runpod.io/console/serverless)
2. Click en **"Deploy a New Serverless Endpoint"**
3. Selecciona **"Import from Docker Registry"**

### Paso 3.2: Configurar Endpoint

**Container Image**:
```
magicwand1818/securetag-llm:final
```

**GPU Configuration**:
- Prioridad 1: **24 GB** (RTX 4090)
- Prioridad 2: **32 GB** (A40)

**Environment Variables**:
```
OLLAMA_MODEL_NAME=securetag-v1
OLLAMA_MODELS=/runpod-volume
MAX_CONCURRENCY=8
```

**Container Configuration**:
- Container Disk: `15 GB`
- HTTP Ports: (vacío)
- TCP Ports: (vacío)

### Paso 3.3: Deploy

Click en **"Deploy Endpoint"** y espera 3-5 minutos.

---

## ✅ Fase 4: Probar Endpoint

### Paso 4.1: Obtener Endpoint ID

RunPod te dará:
- **Endpoint ID**: `y6ihb5018gejiq`
- **API Key**: `rpa_YOUR_RUNPOD_API_KEY_HERE`

### Paso 4.2: Probar con Prompt Simple

```bash
export RUNPOD_API_KEY="rpa_YOUR_RUNPOD_API_KEY_HERE"
export ENDPOINT_ID="y6ihb5018gejiq"

curl -X POST https://api.runpod.ai/v2/$ENDPOINT_ID/run \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $RUNPOD_API_KEY" \
    -d '{
      "input": {
        "llm_input": "¿Qué es SQL Injection y cómo prevenirlo?"
      }
    }'
```

**Respuesta esperada**:
```json
{
  "id": "xxx-xxx-xxx",
  "status": "IN_QUEUE"
}
```

### Paso 4.3: Obtener Resultado

```bash
# Usar el ID de la respuesta anterior
curl https://api.runpod.ai/v2/$ENDPOINT_ID/status/xxx-xxx-xxx \
    -H "Authorization: Bearer $RUNPOD_API_KEY"
```

### Paso 4.4: Probar con OpenAI API (Opcional)

El worker también soporta formato OpenAI:

```bash
curl -X POST https://api.runpod.ai/v2/$ENDPOINT_ID/run \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $RUNPOD_API_KEY" \
    -d '{
      "input": {
        "openai_route": "/v1/chat/completions",
        "openai_input": {
          "model": "securetag-v1",
          "messages": [
            {"role": "system", "content": "Eres un experto en ciberseguridad."},
            {"role": "user", "content": "Explica OWASP Top 10"}
          ],
          "stream": false
        }
      }
    }'
```

---

## 🔗 Fase 5: Integrar con Securetag App

### Paso 5.1: Actualizar `.env` en DigitalOcean

```bash
# SSH al servidor
ssh root@143.198.61.64

# Editar .env
cd /opt/securetag
nano .env

# Agregar/modificar:
RUNPOD_ENDPOINT_ID=y6ihb5018gejiq
RUNPOD_API_KEY=rpa_YOUR_RUNPOD_API_KEY_HERE
MODEL=securetag-v1
```

### Paso 5.2: Actualizar `LLMClient.ts`

```typescript
// src/worker/LLMClient.ts
async analyzeFinding(finding: any): Promise<any> {
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  const apiKey = process.env.RUNPOD_API_KEY;
  
  if (!endpointId || !apiKey) {
    throw new Error('RunPod credentials not configured');
  }

  // Enviar request a RunPod
  const response = await axios.post(
    `https://api.runpod.ai/v2/${endpointId}/run`,
    {
      input: {
        llm_input: this.buildPrompt(finding)
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const jobId = response.data.id;

  // Polling para obtener resultado
  let result;
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }
    );

    if (statusResponse.data.status === 'COMPLETED') {
      result = statusResponse.data.output;
      break;
    }
  }

  return result;
}
```

### Paso 5.3: Reiniciar Servicios

```bash
docker compose restart securetag-app securetag-worker
docker compose logs -f securetag-worker
```

---

## 💰 Fase 6: Monitoreo de Costos

### Costos Estimados (GPU 24 GB)

- **Idle**: $0.00/hora (serverless)
- **Active**: ~$0.68/hora
- **Ejemplo**: 100 requests/día × 15 seg/request = ~0.42 horas/día = **~$0.28/día**

### Optimizaciones

1. **Reducir timeout**: 60 segundos → 30 segundos
2. **Batch requests**: Agrupar múltiples findings en un solo request
3. **Cache**: Guardar análisis de findings similares

---

## 🐛 Troubleshooting

### Problema: Worker crashea con exit code 1

**Solución**: Verifica logs en RunPod Console → Logs. Busca errores de creación del modelo.

### Problema: Timeout en requests

**Solución**: Aumenta `Execution Timeout` en RunPod a 300 segundos.

### Problema: Modelo no se carga

**Solución**: Verifica que `Modelfile` y `mymodel` estén correctamente copiados en la imagen:

```bash
docker run -it magicwand1818/securetag-llm:final ls -la /work
```

---

## 📊 Checklist Final

- [ ] Imagen Docker construida con modelo fine-tuned
- [ ] Imagen subida a Docker Hub
- [ ] Endpoint RunPod creado y configurado
- [ ] Prueba exitosa con curl
- [ ] Variables de entorno configuradas en DigitalOcean
- [ ] `LLMClient.ts` actualizado
- [ ] Prueba end-to-end exitosa
- [ ] Monitoreo de costos configurado

¡Despliegue completado! 🎉
