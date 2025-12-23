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
*   **Generative Custom Rule Engine (NUEVO)**: Motor dinámico que crea reglas de seguridad "on-demand" específicas para su stack tecnológico exacto (librerías, versiones, frameworks) utilizando IA generativa y validación automática.
*   **Automated Research Pipeline (NUEVO)**: Sistema autónomo de "Zero-Day Detection" que monitorea amenazas globales (CISA KEV, NVD, GitHub) en tiempo real, genera reglas de detección sintéticas y las despliega automáticamente en su instancia para      protegerlo contra nuevas vulnerabilidades antes de que sean ampliamente conocidas.
*   **AI Security Core**: Nuestro modelo cognitivo (`securetag-v1`) alojado en infraestructura GPU privada, entrenado para entender vulnerabilidades complejas.
    *   **Context-Aware Analysis (NUEVO)**: El sistema ahora "entiende" la arquitectura de su proyecto (lenguajes, frameworks, librerías) antes de auditar.
    *   **Deep Code Vision (Función Premium)**: A diferencia de herramientas estándar que analizan fragmentos aislados, SecureTag inyecta una **ventana de contexto extendida** al motor cognitivo. Esto permite a la IA "ver" el código circundante (importaciones, validaciones previas, manejo de errores) para distinguir con precisión humana entre una vulnerabilidad real y un falso positivo, tal como lo haría un auditor senior. *Esta capacidad está disponible exclusivamente para clientes del plan Premium para garantizar el análisis más profundo.*
    *   **Architectural Flow (Cross-file Analysis) (Función Premium)**: SecureTag AI rompe las barreras del análisis estático tradicional al implementar un motor de **rastreo de flujo de datos entre archivos**.
        *   Detecta ataques complejos que inician en un punto de entrada (ej. Controlador API) y explotan una vulnerabilidad en capas profundas (ej. Servicio de Base de Datos), invisibles para escáneres convencionales que analizan archivo por archivo.
        *   Reconstruye la topología completa de su aplicación MVC para identificar rutas críticas de ataque ("Attack Paths") con cero configuración.
        *   **Soporte Multi-Lenguaje Activo**: Ahora disponible para **TypeScript** (Node.js/NestJS), **Python** (Django/Flask) y **Java** (Spring Boot).
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
    *   **Defensa en Profundidad**: El bloqueo se aplica en múltiples niveles siguiendo un modelo de **"Fail Fast"** para máxima eficiencia y protección contra DDoS:
        1.  **IP Address**: Bloqueo de infraestructura en la puerta de entrada (Latencia cero).
        2.  **Credenciales (API Key)**: Inhabilitación automática de la llave utilizada.
        3.  **Cuenta (Tenant)**: Suspensión preventiva de la organización en casos graves.
        4.  **Identidad de Usuario (User Ban & Strikes)**: Bloqueo granular del individuo, respaldado por un sistema de reputación inteligente.
            *   **Strike System (NUEVO)**: Implementamos un mecanismo de "Three-Strikes" para reducir falsos positivos. Las infracciones menores se acumulan en una ventana de tiempo (ej. 1 hora) y el bloqueo solo se activa al superar el umbral definido, asegurando continuidad operativa sin sacrificar seguridad.
            *   **Revocación en Cascada**: Al confirmarse una amenaza real, se invalidan inmediatamente todas las sesiones y credenciales activas del usuario.
        *   **Rate Limiting**: El exceso de peticiones o violaciones repetidas de seguridad también conllevará bloqueos temporales.
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
  -F "profile=auto" \
  -F "custom_rules=true" \
  -F "custom_rules_qty=3" \
  -F "custom_rule_model=standard"
