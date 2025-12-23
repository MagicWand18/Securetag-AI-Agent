Walkthrough: Primer Despliegue en DigitalOcean
Fecha: 2025-11-28
Objetivo: Desplegar Securetag en DigitalOcean paso a paso
Tiempo estimado: 30-45 minutos

📋 Checklist Previo
Antes de comenzar, verifica que tienes:

 Cuenta de DigitalOcean activa
 Cuenta de DigitalOcean ligada a GitHub
 Repositorio en GitHub
 Tarjeta de crédito en DigitalOcean (para crear Droplet)
🎯 Fase 1: Crear Droplet en DigitalOcean


Paso 1.1: Crear Droplet
Ve a DigitalOcean Dashboard
Click en "Create" → "Droplets"
Configura el Droplet:
Imagen:

Selecciona: Ubuntu 22.04 LTS
Plan:

Tipo: Basic
CPU: Regular (Disk type: SSD)
Tamaño: $24/mo (2 vCPUs, 4 GB RAM, 80 GB SSD)
Para staging/pruebas: $24/mo es suficiente
Para producción: considera $48/mo (4 vCPUs, 8 GB RAM)
Región:

Selecciona la más cercana a tus usuarios
Recomendado: New York 1 o San Francisco 3
Autenticación:

Selecciona: SSH keys
Click en "New SSH Key"



Paso 1.2: Generar SSH Key (si no tienes una)
Abre tu terminal local y ejecuta:

