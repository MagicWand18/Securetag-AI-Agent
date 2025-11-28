# Guía de Despliegue - Securetag

**Versión**: 1.0  
**Última actualización**: 2025-11-28

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Despliegue Automático (CI/CD)](#despliegue-automático-cicd)
- [Despliegue Manual](#despliegue-manual)
  - [DigitalOcean](#digitalocean)
  - [RunPod (LLM)](#runpod-llm)
- [Verificación](#verificación)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Requisitos Previos

### Para Todos los Despliegues

- [ ] Cuenta de GitHub con el repositorio
- [ ] Docker y Docker Compose instalados
- [ ] Acceso a terminal/SSH

### Para Despliegue en DigitalOcean

- [ ] Cuenta de DigitalOcean
- [ ] Droplet creado (mínimo 2 vCPUs, 4 GB RAM)
- [ ] API Token de DigitalOcean
- [ ] SSH key configurado

### Para LLM en RunPod

- [ ] Cuenta de RunPod
- [ ] API Key de RunPod
- [ ] Cuenta de Docker Hub (para registry público)
- [ ] Modelo GGUF fine-tuned

---

## 🤖 Despliegue Automático (CI/CD)

### Configuración Inicial (Una sola vez)

#### 1. Configurar Secretos en GitHub

Ir a: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

**Secretos requeridos**:

```
DIGITALOCEAN_TOKEN=dop_v1_abc123...
DIGITALOCEAN_HOST=123.45.67.89
DIGITALOCEAN_USER=root
DIGITALOCEAN_SSH_KEY=-----BEGIN RSA PRIVATE KEY-----...
POSTGRES_PASSWORD=strong_password_here
RUNPOD_API_KEY=RUNPOD-ABC123...
DOCKER_HUB_USER=your_username
DOCKER_HUB_TOKEN=dckr_pat_abc123...
```

Ver [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) para detalles.

#### 2. Habilitar GitHub Actions

1. Ir a `Settings` → `Actions` → `General`
2. En "Workflow permissions", seleccionar **"Read and write permissions"**
3. Click en "Save"

#### 3. Preparar Droplet de DigitalOcean

```bash
# SSH al Droplet
ssh root@YOUR_DROPLET_IP

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose-plugin -y

# Crear directorio
mkdir -p /opt/securetag
cd /opt/securetag

# Clonar repositorio (opcional, para obtener docker-compose.yml)
git clone https://github.com/YOUR_USER/securetag-ai.git .

# Crear .env.production
cp .env.production.example .env.production
nano .env.production  # Editar con valores reales
```

### Despliegue Automático

#### Opción A: Push a Main (CI Automático)

```bash
# En tu máquina local
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

Esto automáticamente:
1. ✅ Ejecuta tests
2. ✅ Build de imágenes Docker
3. ✅ Push a GitHub Container Registry
4. ✅ Escaneo de seguridad con Trivy

#### Opción B: Despliegue Manual via GitHub Actions

1. Ir a `Actions` → `Deploy to Production`
2. Click en "Run workflow"
3. Seleccionar:
   - **Environment**: `staging` o `production`
   - **Skip health check**: `false` (recomendado)
4. Click en "Run workflow"

Esto automáticamente:
1. ✅ Despliega en DigitalOcean
2. ✅ Ejecuta health checks
3. ✅ Notifica en Slack (si configurado)

#### Opción C: Release Tag (Producción)

```bash
# Crear release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

Esto automáticamente:
1. ✅ Despliega en producción
2. ✅ Configura RunPod LLM
3. ✅ Ejecuta health checks completos

---

## 🔧 Despliegue Manual

### DigitalOcean

#### Paso 1: Preparar Droplet

```bash
# Crear Droplet en DigitalOcean Dashboard
# - Región: Closest to your users
# - Tamaño: 2 vCPUs, 4 GB RAM ($24/mes) o superior
# - Imagen: Ubuntu 22.04 LTS
# - SSH Keys: Agregar tu clave pública

# SSH al Droplet
ssh root@YOUR_DROPLET_IP

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose-plugin -y

# Verificar
docker --version
docker compose version
```

#### Paso 2: Configurar Firewall

```bash
# Permitir SSH y App
ufw allow 22/tcp
ufw allow 8080/tcp
ufw enable

# Verificar
ufw status
```

#### Paso 3: Clonar Repositorio

```bash
# Crear directorio
mkdir -p /opt/securetag
cd /opt/securetag

# Clonar (opción 1: HTTPS)
git clone https://github.com/YOUR_USER/securetag-ai.git .

# Clonar (opción 2: SSH)
git clone git@github.com:YOUR_USER/securetag-ai.git .
```

#### Paso 4: Configurar Variables de Entorno

```bash
# Copiar plantilla
cp .env.production.example .env.production

# Editar con valores reales
nano .env.production
```

Configurar:
- `DATABASE_URL` con password seguro
- `POSTGRES_PASSWORD` (mismo que DATABASE_URL)
- `OLLAMA_HOST` (RunPod endpoint o local)
- `RUNPOD_API_KEY` (si usas RunPod)

#### Paso 5: Login a GitHub Container Registry

```bash
# Crear Personal Access Token en GitHub
# Settings → Developer settings → Personal access tokens → Generate new token
# Permisos: read:packages

# Login
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

#### Paso 6: Desplegar

```bash
# Opción A: Usar script automatizado
bash scripts/deploy/digitalocean.sh production

# Opción B: Manual
docker compose pull
docker compose up -d

# Ver logs
docker compose logs -f
```

#### Paso 7: Verificar

```bash
# Health check
bash scripts/health-check.sh

# O manual
curl http://localhost:8080/healthz
```

---

### RunPod (LLM)

#### Paso 1: Preparar Modelo

```bash
# En tu máquina local
cd /path/to/securetag-ai

# Verificar que tienes:
ls -lh Mixtral_AI_CyberCoder_7b.Q4_K_M.gguf  # Modelo GGUF
ls -lh Modelfile  # Configuración Ollama
```

#### Paso 2: Configurar Docker Hub

```bash
# Login a Docker Hub
docker login

# Verificar
docker info | grep Username
```

#### Paso 3: Ejecutar Script de Despliegue

```bash
# Configurar variables
export RUNPOD_API_KEY="your_runpod_api_key"
export DOCKER_HUB_USER="your_dockerhub_username"
export DOCKER_HUB_TOKEN="your_dockerhub_token"

# Ejecutar despliegue
bash scripts/deploy/runpod.sh
```

Esto automáticamente:
1. ✅ Build de imagen Docker con Ollama + modelo
2. ✅ Push a Docker Hub
3. ✅ Crea endpoint serverless en RunPod
4. ✅ Configura auto-scaling
5. ✅ Prueba el endpoint

#### Paso 4: Obtener Endpoint URL

```bash
# El script genera runpod-config.json
cat runpod-config.json
```

Output:
```json
{
  "endpoint_id": "abc123xyz",
  "endpoint_url": "https://api.runpod.ai/v2/abc123xyz",
  "model": "securetag-ai-agent:finetuned",
  "created_at": "2025-11-28T17:00:00Z"
}
```

#### Paso 5: Configurar en DigitalOcean

```bash
# SSH al Droplet
ssh root@YOUR_DROPLET_IP

# Editar .env.production
cd /opt/securetag
nano .env.production
```

Agregar:
```bash
OLLAMA_HOST=https://api.runpod.ai/v2/abc123xyz
RUNPOD_API_KEY=your_runpod_api_key
MODEL=securetag-ai-agent:finetuned
```

```bash
# Reiniciar servicios
docker compose restart securetag-app securetag-worker
```

---

## ✅ Verificación

### Health Checks Automáticos

```bash
# En el Droplet
cd /opt/securetag
bash scripts/health-check.sh
```

Output esperado:
```
================================================
  Securetag Health Check
================================================

1. Verificando servicios Docker...
[✓] Servicios corriendo: 4/4

2. Verificando PostgreSQL...
[✓] PostgreSQL está listo

3. Verificando Securetag App...
[✓] App health check: OK
   Response: {"ok":true,"status":"healthy"}

4. Verificando Worker...
[✓] Worker sin errores aparentes

5. Verificando Ollama LLM...
[✓] Ollama configurado en RunPod (externo)

6. Verificando uso de recursos...
[✓] Uso de memoria:
CONTAINER           MEM USAGE
securetag-app       256MiB / 4GiB
securetag-worker    512MiB / 4GiB
securetag-db        128MiB / 4GiB

7. Verificando red Docker...
[✓] Red securetag-net activa con 4 contenedores

================================================
✅ Todos los health checks pasaron
================================================
```

### Pruebas Manuales

#### Test de API

```bash
# Health endpoint
curl http://YOUR_DROPLET_IP:8080/healthz

# Upload de código para análisis
curl -X POST http://YOUR_DROPLET_IP:8080/codeaudit/upload \
  -F "file=@test.zip" \
  -F "profile=auto"
```

#### Test de LLM (RunPod)

```bash
# Test directo a RunPod
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer YOUR_RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "What is SQL injection?",
      "model": "securetag-ai-agent:finetuned"
    }
  }'
```

---

## 🐛 Troubleshooting

### Problema: Servicios no inician

**Síntomas**:
```bash
docker compose ps
# Muestra servicios en estado "Exited" o "Restarting"
```

**Solución**:
```bash
# Ver logs
docker compose logs securetag-app
docker compose logs securetag-worker

# Verificar .env
cat .env.production

# Reiniciar
docker compose down
docker compose up -d
```

---

### Problema: Database connection failed

**Síntomas**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solución**:
```bash
# Verificar que DB está corriendo
docker compose ps securetag-db

# Verificar que DB está listo
docker compose exec securetag-db pg_isready -U securetag

# Verificar DATABASE_URL en .env
grep DATABASE_URL .env.production

# Reiniciar DB
docker compose restart securetag-db
```

---

### Problema: Ollama/LLM no responde

**Síntomas**:
```
Error: ECONNREFUSED connecting to Ollama
```

**Solución para RunPod**:
```bash
# Verificar endpoint
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/health" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Verificar variables en .env
grep OLLAMA_HOST .env.production
grep RUNPOD_API_KEY .env.production

# Verificar que endpoint está activo en RunPod dashboard
```

**Solución para Ollama local**:
```bash
# Verificar servicio
docker compose ps ollama

# Verificar que modelo está cargado
docker compose exec ollama ollama list

# Reiniciar
docker compose restart ollama
```

---

### Problema: CI/CD falla en GitHub Actions

**Síntomas**:
```
Error: Process completed with exit code 1
```

**Solución**:
```bash
# Verificar secretos configurados
gh secret list

# Verificar permisos de workflow
# Settings → Actions → General → Workflow permissions
# Debe estar en "Read and write permissions"

# Ver logs detallados en GitHub Actions tab
```

---

### Problema: Out of memory

**Síntomas**:
```
docker compose logs
# Muestra "Killed" o "OOMKilled"
```

**Solución**:
```bash
# Verificar uso de memoria
docker stats

# Aumentar tamaño del Droplet en DigitalOcean
# O agregar límites en docker-compose.yml:
```

```yaml
services:
  securetag-worker:
    # ...
    deploy:
      resources:
        limits:
          memory: 2G
```

---

## 📊 Monitoreo

### Logs en Tiempo Real

```bash
# Todos los servicios
docker compose logs -f

# Servicio específico
docker compose logs -f securetag-app

# Últimas 100 líneas
docker compose logs --tail=100
```

### Métricas de Recursos

```bash
# Uso actual
docker stats

# Espacio en disco
df -h
docker system df
```

### Limpieza

```bash
# Limpiar imágenes antiguas
docker system prune -a

# Limpiar volúmenes no usados
docker volume prune
```

---

## 🔄 Actualización

### Actualizar a Nueva Versión

```bash
# SSH al Droplet
ssh root@YOUR_DROPLET_IP
cd /opt/securetag

# Pull de cambios
git pull origin main

# Rebuild y restart
docker compose pull
docker compose up -d --force-recreate

# Verificar
bash scripts/health-check.sh
```

---

## 📚 Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [DigitalOcean Droplets](https://docs.digitalocean.com/products/droplets/)
- [RunPod Documentation](https://docs.runpod.io/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md)

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisar logs: `docker compose logs -f`
2. Ejecutar health checks: `bash scripts/health-check.sh`
3. Consultar [Troubleshooting](#troubleshooting)
4. Abrir issue en GitHub con logs completos
