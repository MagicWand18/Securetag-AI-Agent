# 🛡️ SecureTag AI Agent - Guía de Integración para Spartane (Beta 2)

¡Bienvenido a Securetag AI! Estamos emocionados de colaborar con **Spartane** para elevar la seguridad de su código al siguiente nivel.

---

## 🚀 ¿Qué es SecureTag AI?

SecureTag AI es una plataforma de **Auditoría de Código de Nueva Generación** que combina la precisión de las herramientas de análisis estático (SAST) líderes en la industria con la inteligencia cognitiva de Modelos de Lenguaje (LLM) especializados en ciberseguridad.

A diferencia de los escáneres tradicionales que inundan a los desarrolladores con falsos positivos, SecureTag AI:
1.  **Detecta** vulnerabilidades críticas en su código fuente.
2.  **Analiza** cada hallazgo utilizando un "Ciber-Analista Virtual" (IA).
3.  **Valida** si el hallazgo es real o un falso positivo.
4.  **Recomienda** correcciones de código específicas y accionables.
5.  **Organiza** sus auditorías por proyectos y mantiene un historial de evolución de seguridad.

### 🏗️ Componentes de Alto Nivel

Su instancia dedicada de SecureTag AI opera bajo una arquitectura segura y aislada:

*   **SecureTag API**: Puerta de entrada segura para recibir su código y entregar resultados.
*   **Analysis Engine**: Orquesta herramientas de escaneo profundo (SAST) con mecanismos de **"Resilient Scanning"** (Heartbeat) para manejar grandes repositorios sin interrupciones.
*   **Custom Rule Engine**: Motor de reglas personalizado y optimizado para el stack de Spartane (Vue 3, TypeScript, Pinia), capaz de detectar vulnerabilidades específicas que herramientas genéricas ignoran.
*   **AI Security Core**: Nuestro modelo cognitivo (`securetag-v1`) alojado en infraestructura GPU privada, entrenado para entender vulnerabilidades complejas.
    *   **Context-Aware Analysis (NUEVO)**: El sistema ahora "entiende" la arquitectura de su proyecto (lenguajes, frameworks, librerías) antes de auditar, permitiendo una precisión quirúrgica y reduciendo falsos positivos al comprender el contexto real de ejecución.
*   **Tenant Isolation**: Sus datos (`spartane`) están lógicamente aislados y protegidos.

---

## 🛡️ Seguridad y Cumplimiento (NUEVO)

En SecureTag, aplicamos la seguridad que predicamos ("Dogfooding"). Su instancia dedicada incluye las siguientes protecciones activas:

### 🔒 Protección de Infraestructura
1.  **Contenedores Endurecidos**: Todos los procesos de análisis corren bajo usuarios sin privilegios (non-root) con capacidades del kernel restringidas, minimizando el riesgo de escape.
2.  **Aislamiento de Red**: La base de datos y los componentes críticos operan en una red interna privada, sin exposición a internet pública.
3.  **Resiliencia de Datos (NUEVO)**:
    *   **Migraciones Atómicas**: Utilizamos Liquibase para gestionar cambios en la base de datos de forma transaccional y versionada, asegurando integridad estructural.
    *   **Backups Cifrados**: Se ejecutan copias de seguridad automatizadas diariamente (2:00 AM), cifradas con AES-256 y almacenadas localmente con rotación de 7 días.

### 🌐 Seguridad Web y API
1.  **Headers Defensivos**: Todas las respuestas incluyen cabeceras de seguridad de grado bancario (HSTS, CSP estricto, X-XSS-Protection) para proteger a sus usuarios.
2.  **Rate Limiting Inteligente**:
    *   Protección global contra ataques de denegación de servicio (DoS).
    *   Límites estrictos en endpoints sensibles como la subida de archivos para evitar abusos.
3.  **Validación de Archivos (AppSec)**:
    *   Verificación profunda de integridad (Magic Bytes) para asegurar que solo archivos ZIP válidos sean procesados.
    *   **Escaneo de Reputación Global**: Antes de aceptar cualquier código, consultamos una red de inteligencia de amenazas global para asegurar que el archivo no contenga malware conocido, bloqueando automáticamente amenazas detectadas por múltiples fuentes de seguridad.
