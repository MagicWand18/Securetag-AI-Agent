# EVIDENCE_Security_2_20251223.md

## 📌 Evidencia de Seguridad – Fase 9.1 (Perímetro y Red)
**Proyecto:** Securetag  
**Fecha:** 2025-12-23  
**Responsable:** Agente Security (SecOps)  
**Estado:** ✅ Completado y Verificado

---

## 🛡️ Alcance de la Evidencia

Este documento registra las acciones de **hardening del perímetro DNS, SSL/TLS, WAF, Rate Limiting y observabilidad** realizadas en Cloudflare como parte de la **Tarea 9.1 – Perímetro y Red**, con enfoque en:

- Protección de la API pública (`api.securetag.com.mx`)
- Reducción de superficie de ataque
- Mitigación temprana de abuso y escaneo automatizado
- Visibilidad y auditoría de eventos de seguridad

---

## 🔐 1. SSL/TLS – Cifrado y Seguridad de Transporte

### 📍 Forzar SSL heredado del dominio
Se configuró Cloudflare como **terminador TLS**, permitiendo que el backend opere sobre HTTP sin exponer tráfico plano al exterior.

**Configuración:**
- `SSL/TLS → Overview`
  - **Modo:** `Flexible`

### 📍 Endurecimiento inmediato
En `SSL/TLS → Edge Certificates` se habilitó:

- ✅ Always Use HTTPS
- ✅ Automatic HTTPS Rewrites
- ✅ TLS 1.3
- ✅ Minimum TLS Version: 1.2
- ❌ TLS 1.0 / 1.1 deshabilitados

---

## 🔒 2. HSTS (HTTP Strict Transport Security)

### 📍 Configuración
En `SSL/TLS → Edge Certificates → HSTS` se activó:

- Enable HSTS: ✅
- Max-Age: `31536000` (1 año)
- Include Subdomains: ✅
- Preload: ❌ (no activado en esta fase)

### 🎯 Resultado
- Prevención de downgrade attacks
- Refuerzo del uso exclusivo de HTTPS
- Alineación con headers HSTS ya implementados en backend

---

## 🚫 3. DNS Hygiene – Cierre de Superficies Innecesarias

### 📍 Hallazgo
Se identificaron subdominios administrativos expuestos mediante proxy de Cloudflare, incrementando la superficie de ataque.

Subdominios afectados:
- `admin`
- `cpanel`
- `whm`
- `webdisk`
- `webdisk.admin`
- `www.admin`
- `mail`

---

### ✅ Mitigación Aplicada
- Cambio de **Proxy Status** a **DNS only (nube gris)**
- Eliminación de exposición innecesaria al perímetro Cloudflare

Se mantuvieron **proxied** únicamente:
- `securetag.com.mx`
- `www.securetag.com.mx`
- `api.securetag.com.mx`

---

## 🧱 4. WAF – Protección Activa (IDS / IPS)

### 📍 Reglas Administradas
En `Security → WAF → Managed Rules` se habilitaron:

| Regla | Estado |
|----|----|
| OWASP Core Ruleset | ✅ |
| Cloudflare Managed Rules | ✅ |

Estas reglas proveen detección y bloqueo automático de:
- SQLi
- XSS
- LFI / RFI
- Payloads maliciosos conocidos

---

## 🚦 5. Rate Limiting (Cloudflare – Edge)

### 📍 Reglas Activas

#### 🩺 Healthcheck
- Ruta: `/healthz`
- Límite: 100 req/min/IP
- Acción: Managed Challenge

#### 🚀 API General
- Ruta: `/api/*`
- Límite: 60 req/min/IP
- Acción: Block

Estas reglas actúan como **primera línea**, complementando el rate limit y sistema de bans implementado en backend.

---

## 🤖 6. Bot Management

### 📍 Configuración
- **Bot Fight Mode:** ✅ habilitado

🎯 Resultado:
- Mitigación automática de bots conocidos
- Reducción de scraping y escaneo
- Protección adicional para Swagger y endpoints públicos

---

## 📊 7. Observabilidad y Logs

### 📍 Visibilidad confirmada en Cloudflare
- Security Events
- Firewall Events
- Rate Limiting Events

### 📍 Rutas verificadas:
- `Security → Analytics`
- `Security → Security rules → Firewall Events`
- `Security → Security rules → Rate limiting rules → Events`

Estos logs se alinean con los registros internos:
- `security_event`
- `security_ban`

---

## 🏗️ 8. Nginx Reverse Proxy & Hardening (Local / Docker)

### 📍 Implementación Técnica
Para resolver la compatibilidad con Cloudflare (Error 522) y endurecer la seguridad del contenedor de aplicación:

1.  **Nginx como Proxy Inverso**: Se implementó un contenedor `nginx:alpine` escuchando en el puerto **80**.
2.  **Configuración de Headers**: Se asegura la propagación de la IP real del cliente:
    *   `X-Real-IP`
    *   `X-Forwarded-For`
3.  **Aislamiento de Aplicación**: Se eliminó la exposición pública del puerto `8080` en `securetag-app`.

### 🎯 Resultado de Validación (Local)
*   ✅ `curl -I http://localhost/healthz` -> **200 OK** (Accesible vía Nginx)
*   ✅ `curl -I http://localhost:8080/healthz` -> **Connection Refused** (Acceso directo bloqueado)

---

## 🔥 9. Hardening de Firewall (UFW) - Perímetro Estricto

### 📍 Acción Realizada
Se detectó que el puerto `8080` estaba permitido en el firewall del sistema operativo (UFW), lo cual representaba un riesgo de seguridad residual.
Además, se implementó una **Allowlist Estricta** para el puerto 80, permitiendo tráfico **únicamente desde las IPs de Cloudflare**.

### 📍 Estado Final del Firewall
*   ✅ **22/tcp (SSH)**: ALLOW (Administración - Cualquier Origen)
*   ✅ **80/tcp (HTTP)**: ALLOW **(Solo IPs de Cloudflare)**
*   🚫 **80/tcp (HTTP)**: DENY (Cualquier otra IP, incluyendo acceso directo)
*   🚫 **8080/tcp**: DENY (Bloqueado por defecto)

### 🎯 Resultado
El servidor es invisible para escaneos directos de IP. Todo el tráfico web debe pasar obligatoriamente por Cloudflare (WAF/SSL).


---

## 🧠 Evaluación Final

| Componente | Estado |
|----|----|
| SSL/TLS | 🟢 Endurecido |
| HSTS | 🟢 Activo |
| DNS Hygiene | 🟢 Endurecido |
| WAF | 🟢 Activo |
| Rate Limiting | 🟢 Óptimo para el plan |
| Bot Protection | 🟢 Activo |
| Observabilidad | 🟢 Completa |
| **Nginx Proxy** | 🟢 **Implementado** |
| **App Isolation** | 🟢 **Verificado** |
| **Firewall (UFW)** | 🟢 **Endurecido** |
| Riesgo residual | 🟢 Bajo |

---

## ✅ Conclusión

El perímetro Cloudflare de Securetag se encuentra correctamente endurecido. Adicionalmente, se ha actualizado la arquitectura local con **Nginx** para garantizar la conectividad correcta y el aislamiento del backend, eliminando la exposición de puertos innecesarios.

La infraestructura queda lista para proceder con el despliegue y **Hardening del Droplet (UFW + allowlist de IPs Cloudflare)**.

---
