# Guía de Integración: DigitalOcean + RunPod

**Objetivo**: Conectar el Worker desplegado en DigitalOcean con el servicio LLM en RunPod Serverless para análisis de hallazgos de seguridad.

---

## 📋 Prerrequisitos

- [x] Droplet de DigitalOcean con Securetag desplegado
- [x] Endpoint de RunPod activo con el modelo `securetag-v1`
- [x] Credenciales de RunPod:
  - Endpoint ID: `1z7edlh6wl4r49`
  - API Key: `rpa_YOUR_RUNPOD_API_KEY_HERE`

---

## 🔄 Flujo de Análisis

```
1. Usuario sube código → DigitalOcean (App)
2. Worker ejecuta Semgrep → Genera hallazgos
3. Para cada hallazgo:
   a. Worker envía hallazgo a RunPod
   b. RunPod encola job (status: IN_QUEUE)
   c. Worker hace polling cada 3s
   d. RunPod completa análisis (status: COMPLETED)
   e. Worker recibe recomendación del LLM
4. Worker guarda resultados en BD
```

---

## 🔗 Fase 1: Configurar Variables de Entorno

### Paso 1.1: Conectarse al Servidor

```bash
ssh -i ~/.ssh/id_ed25519 root@143.198.61.64
cd /opt/securetag
```

### Paso 1.2: Agregar Variables de RunPod

```bash
cat >> .env << 'EOF'

# RunPod LLM Configuration
RUNPOD_ENDPOINT_ID=1z7edlh6wl4r49
RUNPOD_API_KEY=rpa_YOUR_RUNPOD_API_KEY_HERE
OLLAMA_HOST=https://api.runpod.ai/v2/1z7edlh6wl4r49
MODEL=securetag-v1
EOF
```

### Paso 1.3: Verificar Variables

```bash
tail -6 .env
```

---

## 🔄 Fase 2: Reconstruir y Reiniciar Worker

El Worker necesita recompilarse con el código actualizado de `LLMClient.ts`.

### Paso 2.1: Reconstruir Imagen

```bash
# Desde tu máquina local
cd /Users/master/Downloads/Securetag\ Agent
docker build -t securetag-worker:latest -f Dockerfile.worker .
docker tag securetag-worker:latest ghcr.io/TU_USUARIO/securetag-worker:latest
docker push ghcr.io/TU_USUARIO/securetag-worker:latest
```

### Paso 2.2: Actualizar en el Servidor

```bash
# En el servidor DigitalOcean
docker compose pull securetag-worker
docker compose restart securetag-worker
```

---

## ✅ Fase 3: Verificar Integración

### Paso 3.1: Probar Conexión Manual

```bash
curl -X POST https://api.runpod.ai/v2/1z7edlh6wl4r49/run \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer rpa_YOUR_RUNPOD_API_KEY_HERE' \
  -d '{"input":{"prompt":"Test"}}'
```

Deberías recibir: `{"id":"...", "status":"IN_QUEUE"}`

### Paso 3.2: Verificar Logs del Worker

```bash
docker compose logs -f securetag-worker
```

Busca líneas que indiquen:
- `Analyzing finding with LLM...`
- `RunPod job ... completed`

---

## 🧪 Fase 4: Prueba End-to-End

### Paso 4.1: Subir Código con Vulnerabilidad

Desde tu máquina local, crea un archivo de prueba:

```bash
# Crear archivo vulnerable
cat > test.php << 'EOF'
<?php
$id = $_GET['id'];
$query = "SELECT * FROM users WHERE id = '$id'";
mysqli_query($conn, $query);
?>
EOF

# Crear ZIP
zip test.zip test.php
```

### Paso 4.2: Enviar para Análisis

```bash
curl -X POST http://143.198.61.64:8080/codeaudit/upload \
  -H "x-api-key: TU_WORKER_API_KEY" \
  -F "file=@test.zip" \
  -F "profile=auto"
```

### Paso 4.3: Verificar que RunPod Analizó

```bash
# En el servidor
docker compose logs securetag-worker | grep -A 5 "RunPod"
```

Deberías ver:
1. Job submission con ID
2. Polling attempts
3. Job completed
4. LLM recommendation recibida

---

## 🐛 Troubleshooting

### Error: "RunPod did not return a job ID"

**Solución**: Verifica que `RUNPOD_API_KEY` es correcta.

### Error: "RunPod job timed out"

**Causa**: El modelo está tardando más de 60s en responder.

**Solución**: Aumenta `maxAttempts` en `LLMClient.ts` o verifica que el endpoint de RunPod está activo.

### El Worker no detecta RunPod

**Solución**: Verifica que `OLLAMA_HOST` contiene `runpod.ai`:
```bash
docker compose exec securetag-worker printenv OLLAMA_HOST
```

---

## 📊 Monitoreo

### Costos Estimados

Con ~100 análisis/día (asumiendo 5 hallazgos por análisis = 500 llamadas LLM):
- **Costo por request**: ~$0.001-0.002
- **Costo diario**: ~$0.50-1.00
- **Costo mensual**: ~$15-30

### Logs de RunPod

Ve a [RunPod Analytics](https://www.runpod.io/console/serverless) para monitorear:
- Requests totales
- Tiempo promedio de ejecución
- Costos acumulados

---

## ✅ Checklist Final

- [ ] Variables de entorno agregadas
- [ ] Worker reconstruido con código actualizado
- [ ] Worker reiniciado
- [ ] Conexión manual a RunPod exitosa
- [ ] Prueba end-to-end completada
- [ ] Logs muestran análisis LLM de hallazgos

¡Integración completada! 🚀