4.  **Política de Protección Activa (Advanced Banning)**:
    *   **Tolerancia Cero**: Cualquier intento de subir archivos identificados como amenazas resultará en un **bloqueo automático** inmediato.
    *   **Defensa en Profundidad**: El bloqueo se aplica en múltiples niveles para evitar evasión:
        *   **IP Address**: Bloqueo de la dirección de origen.
        *   **Credenciales (API Key)**: Inhabilitación automática de la llave utilizada en el ataque.
        *   **Cuenta (Tenant)**: En casos graves, suspensión preventiva de la cuenta completa.
        *   **Rate Limiting**: El exceso de peticiones o violaciones repetidas de seguridad también conllevará bloqueos temporales para proteger la integridad de la plataforma.
5.  **Auditoría de Inteligencia Artificial (AI Guardrails)**:
    *   **Protección contra Manipulación**: SecureTag implementa "Guardrails" de IA que analizan cualquier contexto proporcionado por el usuario para detectar intentos de *Prompt Injection* o *Jailbreaking*.
    *   **Registro Forense**: Cada intento de manipulación es bloqueado y registrado automáticamente en un log de auditoría inmutable (`security_events`), permitiendo un análisis detallado de los vectores de ataque intentados contra la plataforma.
    *   **Respuesta Activa**: Al confirmar un intento de ataque mediante IA, el sistema **inhabilita automáticamente** la API Key involucrada por un periodo de seguridad (default: 24 horas), previniendo nuevos intentos y notificando al equipo de seguridad.


## ⚙️ Guía Técnica de Integración

Esta sección está dirigida a su equipo de ingeniería/DevOps para integrar SecureTag AI en sus flujos de trabajo (CI/CD, scripts locales, etc.).

### 🔑 Credenciales de Acceso

*   **Endpoint Base**: `http://143.198.61.64:8080`
*   **Tenant ID**: `spartane`
*   **API Key**: `(Proporcionada por separado de forma segura)`
    *   *Nota: Esta llave debe enviarse en el header `X-API-Key` en todas las peticiones.*

### 📡 Endpoints del Sistema

El flujo de análisis consta de tres pasos principales: **Organizar (Proyectos)**, **Subir** y **Consultar**.

#### 1. Subir Código para Análisis (`POST /codeaudit/upload`)

Envía un archivo ZIP con el código fuente que deseas auditar. Puedes (y recomendamos) asociar el escaneo a un **alias de proyecto** para mantener un historial unificado.

**Request:**
```bash
curl -X POST "http://143.198.61.64:8080/codeaudit/upload" \
  -H "X-API-Key: SU_API_KEY_AQUI" \
  -F "file=@./mi-proyecto.zip" \
  -F "project_alias=backend-core" \
  -F "profile=auto"
```

*   **`project_alias`** (Opcional pero recomendado): Un nombre legible para su proyecto.
    *   *Formato*: Alfanumérico, guiones y guiones bajos (`a-z`, `0-9`, `-`, `_`).
    *   *Longitud*: 3 a 50 caracteres.
    *   *Ejemplos válidos*: `backend-core`, `api_v2`, `frontend-2025`.
*   **`profile`** (Opcional): Perfil de escaneo (default: `auto`).
    *   *Formato*: Alfanumérico y guiones únicamente.
    *   *Ejemplos válidos*: `auto`.

**Response (Error de Seguridad - Bloqueo de Amenaza):**
Si nuestro sistema de inteligencia de amenazas detecta contenido malicioso en el archivo subido, la solicitud será rechazada inmediatamente:

```json
{
  "ok": false,
  "error": "Security check failed: Security Policy Violation: File identified as potential threat."
}
```

**Response (Éxito):**
```json
{
  "ok": true,
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "projectId": "3b4926f1-a15a-4b33-9f2d-4ae88427e583",
  "isRetest": true
}
```
*Guarde el `taskId` para consultar el progreso.*

---

#### 2. Consultar Resultados (`GET /codeaudit/:taskId`)

Consulte el estado del análisis. Si está completo, recibirá el reporte detallado.

