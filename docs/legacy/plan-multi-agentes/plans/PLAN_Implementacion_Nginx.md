# Plan de Implementación: Nginx Reverse Proxy & Hardening
**Fecha**: 2025-12-24  
**Responsable**: Agente Security  
**Estado**: 📝 En Planificación

---

## 1. Contexto y Problema
Actualmente, la arquitectura despliega `securetag-app` exponiendo el puerto **8080** directamente.
*   **Problema**: Cloudflare (en modo Proxy) intenta conectar por defecto a los puertos HTTP estándar (80) o HTTPS (443) del servidor origen. Al no encontrar respuesta (porque la app está en el 8080), devuelve un **Error 522 (Connection Timed Out)**.
*   **Riesgo de Seguridad**: Exponer el puerto de la aplicación (8080) directamente a internet permite que atacantes intenten bypassear el WAF de Cloudflare si descubren la IP real del servidor (DigitalOcean Droplet).

## 2. Objetivos
1.  **Conectividad**: Habilitar el puerto **80** mediante Nginx para recibir el tráfico de Cloudflare.
2.  **Hardening (Seguridad)**: Ocultar el puerto **8080** de `securetag-app` para que **solo** acepte tráfico interno desde Nginx.
3.  **Observabilidad**: Asegurar que las cabeceras `X-Forwarded-For` y `X-Real-IP` se pasen correctamente a la aplicación para mantener el control de IPs (rate limiting, bans).

---

## 3. Fases de Ejecución

### 🔹 Fase 1: Configuración de Nginx
Creación del archivo de configuración para el proxy inverso.

**Archivo**: `nginx/default.conf` (Nuevo)
**Detalles Técnicos**:
*   Definir `upstream` apuntando a `securetag-app:8080`.
*   Configurar `server` escuchando en puerto 80.
*   Configurar `proxy_pass` con cabeceras esenciales:
    *   `Host`: Para mantener el dominio original.
    *   `X-Real-IP`: Para que la app vea la IP del visitante (o de Cloudflare).
    *   `X-Forwarded-For`: Cadena de IPs.
    *   `X-Forwarded-Proto`: Para identificar si vino por HTTPS (Cloudflare SSL).

### 🔹 Fase 2: Re-Arquitectura Docker
Modificación del orquestador para integrar el nuevo servicio y aislar la aplicación.

**Archivo**: `docker-compose.yml`
**Cambios**:
1.  **Servicio `securetag-nginx`**:
    *   Imagen: `nginx:alpine` (ligera y segura).
    *   Puertos: `80:80` (Expuesto al host).
    *   Dependencia: `securetag-app`.
    *   Volumen: Montar `nginx/default.conf`.
2.  **Servicio `securetag-app`**:
    *   **Acción Crítica**: Eliminar sección `ports: - "8080:8080"`.
    *   *Efecto*: El contenedor será accesible SOLO dentro de la red Docker `securetag-net`.

### 🔹 Fase 3: Validación Local
Verificación de que los cambios funcionan antes de cualquier despliegue.

**Pasos de Prueba**:
1.  `docker compose up -d --build --remove-orphans`
2.  Request a `http://localhost/` (Debe cargar la app).
3.  Request a `http://localhost:8080/` (Debe fallar/rechazar conexión -> **Éxito de seguridad**).
4.  Revisar logs de `securetag-app` para confirmar que recibe peticiones.

---

## 4. Rollback Plan (Plan de Reversión)
Si algo falla durante la implementación local:

1.  Revertir cambios en `docker-compose.yml` (Restaurar puerto 8080).
2.  Eliminar servicio `securetag-nginx`.
3.  Ejecutar `docker compose up -d` para volver al estado anterior.
