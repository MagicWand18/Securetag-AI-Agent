✅ Checklist de Ciberseguridad para el SaaS de SAST en DigitalOcean + Cloudflare


⸻

🛡️ 1. Configuración de Cloudflare (Perímetro, DNS, WAF)

1.1 DNS y Ruteo Seguro
	•	Crear subdominio para la API (api.tu-dominio.com) en Cloudflare.
	•	Registro DNS tipo A → IP pública del droplet.
	•	Asegurar que el proxy está activado (nube naranja).
	•	Forzar HTTPS Only desde Cloudflare.
	•	Habilitar Always Use HTTPS y HSTS.

⸻

1.2 Reglas del WAF
	•	Activar WAF estándar.
	•	Habilitar reglas OWASP ModSecurity.
	•	Activar:
	•	Bloqueo automático de bots.
	•	Filtrado de ataques comunes (SQLi, XSS, RCE).
	•	Crear reglas personalizadas:
	•	Bloquear payloads sospechosos en parámetros.
	•	Bloquear peticiones con cmd, bash, powershell, etc.
	•	Bloquear accesos directos a los endpoints administrativos.

⸻

1.3 DDoS y Rate Limit en Cloudflare
	•	Activar protección DDoS nivel 7.
	•	Crear reglas de Rate Limit:
	•	/health → máx. 100 req/min
	•	Endpoints estándar → máx. 30–60 req/min
	•	/upload ZIP → máx. 5 req/min
	•	Endpoints de administración → máx. 5 req/min

⸻

🛠️ 2. Seguridad del Droplet (SO / Red / SSH)

2.1 Sistema Operativo
	•	Ejecutar actualizaciones periódicas:

apt update && apt upgrade -y


	•	Usar solo SSH por claves, no contraseñas.
	•	Deshabilitar root login.
	•	Activar firewall UFW con reglas mínimas:
	•	Permitir SSH
	•	Permitir puertos Cloudflare (80/443)
	•	Bloquear todo lo demás

⸻

2.2 Seguridad de Red
	•	Postgres no debe estar expuesto a Internet.
	•	Permitir acceso a Postgres solo dentro del Docker network.
	•	Bloquear acceso al droplet desde cualquier IP que no sea de Cloudflare.
	•	Mantener lista actualizada de IP ranges de Cloudflare:
https://www.cloudflare.com/ips/

⸻

🐳 3. Seguridad en Docker y Contenedores

3.1 Imágenes y Dependencias
	•	Usar imágenes oficiales o minimalistas (python:slim, alpine).
	•	Ejecutar scanners:
	•	Trivy
	•	Dockle
	•	Mantener las imágenes actualizadas.

⸻

3.2 Redes y Aislamiento
	•	Crear una Docker Network interna para todos los contenedores.
	•	Exponer solo el contenedor del API al exterior.
	•	Postgres solo accesible dentro de la red interna.
	•	No usar --privileged en ningún contenedor.

⸻

🔐 4. API Keys y Gestión de Secretos

4.1 Almacenamiento Seguro
	•	Guardar API keys cifradas en Postgres (pgcrypto o AES).
	•	NO guardar secretos en código fuente o repos.
	•	Usar variables de entorno o Docker secrets.

⸻

4.2 Políticas de Rotación y Auditoría
	•	Rotar API keys periódicamente.
	•	Registrar en logs:
	•	Creación de API keys
	•	Uso de API keys
	•	Intentos fallidos

⸻

🚦 5. Rate Limiting Interno (Backend)

Cloudflare ayuda, pero no confíes solo en él. Implementa rate limiting dentro de tu API.

Ejemplos (ajustables):

Endpoint	Límite
/health	50–100 req/min
Endpoints estándar	30–60 req/min
/upload (ZIP)	5 req/min
Endpoints administrativos	5 req/min

Recomendaciones por stack:
	•	FastAPI → slowapi
	•	Node/Express → express-rate-limit
	•	Django/DRF → Throttling

⸻

📦 6. Manejo Seguro de ZIP con Código Fuente (SAST)

