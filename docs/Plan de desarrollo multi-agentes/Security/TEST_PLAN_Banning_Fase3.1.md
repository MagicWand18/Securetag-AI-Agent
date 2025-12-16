# 🧪 Plan de Pruebas: Sistema de Baneo y Seguridad (Fase 3.1)

Este documento define los escenarios de prueba para validar la robustez del sistema de protección activa ("Ban Hammer"), cubriendo bloqueos por IP, API Key, Tenant y persistencia.

---

## 📋 Prerrequisitos
1.  Instancia corriendo (`docker compose up -d`).
2.  Acceso a base de datos para verificaciones y resets.
3.  Herramienta `curl` instalada.
4.  Archivos de prueba: `test_clean.zip` (seguro) y `test_malicious.zip` (EICAR).

## 🛠️ Comandos de Utilidad
**Resetear estado (Limpiar todos los bans):**
```bash
docker exec -i securetag-db psql -U securetag -d securetag -c "TRUNCATE TABLE securetag.security_ban; DELETE FROM securetag.security_event;"
docker compose restart securetag-app
```

---

## 🧪 Escenario 1: Bloqueo Estándar de IP (Default)
**Objetivo**: Verificar que subir un archivo malicioso bloquea la IP de origen por 24h.

**Configuración (.env):**
```env
SECURITY_BAN_APIKEY_ENABLED=0
SECURITY_BAN_TENANT_ENABLED=0
SECURITY_BAN_PERMANENT_ENABLED=0
```

**Pasos:**
1.  **Ejecutar**: Subir `test_malicious.zip` usando una API Key válida.
2.  **Resultado Esperado**: `400 Bad Request` con mensaje de "Security Policy Violation".
3.  **Verificación BD**:
    ```sql
    SELECT * FROM securetag.security_ban WHERE type='ip' AND is_banned=true;
    ```
4.  **Prueba de Bloqueo**: Intentar subir `test_clean.zip` (archivo válido) desde la misma IP inmediatamente.
5.  **Resultado Esperado**: `403 Forbidden` ("Access denied. IP address temporarily banned...").

---

## 🧪 Escenario 2: Bloqueo en Cascada (API Key)
**Objetivo**: Verificar que el bloqueo persiste incluso si el atacante cambia de IP, si usa la misma API Key.

**Configuración (.env):**
```env
SECURITY_BAN_APIKEY_ENABLED=1
```

**Pasos:**
1.  **Ejecutar**: Subir `test_malicious.zip`.
2.  **Resultado Esperado**: Bloqueo exitoso (400).
3.  **Simular Evasión**: Intentar subir `test_clean.zip` simulando una nueva IP (usando header `X-Forwarded-For: 1.2.3.4`).
4.  **Resultado Esperado**: `403 Forbidden` ("Access denied. API Key has been... banned").
5.  **Verificación BD**: Debe existir un registro en `security_ban` con `type='api_key'`.

---

## 🧪 Escenario 3: Suspensión de Tenant (Cuenta Completa)
**Objetivo**: Verificar el "Botón Nuclear": bloquear todo acceso para un Tenant, independientemente de la IP o la Key usada.

**Configuración (.env):**
```env
SECURITY_BAN_TENANT_ENABLED=1
```

**Pasos:**
1.  **Ejecutar**: Subir `test_malicious.zip` con la API Key del Tenant A.
2.  **Resultado Esperado**: Bloqueo exitoso (400).
3.  **Prueba Cruzada**: Usar una **SEGUNDA API Key** diferente que pertenezca al mismo Tenant A para subir un archivo limpio.
4.  **Resultado Esperado**: `403 Forbidden` ("Access denied. Tenant account suspended...").

---

## 🧪 Escenario 4: Bloqueo Permanente
**Objetivo**: Verificar que los bloqueos no tienen fecha de expiración.

**Configuración (.env):**
```env
SECURITY_BAN_PERMANENT_ENABLED=1
```

**Pasos:**
1.  **Ejecutar**: Subir `test_malicious.zip`.
2.  **Verificación BD**:
    ```sql
    SELECT banned_until, is_permanent FROM securetag.security_ban WHERE type='ip';
    ```
3.  **Resultado Esperado**: `banned_until` debe ser `NULL` y `is_permanent` debe ser `t` (true).

---

## 🧪 Escenario 5: Expiración del Bloqueo (Time Travel)
**Objetivo**: Verificar que el sistema desbloquea automáticamente tras pasar el tiempo configurado.

**Configuración (.env):**
```env
SECURITY_BAN_DURATION_HOURS=24
```

**Pasos:**
1.  **Precondición**: Tener una IP baneada (Escenario 1).
2.  **Manipulación**: Modificar la BD para "viajar en el tiempo":
    ```bash
    docker exec -i securetag-db psql -U securetag -d securetag -c "UPDATE securetag.security_ban SET banned_until = now() - interval '1 minute';"
    ```
3.  **Sincronización**: Esperar 60 segundos (o reiniciar contenedor para forzar sync inmediata).
4.  **Prueba**: Subir `test_clean.zip`.
5.  **Resultado Esperado**: `202 Accepted` (El bloqueo ha expirado y el acceso se restaura).

---

## 🧪 Escenario 6: Rate Limiting (Protección Volumétrica)
**Objetivo**: Verificar que el exceso de peticiones genera un bloqueo temporal (429) pero no necesariamente un Ban de Seguridad (403), a menos que se configure así.

**Configuración (.env):**
```env
RATE_LIMIT_UPLOAD_MAX=3
```

**Pasos:**
1.  **Ejecutar**: Enviar 4 peticiones de subida (archivo limpio) en menos de 1 minuto.
2.  **Resultado Esperado**:
    *   Peticiones 1-3: `202 Accepted`.
    *   Petición 4: `429 Too Many Requests` ("Upload limit exceeded").
3.  **Verificación BD**:
    ```sql
    SELECT violation_count FROM securetag.security_ban WHERE type='ip';
    ```
    *   Debe mostrar conteo incrementado, pero `is_banned` podría seguir en `false` (dependiendo de la lógica de negocio, actualmente solo cuenta violaciones).
