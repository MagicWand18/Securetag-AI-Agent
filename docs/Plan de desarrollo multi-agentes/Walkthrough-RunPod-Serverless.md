# Walkthrough: Despliegue de LLM en RunPod Serverless (Guía Definitiva)

**Fecha**: 2025-12-01  
**Objetivo**: Desplegar `securetag-v1` (Llama 3.1 8B fine-tuned) en RunPod Serverless de forma robusta y escalable.  
**Estado**: ✅ Probado y Verificado

---

## 📋 Prerrequisitos

- [x] Cuenta de RunPod activa
- [x] Docker instalado localmente
- [x] Archivos del modelo: `Modelfile` y directorio `mymodel/` (adapter LoRA)
- [x] Directorio de trabajo: `runpod-deploy/` (contiene el template oficial adaptado)

---

## 🚀 Fase 1: Construcción de la Imagen (Critical Fixes)

Esta fase es crítica. Hemos resuelto problemas de compatibilidad de arquitectura (Mac vs Linux) y estabilidad (LoRA vs Flash Attention).

### 1.1 Estructura de Archivos
Asegúrate de estar en la carpeta `runpod-deploy/` y tener:

```text
runpod-deploy/
├── Dockerfile              # Dockerfile corregido (Flash Attention=0)
├── Modelfile               # Tu configuración del modelo
├── mymodel/                # Tu adapter LoRA (.safetensors)
└── src/                    # Código del worker (handler.py, etc.)
```

### 1.2 Construir la Imagen (AMD64)
**IMPORTANTE**: Si estás en Mac (M1/M2/M3), debes usar `--platform linux/amd64`. Si no lo haces, obtendrás un "Exec format error" en RunPod.

```bash
cd runpod-deploy

# Construir forzando arquitectura Linux/AMD64
docker build --platform linux/amd64 -t securetag-llm:v2 .
```

> **Nota**: Usamos el tag `:v2` (o superior) para evitar problemas de caché en RunPod. Nunca uses `:latest` para actualizaciones críticas.

### 1.3 Subir a Docker Hub
Debes subir la imagen a un registro público para que RunPod pueda descargarla.

```bash
# Taggear con tu usuario (si no lo hiciste en el build)
docker tag securetag-llm:v2 magicwand1818/securetag-llm:v2

# Subir imagen
docker push magicwand1818/securetag-llm:v2
```

---

## ☁️ Fase 2: Despliegue en RunPod

### 2.1 Crear/Actualizar Endpoint
1. Ve a [RunPod Serverless Console](https://www.runpod.io/console/serverless).
2. Click en **New Endpoint** (o edita uno existente).
3. Configura lo siguiente:

| Campo | Valor | Notas |
|-------|-------|-------|
| **Endpoint Name** | `securetag-llm-v2` | Identificativo |
| **Container Image** | `magicwand1818/securetag-llm:v2` | **Usa el tag exacto que subiste** |
| **Container Disk** | `50 GB` | Mínimo para Llama 3.1 8B |
| **GPU** | **24 GB** (RTX 4090) | Recomendado. 16GB podría quedarse corto. |
| **Idle Timeout** | `30` segundos | Para ahorrar costos |

### 2.2 Variables de Entorno
El Dockerfile ya configura la mayoría, pero puedes forzar estas en la consola de RunPod para mayor seguridad:

```ini
OLLAMA_MODEL_NAME=securetag-v1
MAX_CONCURRENCY=8
```

> **OJO**: No actives `OLLAMA_FLASH_ATTENTION=1`. Esto causa que el modelo crashee al cargar adaptadores LoRA. Déjalo en 0 (default en nuestra imagen).

---

## ✅ Fase 3: Verificación

### 3.1 Cold Start vs Warm Start
*   **Cold Start (Primer request)**: Tardará **2-3 minutos**. RunPod debe descargar la imagen (6GB+) y cargar el modelo en VRAM.
*   **Warm Start (Siguientes)**: Tardará **< 1 segundo** en iniciar.

### 3.2 Prueba con cURL
Reemplaza `ENDPOINT_ID` y `API_KEY` con tus datos.

```bash
# Prueba de generación básica
curl -X POST https://api.runpod.ai/v2/TU_ENDPOINT_ID/run \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer TU_API_KEY' \
    -d '{"input":{"prompt":"Explica qué es SQL Injection"}}'
```

### 3.3 Verificar Logs
En la consola de RunPod, pestaña "Logs". Deberías ver:
1. `OllamaEngine initialized`
2. `Generating response for job_input...`
3. `llama_lora_adapter_init_internal: loaded 448 tensors` (Confirma que tu fine-tuning cargó)

---

## 🔌 Fase 4: Integración con Securetag App

### 4.1 Actualizar Variables en DigitalOcean
Conéctate a tu servidor y edita el archivo `.env`:

```bash
nano /opt/securetag/.env
```

Actualiza estas líneas:
```ini
# Configuración LLM (RunPod)
OLLAMA_HOST=https://api.runpod.ai/v2/TU_ENDPOINT_ID
RUNPOD_API_KEY=tu_api_key_real
MODEL=securetag-v1
```

### 4.2 Reiniciar Worker
Para aplicar los cambios:

```bash
docker compose restart securetag-worker
```

---

## 🐛 Solución de Problemas Comunes

### Error: `Exec format error`
*   **Causa**: Construiste la imagen en Mac sin especificar la plataforma.
*   **Solución**: Reconstruye con `docker build --platform linux/amd64 ...`.

### Error: `panic: error applying lora... flash_attn is not compatible`
*   **Causa**: Flash Attention está activado, pero no es compatible con LoRA en Ollama actual.
*   **Solución**: Asegúrate de que tu Dockerfile tenga `ENV OLLAMA_FLASH_ATTENTION=0`.

### RunPod sigue usando la versión vieja
*   **Causa**: RunPod cachea agresivamente los tags como `:latest` o `:final`.
*   **Solución**: Sube una nueva versión con un tag único (ej. `:v3`) y actualiza el endpoint.