6.1 Validaciones Iniciales (sin descomprimir)
	•	Validar que realmente sea ZIP (MIME + cabecera).
	•	Límite de tamaño (20–50 MB sugerido).
	•	Límite de número de archivos (< 10,000).
	•	Detectar ZIP bombs (compresión anómala).
	•	No descomprimir todavía.

⸻

6.2 Filtro de Extensiones Permitidas

Extensiones permitidas (código y texto):
	•	.py, .js, .ts, .java, .go, .rs, .php, .rb, .cs, .c, .cpp, .h, .swift
	•	.json, .yml, .yaml, .xml, .html, .css, .md, .txt
	•	Scripts de build/config: Dockerfile, Makefile, .env (opcional)

Extensiones bloqueadas:
	•	Ejecutables/binarios: .exe, .dll, .so, .dylib, .sys, .bin
	•	Scripts de sistema: .bat, .cmd, .ps1, .vbs
	•	Imágenes de disco: .iso, .img
	•	ZIPs anidados: .zip, .rar, .7z dentro del ZIP

Política: Si se detecta una extensión bloqueada → rechazar el ZIP o marcarlo como “requiere revisión manual”.

⸻

6.3 Análisis del ZIP Completo con VirusTotal
	•	Obtener SHA-256 del ZIP.
	•	Consultar hash en VirusTotal (si existe → más rápido).
	•	Si no existe → subir ZIP completo.
	•	Reglas de decisión:

Si 0 motores lo marcan → Aceptar (si también pasó filtros de extensiones).
Si <= 5% de motores desconocidos lo marcan → Aceptar con advertencia.
Si motores reputados (Microsoft, Kaspersky, etc.) detectan malware → Rechazar.


⸻

6.4 Descompresión Segura (si pasó todo lo anterior)
	•	Usar directorio temporal aislado.
	•	Validar rutas para evitar ZipSlip:
	•	Rechazar rutas con “../”
	•	Rechazar rutas absolutas (/ o C:)
	•	Descomprimir sin ejecutar nada.

⸻

6.5 Consideraciones de Privacidad
	•	VirusTotal comparte archivos con la comunidad.
	•	Para clientes enterprise:
	•	Ofrecer opción sin VirusTotal
	•	Usar ClamAV + YARA local

⸻

6.6 Logging específico del ZIP
	•	ID del usuario o API key.
	•	SHA-256 del ZIP.
	•	Resultado del análisis (aceptado/rechazado).
	•	Motivo (VT detection, extensión bloqueada, etc.).

⸻

📊 7. Logging y Monitoreo

7.1 Log de operaciones
	•	Registrar:
	•	Método + endpoint
	•	Usuario / API key
	•	Tiempos de respuesta
	•	Errores 4xx / 5xx
	•	Intentos de acceso indebido
	•	Guardar logs mínimo 30 días.

⸻

7.2 Monitoreo y Alertas
	•	Prometheus + Grafana
	•	Loki o ELK stack
	•	Alertas por:
	•	Subidas de archivos sospechosos
	•	Uso masivo de una API key
	•	Errores repetitivos
	•	Rechazos de VirusTotal

⸻

🧱 8. Seguridad del Código y la API
	•	Validar y sanitizar todos los inputs.
	•	Usar roles y permisos mínimos.
	•	Evitar ejecutar cualquier contenido del ZIP.
	•	Proteger Swagger (idealmente con autenticación).
	•	Deshabilitar endpoints en desuso.
	•	Revisar dependencias vulnerables con SCA.

⸻

💾 9. Backups y Recuperación
	•	Configurar backups automáticos de Postgres.
	•	Mantener al menos 7–30 días de retención.
	•	Guardar backups cifrados.
	•	Probar restauraciones periódicas.

⸻

🧩 10. Hardening Adicional (Opcional pero Recomendado)
	•	Instalar CrowdSec.
	•	Separar redes internas/externas en Docker.
	•	Forzar TLS moderno: TLS 1.2+
	•	Añadir headers de seguridad:
	•	X-Content-Type-Options: nosniff
	•	Strict-Transport-Security
	•	Content-Security-Policy


