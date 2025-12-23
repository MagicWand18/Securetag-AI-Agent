# 🛡️ SecureTag AI - Documentación Técnica y Guía de Integración

Bienvenido a la documentación oficial de SecureTag AI. Esta guía detalla la arquitectura, capacidades, seguridad y proceso de integración de nuestra plataforma de Auditoría de Código de Nueva Generación (Next-Gen SAST).

---

## 1. Visión General

SecureTag AI redefine el análisis estático de seguridad (SAST) combinando herramientas de escaneo líderes en la industria con un motor de Inteligencia Artificial Cognitiva.

A diferencia de los escáneres tradicionales, SecureTag AI:
1.  **Detecta** vulnerabilidades en el código fuente.
2.  **Analiza** el contexto arquitectónico mediante IA.
3.  **Valida** los hallazgos para reducir falsos positivos.
4.  **Recomienda** soluciones precisas y accionables.

---

## 2. Arquitectura y Seguridad

Su instancia de SecureTag AI opera bajo una arquitectura de aislamiento estricto ("Tenant Isolation"), garantizando que sus datos y código permanezcan protegidos.

### 2.1 Componentes del Sistema
*   **SecureTag API**: Puerta de enlace segura para la gestión de auditorías.
*   **Analysis Engine**: Orquestador de herramientas SAST con capacidad de "Resilient Scanning" para grandes repositorios.
*   **AI Security Core**: Modelo cognitivo (`securetag-v1`) optimizado para ciberseguridad, alojado en infraestructura privada (GPU).
*   **Automated Research Pipeline**: Sistema de detección de amenazas Zero-Day que monitorea fuentes globales y genera reglas de detección proactivas.

### 2.2 Seguridad de Infraestructura y Datos
*   **Aislamiento de Red**: Base de datos y componentes críticos en red privada sin exposición pública.
*   **Contenedores Endurecidos**: Procesos ejecutados sin privilegios (non-root).
*   **Protección de Datos**: Migraciones atómicas y backups diarios cifrados (AES-256).

### 2.3 Seguridad Aplicativa (AppSec)

SecureTag implementa una defensa en profundidad para proteger su instancia y sus datos.

1.  **Headers Defensivos**:
    *   Todas las respuestas incluyen cabeceras de seguridad de grado bancario (`HSTS`, `CSP` estricto, `X-XSS-Protection`) para proteger a los usuarios.

2.  **Rate Limiting Inteligente**:
    *   Protección global contra ataques de denegación de servicio (DoS).
    *   Límites estrictos en endpoints sensibles (ej. subida de archivos) para evitar abusos.

3.  **Validación de Archivos**:
    *   **Integridad**: Verificación de *Magic Bytes* para asegurar que solo archivos ZIP válidos sean procesados.
    *   **Reputación Global**: Consulta a redes de inteligencia de amenazas para detectar y bloquear archivos con malware conocido antes de aceptarlos.

4.  **Política de Protección Activa (Advanced Banning)**:
    Sistema de "Tolerancia Cero" con modelo *Fail Fast*:
    *   **IP Address**: Bloqueo de infraestructura en la puerta de entrada (Latencia cero).
    *   **Credenciales (API Key)**: Inhabilitación automática de la llave utilizada.
    *   **Cuenta (Tenant)**: Suspensión preventiva de la organización en casos graves.
    *   **Identidad de Usuario (Strike System)**: Mecanismo de "Three-Strikes" donde infracciones menores se acumulan; al superar el umbral, se bloquea al usuario y se revocan sus sesiones activas.

5.  **Auditoría de Inteligencia Artificial (AI Guardrails)**:
    *   **Protección contra Manipulación**: Detección de intentos de *Prompt Injection* o *Jailbreaking* en el contexto proporcionado.
    *   **Registro Forense**: Todo intento de ataque se registra en un log inmutable (`security_events`).
    *   **Respuesta Activa**: Inhabilitación automática de la API Key por 24 horas ante ataques confirmados contra la IA.

---

## 3. Capacidades Principales (Core Capabilities)

### Análisis Estático Profundo (SAST)
Detección exhaustiva de vulnerabilidades en código fuente con soporte para múltiples lenguajes (TypeScript, Python, Java, etc.).

### Context-Aware Analysis
El motor de IA analiza la arquitectura del proyecto (frameworks, librerías, patrones) para entender el contexto antes de auditar, mejorando la precisión de los resultados.

### Deep Code Vision
*Exclusivo Plan Enterprise*
Extiende la ventana de contexto de la IA para analizar el código circundante (importaciones, validaciones previas), permitiendo distinguir vulnerabilidades reales de falsos positivos con precisión humana.

### Architectural Flow (Cross-file Analysis)
*Exclusivo Plan Enterprise*
Motor de rastreo de flujo de datos entre archivos capaz de detectar cadenas de ataque complejas que atraviesan múltiples capas de la aplicación (ej. Controlador -> Servicio -> Base de Datos).

### Global Threat Intelligence
Integración con el *Automated Research Pipeline* para la detección de vulnerabilidades recientes (Zero-Day) mediante reglas sintéticas generadas automáticamente a partir de inteligencia de amenazas global.

---

## 4. Inteligencia Avanzada (Advanced Intelligence)

Funcionalidades potenciadas por IA que requieren el uso de **Security Credits**.

### 4.1 AI Double Check ("Segunda Opinión")
*Disponible para todos los planes (Free, Premium, Enterprise)*

