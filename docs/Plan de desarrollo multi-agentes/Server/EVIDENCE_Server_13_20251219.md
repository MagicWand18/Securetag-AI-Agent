# Documento de Evidencia - Server

**Agente**: Server
**Iteración**: 7
**Fecha**: 2025-12-19
**Estatus**: Completado

## 📋 Reporte Técnico
Se ha implementado el **Sistema de Baneo Basado en Strikes (Reputación)** (Tarea 10.5).
A diferencia del baneo inmediato ("Fail Fast"), este sistema permite tolerar infracciones leves hasta alcanzar un umbral configurable, momento en el cual se aplica un baneo temporal.

### 🛡️ Funcionalidades Implementadas
1.  **Tabla `security_strike`**: Registro granular de infracciones con `type`, `value`, `reason` y timestamp.
2.  **Lógica de Strikes (`addStrike`)**:
    *   Registra la infracción.
    *   Cuenta las infracciones en una ventana de tiempo (`SECURITY_STRIKE_WINDOW_MINUTES`, default: 60 min).
    *   Si superan el umbral (`SECURITY_STRIKE_THRESHOLD`, default: 3), invoca automáticamente `banEntity`.
3.  **Integraciones**:
    *   **Autenticación Fallida**: Invocado cuando se usa una API Key inválida o revocada.
    *   **Rate Limiting**: Invocado cuando se excede el límite de peticiones por minuto.

### 🛠️ Archivos Modificados
*   `migrations/013_create_security_strikes.sql`: Definición del esquema.
*   `src/server/security.ts`: Implementación de `addStrike` y configuración.
*   `src/middleware/auth.ts`: Integración para intentos de acceso no autorizado.
*   `src/server/index.ts`: Integración para exceso de peticiones (Rate Limit).

### 🧪 Pruebas Realizadas (`tests/test_strikes.sh`)
Se ejecutó un escenario de prueba automatizado:
1.  **Setup**: Limpieza de BD.
2.  **Ejecución**: 3 peticiones consecutivas con API Key inválida.
3.  **Resultado**:
    *   Las 3 peticiones devolvieron `401 Unauthorized`.
    *   Se registraron 3 filas en `security_strike`.
    *   Tras la tercera, se creó automáticamente un registro en `security_ban`.
    *   La cuarta petición (verificación) devolvió `403 Forbidden` (Baneado).

**Logs de Prueba:**
```
🧪 Testing Strike-Based Ban System...
👊 Strike 1: Invalid API Key -> 401
👊 Strike 2: Invalid API Key -> 401
👊 Strike 3: Invalid API Key (Should trigger ban) -> 401
🔒 Verifying Ban...
✅ Success: IP is banned (403)
```

## 🚧 Cambios Implementados
*   [x] Migración SQL `013`.
*   [x] Lógica Core `addStrike` en `security.ts`.
*   [x] Integración en Middleware.
*   [x] Script de prueba validado exitosamente.

## 💬 Revisiones y comentarios del supervisor
La implementación cumple con el requisito de reducir falsos positivos inmediatos mediante un sistema de reputación acumulativa.