```

*   **`project_alias`** (Opcional pero recomendado): Un nombre legible para su proyecto.
    *   *Formato*: Alfanumérico, guiones y guiones bajos (`a-z`, `0-9`, `-`, `_`).
    *   *Longitud*: 3 a 50 caracteres.
    *   *Ejemplos válidos*: `backend-core`, `api_v2`, `frontend-2025`.
*   **`profile`** (Opcional): Perfil de escaneo (default: `auto`).
    *   *Formato*: Alfanumérico y guiones únicamente.
    *   *Ejemplos válidos*: `auto`.
*   **`double_check`** (Opcional): Activa la validación de "Segunda Opinión" con Inteligencia Artificial Externa.
    *   *Valores*: `critical` (hallazgos críticos), `high` (hallazgos altos y críticos), `medium` (hallazgos medianos, altos y críticos), `low` (hallazgos bajos, medianos, altos y críticos), `all` (todos los hallazgos igual que low). Default: `false`.
*   **`double_check_level`** (Opcional): Define la profundidad y el costo del análisis por hallazgo.
    *   *Valores*: `standard` (1 crédito), `pro` (2 créditos), `max` (3 créditos). Default: `standard`.
*   **`custom_rules`** (Opcional): Activa la generación de reglas personalizadas SAST específicas para su stack.
    *   *Valores*: `true`, `false`. Default: `false`.
    *   *Requisito*: Disponible para planes Standard y Premium.
*   **`custom_rules_qty`** (Opcional): Cantidad de reglas personalizadas a intentar generar.
    *   *Valores*: Entero entre 1 y 10. Default: `3`.
*   **`custom_rule_model`** (Opcional): Potencia del modelo de IA utilizado para la generación de reglas.
    *   *Valores*: `standard` (Rápido), `pro` (Complejo), `max` (Profundo/Casos Borde). Default: `standard`.
    *   *Requisito*: Modelos `pro` y `max` exclusivos para plan Premium. (Ver sección *Generative Custom Rules* para costos).

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

### 🧠 Enterprise Intelligence: AI Double Check

Para clientes con suscripción Enterprise, ofrecemos la funcionalidad de **"Segunda Opinión"**, que somete los hallazgos críticos a un panel de IAs externas de clase mundial para reducir falsos positivos con una precisión sin precedentes.

**Características Clave:**
*   **Análisis Híbrido**: Combina la velocidad de nuestro modelo local con la profundidad de razonamiento de modelos SOTA (State-of-the-Art).
*   **Resiliencia Automática**: Si un proveedor falla, el sistema conmuta automáticamente a otro sin interrupción.
*   **Transparencia**: Los resultados de la segunda opinión se adjuntan claramente en el reporte, permitiendo contrastar el veredicto local vs. externo.

**Niveles de Servicio y Costos:**

| Nivel | Costo por Hallazgo | Capacidad del Modelo | Uso Recomendado |
| :--- | :---: | :--- | :--- |
| **Standard** | **1 Crédito** | Modelos de Alta Eficiencia (Fast Reasoning) | Revisiones diarias, CI/CD continuo. |
| **Pro** | **2 Créditos** | Modelos de Razonamiento Avanzado | Auditorías de seguridad, *Pre-release*. |
| **Max** | **3 Créditos** | **SOTA (State of the Art)**. Máximo razonamiento lógico y contexto. | Infraestructura crítica, Pagos, Datos PII. |

*> **Nota**: Los "Security Credits" se descuentan automáticamente de su saldo organizacional únicamente cuando el análisis se completa exitosamente.*

**Cómo Interpretar el Reporte de Double Check:**

En el JSON de resultados, busque el campo `double_check` dentro de `analysis_json`:

```json
"analysis_json": {
  "triage": "True Positive",
  "reasoning": "Explicación del modelo local...",
  "double_check": {
    "triage": "Needs Review",
    "reasoning": "El modelo externo sugiere revisar el flujo de datos ya que no se confirma la inyección...",
    "severity_adjustment": "medium"
  }
}
```

Esta estructura permite a sus ingenieros de seguridad priorizar esfuerzos basándose en el consenso de múltiples inteligencias.

---

### 🧬 Enterprise Intelligence: Generative Custom Rules (NUEVO)

Esta funcionalidad permite que SecureTag "aprenda" de su código. Analizamos su `package.json`, `pom.xml`, etc., para identificar librerías específicas y generamos reglas de detección SAST exclusivas para su proyecto en tiempo real.

**Niveles de Acceso y Modelos:**

| Feature | Standard (Paga) | Premium (Paga++) |
| :--- | :--- | :--- |
| **Acceso** | ✅ Disponible | ✅ Disponible |
| **Modelos** | `standard` | `standard`, `pro`, `max`|

**Estructura de Costos (Créditos):**

El cobro es dinámico y se divide en dos fases para garantizar valor:

1.  **Processing Fee**: **1 Crédito** por regla solicitada (cubre el intento de generación).
2.  **Success Fee**: Se cobra **SOLO si la regla es válida, compila y funciona**.

| Modelo | Success Fee | Descripción |
| :--- | :---: | :--- |
| **Standard** | **+2 Créditos** | Reglas rápidas para vulnerabilidades comunes. |
| **Pro** | **+4 Créditos** | Lógica compleja y frameworks modernos. |
| **Max** | **+9 Créditos** | Razonamiento profundo para casos de borde y Business Logic. |

*> **Ejemplo**: Si solicita 3 reglas con modelo Standard y se generan 2 exitosamente: (3 * 1 Processing) + (2 * 2 Success) = 7 Créditos.*

---

### 🛡️ Global Threat Intelligence (NUEVO)

Su instancia de SecureTag ahora está conectada a nuestro **Automated Research Pipeline**.

1.  **Monitoreo 24/7**: Rastreamos activamente catálogos de amenazas críticas como CISA KEV (Known Exploited Vulnerabilities) y GitHub Advisories.
2.  **Generación Sintética**: Cuando surge una nueva vulnerabilidad (CVE), nuestra IA analiza el exploit, genera código de prueba y crea una regla de detección "Sintética".
3.  **Protección Proactiva**: Estas reglas se incorporan automáticamente a su motor de análisis. Esto significa que SecureTag puede detectar vulnerabilidades "fresh" (de días u horas de antigüedad) en su código, incluso antes de que los escáneres tradicionales actualicen sus bases de datos.

### 📞 Soporte

Si tiene dudas sobre la integración o los resultados, contacte a su administrador de cuenta Securetag.

*Generado el: 2025-12-12*

online
d294016e293c0bbca80c9495ad4fe8f93ca26ae3e966a60cade11649461017bd