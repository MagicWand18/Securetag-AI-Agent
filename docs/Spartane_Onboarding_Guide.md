# 🛡️ SecureTag AI Agent - Guía de Integración para Spartane

¡Bienvenido a Securetag AI! Estamos emocionados de colaborar con **Spartane** para elevar la seguridad de su código al siguiente nivel.

---

## 🚀 ¿Qué es SecureTag AI?

SecureTag AI es una plataforma de **Auditoría de Código de Nueva Generación** que combina la precisión de las herramientas de análisis estático (SAST) líderes en la industria con la inteligencia cognitiva de Modelos de Lenguaje (LLM) especializados en ciberseguridad.

A diferencia de los escáneres tradicionales que inundan a los desarrolladores con falsos positivos, SecureTag AI:
1.  **Detecta** vulnerabilidades críticas en su código fuente.
2.  **Analiza** cada hallazgo utilizando un "Ciber-Analista Virtual" (IA).
3.  **Valida** si el hallazgo es real o un falso positivo.
4.  **Recomienda** correcciones de código específicas y accionables.

### 🏗️ Componentes de Alto Nivel

Su instancia dedicada de SecureTag AI opera bajo una arquitectura segura y aislada:

*   **SecureTag API**: Puerta de entrada segura para recibir su código y entregar resultados.
*   **Analysis Engine**: Orquesta herramientas de escaneo profundo (SAST).
*   **AI Security Core**: Nuestro modelo cognitivo (`securetag-v1`) alojado en infraestructura GPU privada, entrenado para entender vulnerabilidades complejas.
*   **Tenant Isolation**: Sus datos (`spartane`) están lógicamente aislados y protegidos.

---

## ⚙️ Guía Técnica de Integración

Esta sección está dirigida a su equipo de ingeniería/DevOps para integrar SecureTag AI en sus flujos de trabajo (CI/CD, scripts locales, etc.).

### 🔑 Credenciales de Acceso

*   **Endpoint Base**: `http://143.198.61.64:8080`
*   **Tenant ID**: `spartane`
*   **API Key**: `(Proporcionada por separado de forma segura)`
    *   *Nota: Esta llave debe enviarse en el header `X-API-Key` en todas las peticiones.*

### 📡 Endpoints del Sistema

El flujo de análisis consta de dos pasos simples: **Subir** y **Consultar**.

#### 1. Subir Código para Análisis (`POST /codeaudit/upload`)

Envía un archivo ZIP con el código fuente que deseas auditar.

**Request:**
```bash
curl -X POST http://143.198.61.64:8080/codeaudit/upload \
  -H "X-API-Key: SU_API_KEY_AQUI" \
  -F "file=@./mi-proyecto.zip" \
  -F "profile=auto"
```

**Response (Éxito):**
```json
{
  "ok": true,
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```
*Guarde el `taskId` para consultar el progreso.*

---

#### 2. Consultar Resultados (`GET /codeaudit/:taskId`)

Consulte el estado del análisis. Si está completo, recibirá el reporte detallado.

**Request:**
```bash
curl -X GET http://143.198.61.64:8080/codeaudit/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: SU_API_KEY_AQUI"
```

**Posibles Estados (`status`):**
*   `queued`: En espera de un worker disponible.
*   `running`: Análisis SAST e IA en progreso.
*   `completed`: Análisis finalizado (incluye resultados).
*   `failed`: Ocurrió un error (ver campo `error`).

**Response (Completado - Ejemplo Simplificado):**
```json
{
  "ok": true,
  "status": "completed",
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "result": {
    "summary": {
      "severity": { "high": 2, "medium": 5, "low": 0, "critical": 1 },
      "findingsCount": 8
    },
    "findings": [
      {
        "rule_id": "php.lang.security.injection.tainted-sql-string",
        "severity": "high",
        "file_path": "/src/login.php",
        "line": 45,
        "analysis_json": {
          "triage": "Verdadero Positivo",
          "reasoning": "La variable $username se concatena directamente en la consulta SQL sin sanitización...",
          "recommendation": "Utilice sentencias preparadas (PDO) en lugar de concatenación de cadenas."
        }
      }
    ]
  }
}
```

### 💡 Interpretación de Resultados con IA

El campo clave es `analysis_json` dentro de cada hallazgo. Este contiene la evaluación de nuestra Inteligencia Artificial:

*   **triage**: Veredicto rápido (`Verdadero Positivo`, `Falso Positivo`, `Needs Review`).
*   **reasoning**: Explicación técnica detallada de por qué es (o no es) una vulnerabilidad en **su contexto específico**.
*   **recommendation**: Pasos concretos o código sugerido para remediar el fallo.

---

### 📞 Soporte

Si tiene dudas sobre la integración o los resultados, contacte a su administrador de cuenta Securetag.

*Generado el: 2025-12-03*


d294016e293c0bbca80c9495ad4fe8f93ca26ae3e966a60cade11649461017bd