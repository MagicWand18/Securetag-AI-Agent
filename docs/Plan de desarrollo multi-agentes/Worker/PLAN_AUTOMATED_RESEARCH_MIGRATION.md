# 🧪 Plan de Migración: Automated Security Research Pipeline

**Objetivo**: Migrar el pipeline de investigación de amenazas y generación de reglas sintéticas (actualmente scripts Python aislados) a una arquitectura robusta, integrada y automatizada dentro del **SecureTag Worker (Node.js/TypeScript)**.

---

## 🏗️ 1. Arquitectura del Nuevo Módulo `ResearchEngine`

El módulo vivirá dentro de `src/worker/services/research/` y replicará la lógica secuencial de los scripts originales, aprovechando la infraestructura existente del Worker (Logging, AI Provider, Database).

### 1.1 Componentes Principales

| Componente TS | Script Python Original | Responsabilidad |
| :--- | :--- | :--- |
| `ThreatMonitor` | `cve_monitor.py` | Consultar APIs externas (NVD, CISA KEV y **GitHub Advisory**) para detectar nuevas amenazas. |
| `ThreatEnricher` | `cve_enricher.py` | Enriquecer CVEs con EPSS, CWE y buscar exploits (Scraping y Fallback Trickest). |
| `SyntheticRuleGen` | `synthetic_rules_gen.py` | Orquestar el ciclo IA: Viabilidad -> Código -> Regla -> Validación. |
| `ResearchOrchestrator`| (Nuevo) | Controlador que ejecuta el pipeline secuencialmente (Job Nocturno). |

### 1.2 Flujo de Datos y Persistencia

Se ha implementado un enfoque de persistencia en disco robusto para soportar reintentos y evitar pérdida de datos:

1.  **Persistencia Temporal y Caché**:
    *   `scripts/research/temp/trending_cves.json`: Salida de la Fase 1 (Monitor).
    *   `scripts/research/temp/trending_cves_enriched.json`: Salida de la Fase 2 (Enricher). **Actúa como caché**: Si se reinicia el proceso, se cargan los CVEs ya enriquecidos para evitar peticiones redundantes.
    *   `scripts/research/temp/failed_cves.json`: Registro de CVEs que fallaron en la generación de reglas, con motivo del fallo.
    *   `scripts/research/temp/skipped_cves.json`: Registro de CVEs descartados por inviabilidad SAST (ej. bugs de memoria).
2.  **Persistencia Final**:
    *   **Reglas Exitosas**: Se guardan en disco en `data/rules/synthetic/*.yaml` solo si pasan la validación de Semgrep (True Positive + False Positive Check).

---

## 📝 2. Detalle de Implementación por Fase

### Fase 1: Monitor de Amenazas (`ThreatMonitor.ts`)
*   **Fuentes**:
    *   `CISA KEV Catalog`: Prioridad máxima (Vulnerabilidades explotadas activamente).
    *   `NIST NVD API 2.0`: Últimos 120 días, filtrado por Severidad HIGH/CRITICAL.
*   **Lógica**:
    *   Consolidación inteligente: Se prioriza la información de CISA KEV pero se fusionan las referencias de NVD (`nvd_references`) para asegurar fuentes de scraping en la siguiente fase.
    *   Filtrado local por keywords (Node, Python, Java, Docker, etc.).

### Fase 2: Enriquecimiento (`ThreatEnricher.ts`)
*   **Fuentes de Datos**:
    *   **EPSS**: Consulta a `api.first.org`.
    *   **CVEDetails**: Scraping de CWE ID y Referencias.
    *   **NVD (Heredado)**: Uso de referencias directas de NVD si CVEDetails falla.
    *   **Trickest (GitHub)**: **Nuevo mecanismo de Fallback**. Si no se encuentran referencias en las fuentes anteriores, se consulta el repositorio `trickest/cve` para extraer enlaces.
*   **Lógica**:
    *   **Exploit Finder**: Extracción de código de exploit real desde GitHub (Raw) y Exploit-DB.
    *   **Caché Inteligente**: Antes de procesar, verifica si el CVE ya existe en `trending_cves_enriched.json` con datos válidos. Si es así, lo salta para evitar rate limits y bloqueos de IP.
    *   **Rate Limiting**: Implementación de batch processing (lotes de 5) y sleeps aleatorios (1-3s) entre lotes.

### Fase 3: Motor de Generación (`SyntheticRuleGen.ts`)
*   **Flujo**:
    1.  **Filtrado Previo**: Carga logs de `skipped_cves.json` y verifica existencia de reglas en `data/rules/synthetic` para no reprocesar lo ya resuelto.
    2.  **Check Viabilidad (IA)**: Prompt "Architect" para filtrar bugs no detectables por SAST.
    3.  **Generación Código (IA)**: Prompt "Developer" genera par `_vuln.js` y `_safe.js`, inyectando el `ai_context` y `exploit_snippet` de la fase anterior.
    4.  **Generación Regla (IA)**: Prompt "Security Engineer" para crear YAML Semgrep.
    5.  **Validación Automática**: Ejecuta `semgrep` contra los archivos generados.
        *   Debe detectar el archivo vulnerable (True Positive).
        *   NO debe detectar el archivo seguro (False Positive Check).
    6.  **Loop de Corrección**: Si falla, reintenta hasta 3 veces inyectando el error de Semgrep en el prompt de la IA.
    7.  **Persistencia**: Solo si pasa todas las pruebas, mueve el YAML a `data/rules/synthetic`.

### Fase 4: Orquestación (`ResearchOrchestrator.ts`)
*   **Ejecución**:
    *   Punto de entrada unificado que ejecuta secuencialmente las 3 fases.
    *   Manejo de errores global y reporte de tiempos de ejecución.
    *   Soporte para ejecución standalone vía CLI (`npx tsx src/worker/...`).
    *   **Integración en Worker**: Se ha conectado al `TaskExecutor.ts` para ser ejecutado como una tarea estándar del sistema (Tipo: `research`, Timeout: 4 horas). Esto permite que el Server programe la ejecución automáticamente (Cron Job).

---

## ⚠️ Consideraciones Técnicas Implementadas
*   **Resiliencia a Bloqueos (WAF)**: El uso de múltiples fuentes de referencias (NVD + CVEDetails + Trickest) y el caché en disco hacen que el sistema sea resistente a bloqueos temporales de una fuente específica.
*   **Feedback Histórico**: El sistema recuerda por qué falló un CVE en ejecuciones anteriores (`failed_cves.json`) e inyecta ese contexto ("Historical Failure Analysis") en los reintentos para que la IA no cometa el mismo error.
