# Evidencia de Seguridad - Fases 1, 2 y 3
Fecha: 2025-12-06
Estado: ✅ Completado y Verificado

---

## 🛡️ Fase 1: Docker Hardening

### 1. Usuario No-Root (`securetag`)
- **Problema**: Los contenedores corrían como `root`, lo que aumentaba el riesgo de escape del contenedor y compromiso del host.
- **Solución**:
  - Se creó un usuario `securetag` (UID 1001) en ambos Dockerfiles (`app` y `worker`).
  - Se asignaron permisos específicos a los directorios de aplicación (`/app`) y datos (`/var/securetag`).
  - Se configuró `USER securetag` al final del Dockerfile para asegurar que el proceso principal corra sin privilegios elevados.

### 2. Aislamiento de Red
- **Verificación**: Se confirmó en `docker-compose.yml` que el servicio `securetag-db` **no expone** el puerto `5432` al host. Solo es accesible internamente por `securetag-app` y `securetag-worker` a través de la red `securetag-net`.

### 3. Validación Fase 1
Se realizaron las siguientes pruebas con éxito:
- `docker compose build`: Construcción exitosa de imágenes con nuevos usuarios.
- `docker compose up -d`: Inicio correcto de todos los servicios.
- `docker compose exec ... id`: Confirmación de que los procesos corren como `uid=1001(securetag)`.
- **Logs**: Verificación de logs de `app` y `worker` confirmando inicio sin errores de permisos (EACCES).

**Archivos Modificados (Fase 1)**:
- `docker/app/Dockerfile`
- `docker/worker/Dockerfile`

---

## 🛡️ Fase 2: Headers & Rate Limiting

### 1. Implementación de Headers de Seguridad
- **Objetivo**: Proteger contra ataques comunes como XSS, Clickjacking y MIME-sniffing.
- **Solución**:
  - Se creó un módulo dedicado `src/server/security.ts`.
  - Se inyectan headers en TODAS las respuestas del servidor (`src/server/index.ts`).
- **Headers Verificados**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security`: HSTS activado por 1 año.
  - `Content-Security-Policy`: Política estricta `default-src 'self'`.

### 2. Rate Limiting Configurable
- **Objetivo**: Evitar abuso de recursos y ataques de denegación de servicio (DoS).
- **Solución**:
  - Implementación "Token Bucket" en memoria (`src/server/security.ts`).
  - Configuración externa vía variables de entorno (NO hardcoded).
  - Limpieza automática de memoria cada 5 minutos.
- **Configuración (.env)**:
  - `RATE_LIMIT_WINDOW_MS=60000` (1 minuto)
  - `RATE_LIMIT_MAX_REQUESTS=100` (Global)
  - `RATE_LIMIT_UPLOAD_MAX=5` (Específico para `/codeaudit/upload`)

### 3. Validación Fase 2
- **Prueba de Headers**: `curl -I http://localhost:8080/healthz` confirma la presencia de todos los headers de seguridad.
- **Prueba de Funcionalidad**: La aplicación sigue respondiendo `200 OK` en endpoints de salud, indicando que los cambios no rompieron el flujo normal.
- **Prueba de Rate Limit**: Se verificó que el límite global aplica a todas las rutas excepto `/healthz` (para no afectar monitoreo).

**Archivos Modificados (Fase 2)**:
- `src/server/index.ts`
- `src/server/security.ts` (Nuevo)
- `.env.production.example`

---

## 🛡️ Fase 3: Validación de Archivos (AppSec)

### 1. Validación de Magic Bytes
- **Objetivo**: Evitar la subida de archivos maliciosos disfrazados (ej: `virus.exe` renombrado a `proyecto.zip`).
- **Solución**:
  - Implementación de `isZipFile` en `src/server/validation.ts`.
  - Verificación de los primeros 4 bytes del buffer (`50 4B 03 04`) antes de procesar cualquier archivo.
- **Resultado**: El sistema rechaza automáticamente cualquier archivo que no sea un ZIP genuino, independientemente de su extensión.

### 2. Integración con VirusTotal
- **Objetivo**: Analizar hash de archivos subidos contra la base de datos de malware más grande del mundo.
- **Solución**:
  - Módulo `checkVirusTotal` que calcula SHA-256 del archivo en memoria.
  - Consulta a la API de VirusTotal (si existe `VIRUSTOTAL_API_KEY`).
  - **Flujo Inteligente**:
    1.  Calcula hash y consulta si ya existe análisis (Rápido).
    2.  Si no existe, sube el archivo automáticamente para escaneo (Upload).
    3.  Realiza polling (espera activa) hasta obtener el veredicto.
  - Bloqueo automático si el archivo es marcado como malicioso o sospechoso por múltiples vendors.
  - **Umbral Configurable**: Se implementó `VIRUSTOTAL_MALICIOUS_THRESHOLD` (default: 0) para definir cuántos votos maliciosos disparan un bloqueo.
  - Estrategia "Fail Open": Si la API falla o no hay key, se permite el paso (para no bloquear negocio), pero se loguea el evento.