# Generar nueva SSH key
master@MacBook-Pro-3 Securetag Agent % ssh-keygen
Generating public/private ed25519 key pair.
Enter file in which to save the key (/Users/master/.ssh/id_ed25519): 
/Users/master/.ssh/id_ed25519 already exists.
Overwrite (y/n)? y
Enter passphrase for "/Users/master/.ssh/id_ed25519" (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in /Users/master/.ssh/id_ed25519
Your public key has been saved in /Users/master/.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:eYfk6yf2o3SVBfE72wVTnI4CtmGvQfIW/QqtDk19YLo master@MacBook-Pro-3.local
# Presiona Enter para todo (sin passphrase para automatización)
# Copiar clave pública
cat ~/.ssh/securetag_deploy.pub
Copia todo el contenido que empieza con ssh-rsa...


Paso 1.3: Agregar SSH Key a DigitalOcean
En la ventana de crear Droplet, pega la clave pública
Dale un nombre: "Securetag Deploy Key"
Click en "Add SSH Key"
Paso 1.4: Finalizar Creación
Hostname:

Nombre: securetag-production (o securetag-staging)
Tags (opcional):

securetag, production
Backups (opcional pero recomendado):

Habilitar backups automáticos (+20% del costo)
Click en "Create Droplet"

⏱️ Espera 1-2 minutos mientras se crea el Droplet.

Paso 1.5: Obtener IP del Droplet
Una vez creado, verás:

IP Address: 123.45.67.89 ← Copia esta IP







🔑 Fase 2: Configurar Secretos en GitHub

Paso 2.1: Obtener API Token de DigitalOcean
En DigitalOcean, ve a API (menú izquierdo)
Click en "Generate New Token"
Configuración:
Token name: Securetag CI/CD
Expiration: 90 days (o No expiry)
Scopes: Selecciona Read y Write
Click en "Generate Token"
Copia el token inmediatamente (solo se muestra una vez)
Ejemplo: dop_v1_abc123def456...

Paso 2.2: Configurar Secretos en GitHub
Ve a tu repositorio en GitHub
Click en Settings → Secrets and variables → Actions
Click en "New repository secret"
Agrega los siguientes secretos uno por uno:

Secreto 1: DIGITALOCEAN_TOKEN
Name: DIGITALOCEAN_TOKEN
Secret: Pega el token de DigitalOcean
Click "Add secret"
Secreto 2: DIGITALOCEAN_HOST
Name: DIGITALOCEAN_HOST
Secret: Pega la IP del Droplet (ej: 123.45.67.89)
Click "Add secret"
Secreto 3: DIGITALOCEAN_USER
Name: DIGITALOCEAN_USER
Secret: root
Click "Add secret"
Secreto 4: DIGITALOCEAN_SSH_KEY
Name: DIGITALOCEAN_SSH_KEY
Secret: Copia la clave privada
# En tu terminal local
cat ~/.ssh/securetag_deploy
Copia TODO el contenido, incluyendo:

-----BEGIN OPENSSH PRIVATE KEY-----
...todo el contenido...
-----END OPENSSH PRIVATE KEY-----
Click "Add secret"
Secreto 5: POSTGRES_PASSWORD
Name: POSTGRES_PASSWORD
Secret: Genera un password seguro
# Generar password
openssl rand -base64 32
Copia el resultado y pégalo como secreto.








🛠️ Fase 3: Preparar Droplet
Paso 3.1: Conectarse al Droplet
# Si usaste la llave por defecto (id_ed25519 o id_rsa):
ssh root@TU_IP_DEL_DROPLET
# Si creaste una llave específica (ej: securetag_deploy):
ssh -i ~/.ssh/id_ed25519 root@143.198.61.64
IMPORTANT

Asegúrate de usar la misma llave privada que corresponde a la clave pública que subiste a DigitalOcean. Si generaste id_ed25519, usa esa.

Si te pregunta "Are you sure you want to continue connecting?", escribe yes.

Paso 3.2: Actualizar Sistema
# Actualizar paquetes
apt update && apt upgrade -y
⏱️ Esto puede tomar 2-5 minutos.
apt install -y jq

Paso 3.3: Instalar Docker
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
# Verificar instalación
docker --version
Deberías ver: Docker version 24.x.x

Paso 3.4: Instalar Docker Compose
# Instalar Docker Compose plugin
apt install docker-compose-plugin -y
# Verificar
docker compose version
Deberías ver: Docker Compose version v2.x.x

Paso 3.5: Configurar Firewall
# Permitir SSH
ufw allow 22/tcp
# Permitir App
ufw allow 8080/tcp
# Habilitar firewall
ufw --force enable
# Verificar
ufw status
Paso 3.6: Crear Directorio de Despliegue
# Crear directorio
mkdir -p /opt/securetag
cd /opt/securetag
# Clonar repositorio
git clone https://github.com/TU_USUARIO/securetag-ai.git .
Reemplaza TU_USUARIO con tu usuario de GitHub.

Si el repositorio es privado:

# Usar token de GitHub
git clone https://TU_TOKEN@github.com/TU_USUARIO/securetag-ai.git .








📝 Fase 4: Configurar Variables de Entorno

Paso 4.1: Crear .env.production
# Copiar plantilla
cp .env.production.example .env.production
# Editar archivo
nano .env.production


Paso 4.2: Configurar Variables
Edita el archivo con estos valores:

# CORE
NODE_ENV=production
PORT=8080
# DATABASE
# Usa el password que generaste en GitHub Secrets
DATABASE_URL=postgres://securetag:u9blh79e7Gb1Sp/YVd92RzCjRnn8Z4YcHIKTAKX3KjM=@securetag-db:5432/securetag
POSTGRES_DB=securetag
POSTGRES_USER=securetag
POSTGRES_PASSWORD=u9blh79e7Gb1Sp/YVd92RzCjRnn8Z4YcHIKTAKX3KjM=
# TENANT
TENANT_ID=production
WORKER_API_KEY=8bf16ddbdadb444be019591d5b0653e6919fa8436dfa2fb23b7c9c17f453f2cd

# STORAGE
DB_DIR=/var/securetag/production/db
UPLOADS_DIR=/var/securetag/production/uploads
WORK_DIR=/var/securetag/production/work
RESULTS_DIR=/var/securetag/production/results
# Runpod LLM Configuration
RUNPOD_ENDPOINT_ID=1z7edlh6wl4r49
RUNPOD_API_KEY=rpa_API_KEY
OLLAMA_HOST=https://api.runpod.ai/v2/1z7edlh6wl4r49
MODEL=securetag-v1
# SEMGREP (opcional)
SEMGREP_HAS_SHOWN_METRICS_NOTIFICATION=true
# LOGGING
LOG_LEVEL=info
LOOP_MODE=true
# VIRUSTOTAL (opcional)
VIRUSTOTAL_API_KEY=b72669becf317999ee8ba89ba61d5a5c81652315a500e5c09dbbf756ef05487e
# Number of malicious votes to trigger a block (0 = Strict, 2 = Lenient)
VIRUSTOTAL_MALICIOUS_THRESHOLD=0
# Rate Limiting Configuration
# Maximum number of requests per minute per IP
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Strict limits for sensitive endpoints (e.g. uploads)
RATE_LIMIT_UPLOAD_MAX=5
# Security Ban Configuration
# Duration in hours to ban an IP after malicious activity (default: 24)
SECURITY_BAN_DURATION_HOURS=24
# Enable permanent bans (0 = false, 1 = true)
SECURITY_BAN_PERMANENT_ENABLED=0
# Also ban the API Key used (0 = false, 1 = true)
SECURITY_BAN_APIKEY_ENABLED=1
# Also ban the Tenant (0 = false, 1 = true) - USE WITH CAUTION
SECURITY_BAN_TENANT_ENABLED=0



Presiona Ctrl + X
Presiona Y
Presiona Enter



Paso 4.3: Crear Directorios de Datos
# Crear estructura de directorios
mkdir -p data/production/{db,uploads,work,results}
mkdir -p data/postgres
# Verificar
ls -la data/







🚀 Fase 5: Primer Despliegue (Manual)
Nota: Como es el primer despliegue y las imágenes aún no existen en el registro, construiremos todo localmente en el servidor.

Paso 5.1: Configurar Entorno
# Copiar configuración de producción
cp .env.production .env

# Generar y configurar WORKER_API_KEY (Crucial para que el worker funcione)
# Genera un hash aleatorio
openssl rand -hex 32
# Copia el resultado y agrégalo al final del archivo .env
nano .env
# Agrega al final:
# WORKER_API_KEY=tu_hash_generado_aqui

Paso 5.2: Construir y Desplegar
# Construir imágenes y levantar servicios
docker compose up -d --build

⏱️ Esto tomará 5-10 minutos (descarga de base images y compilación).

Verás output como:
[+] Building ... FINISHED
[+] Running 4/4
 ✔ Network securetag-net       Created
 ✔ Container securetag-db      Healthy
 ✔ Container securetag-app     Started
 ✔ Container securetag-worker  Started







✅ Fase 6: Inicializar Base de Datos
Este paso es crítico. El script `init-db.sh` configura el esquema, las tablas y la autenticación del worker.

Paso 6.1: Ejecutar Script de Inicialización
# El script ahora carga automáticamente las variables del .env
bash scripts/init-db.sh

# Si sale error:
[WARN] Base de datos ya está inicializada (6 tablas encontradas)
¿Deseas reinicializar? (esto BORRARÁ todos los datos) [y/N]: Y

Verás output como:
[INFO] Cargando variables desde .env...
[INFO] Inicializando base de datos PostgreSQL...
[INFO] Aplicando: 003_auth_multitenancy.sql
[INFO] Aplicando: 004_create_tasks.sql
[INFO] Detectada WORKER_API_KEY en entorno. Configurando...
[INFO] ✅ Worker API Key configurada exitosamente
[INFO] ✅ Inicialización de base de datos completada

> **Nota Importante**: El script ahora **siempre actualiza** la API Key del worker si detecta `WORKER_API_KEY` en el `.env`, incluso si ya existe una llave anterior. Esto garantiza que el hash en la DB siempre coincida con el valor actual del `.env`.

Paso 6.2: Verificar Tablas (Opcional)
# Conectarse a la DB
docker compose exec securetag-db psql -U securetag -d securetag -c "\dt securetag.*"

Deberías ver tablas como: api_key, finding, scan_result, task, tenant, tool_execution.





✅ Fase 7: Verificación Final
Paso 7.1: Verificar Logs del Worker
# El worker debe estar "idle" y sin errores 401/503
docker compose logs -f securetag-worker

Deberías ver:
{"ok":true,"idle":true,"tenant":"production"}

Paso 7.2: Health Check General
bash scripts/health-check.sh

Paso 7.3: Probar API desde Internet
curl http://TU_IP_DEL_DROPLET:8080/healthz
Debe responder: {"ok":true}





📊 Fase 8: Monitoreo
Paso 8.1: Ver Logs
# Logs en tiempo real
docker compose logs -f
# Solo App
docker compose logs -f securetag-app
# Últimas 100 líneas
docker compose logs --tail=100

Paso 8.2: Ver Recursos
# Uso de recursos
docker stats
# Espacio en disco
df -h
🎉 ¡Despliegue Completado!
Tu aplicación está corriendo en:

API: http://TU_IP:8080
Health: http://TU_IP:8080/healthz








Próximos Pasos

1. Configurar Dominio (opcional):
Apuntar tu dominio a la IP del Droplet
Configurar Nginx como reverse proxy
Habilitar HTTPS con Let's Encrypt

2. Configurar RunPod (para LLM en producción):
Seguir guía en 
docs/LLM_Infrastructure_Research.md
Ejecutar 
scripts/deploy/runpod.sh

3. Habilitar CI/CD Automático:
Hacer push a main para trigger automático
O usar workflow manual en GitHub Actions







🐛 Troubleshooting
Problema: No puedo conectarme por SSH
# Verificar que la IP es correcta
ping TU_IP
# Verificar que la SSH key es correcta
ssh -i ~/.ssh/securetag_deploy -v root@TU_IP
Problema: Docker no descarga imágenes
# Verificar login a registry
docker login ghcr.io
# Pull manual
docker pull ghcr.io/TU_USUARIO/securetag-ai/securetag-app:latest
Problema: Servicios no inician
# Ver logs de error
docker compose logs
# Reiniciar servicios
docker compose down
docker compose up -d
Problema: Health check falla
# Verificar que .env.production está correcto
cat .env.production
# Verificar DATABASE_URL
grep DATABASE_URL .env.production
# Reiniciar
docker compose restart









📞 Soporte
Si tienes problemas:

Revisa los logs: docker compose logs -f
Ejecuta health check: bash scripts/health-check.sh
Consulta 
docs/DEPLOYMENT_GUIDE.md
Abre un issue en GitHub con los logs
📝 Checklist Final
 Droplet creado en DigitalOcean
 SSH keys configuradas
 Secretos configurados en GitHub
 Docker y Docker Compose instalados
 Firewall configurado
 Repositorio clonado
 .env.production configurado
 Despliegue ejecutado exitosamente
 Health checks pasando
 API accesible desde internet
 Base de datos inicializada
¡Felicidades por tu primer despliegue! 🚀



# Actualizaciones y redespliegues en digitalocean
Para actualizar DigitalOcean con los cambios, NO es automático. Necesitas hacer un pull manual en el servidor. Aquí están los pasos:

Actualizar DigitalOcean con los Cambios
Desde tu terminal SSH que ya tienes abierta:

ssh -i ~/.ssh/id_ed25519 root@143.198.61.64

# 1. Ir al directorio del proyecto
cd /opt/securetag

# 2. Hacer pull de los cambios
git pull origin main
scp -i ~/.ssh/id_ed25519 .env root@143.198.61.64:/opt/securetag/.env

# 3. Ajustar permisos (CRÍTICO para evitar errores EACCES)
# Asegura que el usuario del contenedor (1001) pueda escribir en data y rules
chown -R 1001:1001 /opt/securetag/data

# 4. Reconstruir las imágenes Docker con el código actualizado (3-5 minutos)
docker compose down 
docker system prune -a -f
docker compose build --no-cache && docker compose up -d

# 5. Verificar que todo esté corriendo
docker compose ps
docker compose logs --tail=20 securetag-worker