**Request:**
```bash
curl -X GET "http://143.198.61.64:8080/codeaudit/550e8400-e29b-41d4-a716-446655440000" \
  -H "X-API-Key: SU_API_KEY_AQUI"
```

**Posibles Estados (`status`):**
*   `queued`: En espera de un worker disponible.
*   `running`: Análisis SAST e IA en progreso.
*   `completed`: Análisis finalizado (incluye resultados).
*   `failed`: Ocurrió un error (ver campo `error`).

**Response (En Progreso - NUEVO en Beta 2):**
Ahora puede visualizar el avance real de su auditoría en tiempo real.
```json
{
  "ok": true,
  "status": "running",
  "taskId": "550e8400-...",
  "progress": "45%",    // Avance porcentual real
  "eta": "120s"         // Tiempo estimado restante (calculado dinámicamente)
}
```

**Response (Completado - Ejemplo Estándar):**
```json
{
  "ok": true,
  "status": "completed",
  "taskId": "550e8400-...",
  "progress": "100%",
  "eta": "0s",
  "result": {
    "summary": {
      "severity": {
        "low": 0,
        "medium": 169,
        "high": 129,
        "critical": 0,
        "info": 210
      },
      "findingsCount": 508
    },
    "findings": [
      {
        "rule_name": "vue-v-html-xss",
        "severity": "warning",
        "category": "security",
        "cwe": "CWE-79",
        "cve": null,
        "file_path": "src/views/components/UserBio.vue",
        "line": 45,
        "retest_status": "new",
        "analysis_json": {
          "triage": "True Positive",
          "reasoning": "Se detectó el uso de `v-html` con una variable (`userInput`) que no parece estar sanitizada. En el contexto de este componente de perfil público, esto permite ataques XSS almacenados.",
          "recommendation": "Reemplace `v-html` por `v-text` o utilice una biblioteca de sanitización como DOMPurify antes de renderizar el contenido.",
          "severity_adjustment": "critical"
        }
      }
    ]
  }
}
```

---

#### 3. Gestión de Proyectos e Historial (NUEVO en Beta 2)

Ahora puedes consultar el estado de tus proyectos y su historial de escaneos.

**Listar Proyectos:**
```bash
curl -X GET "http://143.198.61.64:8080/projects" \
  -H "X-API-Key: SU_API_KEY_AQUI"
```

**Ver Historial de un Proyecto:**
Consulta todos los escaneos realizados sobre un alias específico.

```bash
curl -X GET "http://143.198.61.64:8080/projects/backend-core/history" \
  -H "X-API-Key: SU_API_KEY_AQUI"
```

**Response:**
```json
{
  "ok": true,
  "projectId": "3b4926f1-a15a-4b33-9f2d-4ae88427e583",
  "history": [
    {
      "taskId": "550e8400-...",
      "status": "completed",
      "created_at": "2025-12-06T10:00:00Z",
      "is_retest": true
    },
    {
      "taskId": "123f5678-...",
      "status": "completed",
      "created_at": "2025-12-01T09:30:00Z",
      "is_retest": false
    }
  ]
}
```

### 💡 Interpretación de Resultados con IA

El campo clave es `analysis_json` dentro de cada hallazgo. Este contiene la evaluación de nuestra Inteligencia Artificial:

*   **triage**: Veredicto rápido (`Verdadero Positivo`, `Falso Positivo`, `Needs Review`).
*   **reasoning**: Explicación técnica detallada de por qué es (o no es) una vulnerabilidad en **su contexto específico**.
*   **recommendation**: Pasos concretos o código sugerido para remediar el fallo.
*   **severity_adjustment** (NUEVO): Ajuste contextual de la severidad. La IA puede elevar un hallazgo `info` a `high` si detecta que afecta lógica crítica de negocio, o reducirlo si está en código muerto. **Priorice este campo sobre la severidad estática.**

---

### 📞 Soporte

Si tiene dudas sobre la integración o los resultados, contacte a su administrador de cuenta Securetag.

*Generado el: 2025-12-12*

online
d294016e293c0bbca80c9495ad4fe8f93ca26ae3e966a60cade11649461017bd