### 3. Validación Fase 3
Se realizaron pruebas de ataque simulado:
- **Intento de Bypass**: Se creó un archivo de texto falso (`fake.zip`) y se intentó subir.
  - *Resultado*: `400 Bad Request: Invalid file format`.
- **Subida Legítima (Con Análisis)**: Se subió un ZIP real limpio (`test_clean.zip`).
  - *Log*: `[Security] Checking file hash on VirusTotal...`
  - *Log*: `[Security] VT Analysis passed. File is clean. (Malicious: 0/?)`
  - *Resultado*: `202 Accepted` y tarea creada.
- **Bloqueo de Malware (EICAR)**: Se subió un archivo EICAR comprimido (`test_malicious.zip`).
  - *Log*: `[Security] BLOCKED: File flagged by VirusTotal (Malicious: 56 > Threshold: 0)`
  - *Resultado*: `400 Bad Request: Security check failed...`

**Archivos Modificados (Fase 3)**:
- `src/server/validation.ts` (Nuevo)
- `src/server/index.ts`
- `docker-compose.yml` (Inyección de `VIRUSTOTAL_API_KEY` y `VIRUSTOTAL_MALICIOUS_THRESHOLD`)
- `.env` (Configuración de variables)

---

## 🛡️ Fase 3.1: Protección Activa y Reputación de IPs

### 1. Auditoría de Seguridad (`security_event`)
- **Objetivo**: Mantener un registro inmutable de todos los eventos de seguridad relevantes.
- **Implementación**:
  - Nueva tabla `securetag.security_event` en PostgreSQL.
  - Se registran eventos de tipo `file_scan` (archivos limpios) y `file_blocked` (amenazas detectadas).
  - Datos capturados: Hash del archivo, motivo del bloqueo, IP de origen, User-Agent, fecha y hora.

### 2. Sistema de Reputación y Bloqueo Avanzado (Ban Hammer)
- **Objetivo**: Bloquear automáticamente fuentes de ataques o comportamiento abusivo.
- **Implementación**:
  - Tabla `securetag.security_ban` (renombrada de `ip_reputation`).
  - **Alcance del Bloqueo (Scope)**:
    - **IP Address**: Bloqueo estándar por origen.
    - **API Key**: Bloqueo de credenciales específicas (evita rotación de IPs).
    - **Tenant**: Suspensión total de cuenta (opcional, configurable).
  - **Tipos de Bloqueo**:
    - **Temporal**: Expiración configurable (default: 24 horas).
    - **Permanente**: Bloqueo indefinido (`is_permanent = true`).
  - **Middleware de Protección**:
    - Verificación en cascada: IP -> API Key -> Tenant.
    - Sincronización en memoria cada minuto para alto rendimiento.

### 3. Configuración Dinámica
- **Variables de Entorno**:
  - `SECURITY_BAN_DURATION_HOURS`: Duración del ban temporal (horas).
  - `SECURITY_BAN_PERMANENT_ENABLED`: Habilita bans permanentes (0/1).
  - `SECURITY_BAN_APIKEY_ENABLED`: Habilita ban de API Keys (0/1).
  - `SECURITY_BAN_TENANT_ENABLED`: Habilita ban de Tenants (0/1).

**Archivos Modificados (Fase 3.1)**:
- `migrations/009_create_security_events.sql`
- `migrations/010_create_ip_reputation.sql`
- `migrations/011_expand_ban_scope.sql`
- `migrations/012_fix_ban_schema.sql`
- `src/server/security.ts` (Lógica unificada de Ban)
- `src/middleware/auth.ts` (Verificación de Ban en autenticación)
- `src/server/index.ts` (Integración de logs y bloqueo)
- `.env` y `docker-compose.yml`

---

## 🔍 Revisiones y comentarios del supervisor
*   **Veredicto**: ✅ **Aprobado**.
*   **Comentarios**:
    *   [x] El trabajo de hardening en Docker (Usuario non-root) es excelente y mitiga un riesgo crítico.
    *   [x] La implementación de Rate Limiting y Headers es correcta y sigue las mejores prácticas.
    *   [x] La validación de Magic Bytes y la integración con VirusTotal (con lógica de circuito cerrado y fail-open) es una defensa robusta.
    *   [x] **Decisión sobre Planes Derivados**:
        *   He revisado `PLAN_Contexto_LLM_Seguro.md`. Es brillante, pero su implementación recae en la lógica de negocio del **Worker** (Client LLM) y **Server** (Input). Lo reasignaré a ellos con enfoque de seguridad.
        *   He revisado `PLAN_Resiliencia_Migraciones.md`. La migración a Liquibase es vital para la madurez del proyecto. Esta tarea se asignará al **Agente Server** (Backend Lead).
*   **Acción**: Se marcan las Tareas 9.1, 9.2, 9.3 y 9.4 como completadas en el Master Plan. Las tareas 9.5 (Backups/Liquibase) se moverán a una nueva fase de infraestructura gestionada por Server/Infra.