Somete los hallazgos críticos a un panel de IAs externas de clase mundial para una validación adicional.

**Costos (Créditos por hallazgo):**
*   **Standard (1 crédito)**: Modelos de alta eficiencia. Ideal para CI/CD.
*   **Pro (2 créditos)**: Razonamiento avanzado. Ideal para auditorías.
*   **Max (3 créditos)**: Razonamiento SOTA (State-of-the-Art). Ideal para infraestructura crítica.

### 4.2 Generative Custom Rules
*Disponible para planes Premium y Enterprise*

Motor de generación de reglas SAST a medida, basado en el stack tecnológico específico de su proyecto.

**Modelos Disponibles:**
*   **Plan Premium**: Modelos `standard` y `pro`.
*   **Plan Enterprise**: Modelos `standard`, `pro` y `max`.

**Estructura de Costos:**
1.  **Processing Fee**: 1 crédito por intento de generación.
2.  **Success Fee**: Cobro adicional solo si la regla es válida y funcional.
    *   Standard: +2 créditos.
    *   Pro: +4 créditos.
    *   Max: +9 créditos.

---

## 5. Guía Técnica de Integración

### 5.1 Credenciales
*   **Endpoint Base**: `http://143.198.61.64:8080`
*   **Autenticación**: Header `X-API-Key: <SU_API_KEY>`

### 5.2 Endpoints Principales

#### Subir Código (`POST /codeaudit/upload`)
Envía un archivo ZIP para iniciar una auditoría.

**Parámetros del Formulario (Multipart/Form-Data):**

| Parámetro | Tipo | Requerido | Descripción | Valores Permitidos | Default |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `file` | Binary | **Sí** | Archivo ZIP con el código fuente. | Archivo `.zip` válido | - |
| `project_alias` | String | No | Identificador legible del proyecto. | Alfanumérico, guiones, guion bajo (3-50 caracteres). Ej: `backend-core` | - |
| `profile` | String | No | Perfil de escaneo. | `auto` | `auto` |
| `double_check` | String | No | Activa la "Segunda Opinión" con IA externa. | `critical`, `high`, `medium`, `low`, `all`, `false` | `false` |
| `double_check_level` | String | No | Profundidad y costo del análisis Double Check. | `standard` (1 cr), `pro` (2 cr), `max` (3 cr) | `standard` |
| `custom_rules` | Boolean | No | Activa la generación de reglas personalizadas. | `true`, `false` | `false` |
| `custom_rules_qty` | Integer | No | Cantidad de reglas a intentar generar. | 1 - 10 | 3 |
| `custom_rule_model` | String | No | Modelo de IA para generación de reglas. | `standard`, `pro` (Premium/Ent), `max` (Ent) | `standard` |

**Ejemplos de Respuesta:**

*Exito (Tarea Encolada):*
```json
{
  "ok": true,
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "projectId": "3b4926f1-a15a-4b33-9f2d-4ae88427e583",
  "isRetest": true
}
```

*Error de Seguridad (Bloqueo de Amenaza):*
```json
{
  "ok": false,
  "error": "Security check failed: Security Policy Violation: File identified as potential threat."
}
```

#### Consultar Estado (`GET /codeaudit/:taskId`)
Obtiene el estado y resultados de la auditoría.

**Posibles Estados:**
*   `queued`: En espera.
*   `running`: Análisis en progreso.
*   `completed`: Finalizado (incluye reporte).
*   `failed`: Error en el proceso.

**Ejemplos de Respuesta:**

*En Progreso:*
```json
{
  "ok": true,
  "status": "running",
  "taskId": "550e8400-...",
  "progress": "45%",
  "eta": "120s"
}
```

*Completado (Resumen):*
```json
{
  "ok": true,
  "status": "completed",
  "taskId": "550e8400-...",
  "progress": "100%",
  "eta": "0s",
  "result": {
    "summary": {
      "severity": { "high": 12, "medium": 5, "low": 20 },
      "findingsCount": 37
    },
    "findings": [ ... ]
  }
}
```

#### Accesos Directos y Reportes Web

Facilite el acceso a la información sin recordar IDs específicos.

*   **Última Auditoría Completada**:
    *   API: `GET /codeaudit/latest`
    *   Web: `GET /codeaudit/latest?format=html` (Redirección automática al reporte visual).

*   **Índice de Auditorías**:
    *   Web: `GET /codeaudit/index` (Tabla HTML con historial de tareas y estados).

#### Historial y Proyectos
*   Listar proyectos: `GET /projects`
*   Historial de proyecto: `GET /projects/:alias/history`
*   Última auditoría: `GET /codeaudit/latest`

---

## 6. Interpretación de Resultados

El reporte JSON incluye un arreglo de `findings`. El campo más importante es `analysis_json`, que contiene la evaluación de la IA:

*   **triage**: Veredicto (`True Positive`, `False Positive`, `Needs Review`).
*   **reasoning**: Explicación técnica del hallazgo en el contexto de su código.
*   **recommendation**: Solución sugerida.
*   **severity_adjustment**: Ajuste dinámico de la severidad basado en el impacto real.
*   **double_check**: (Si se activó) Resultado de la segunda opinión externa.

---

## 7. Soporte

Para asistencia técnica, dudas sobre integración o reporte de incidentes, contacte a su administrador de cuenta SecureTag o al equipo de soporte técnico.

---
*Documento generado el: 2025-12-23*
