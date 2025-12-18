# 🛡️ SecureTag Research Pipeline

Este directorio contiene los scripts necesarios para el ciclo de vida de investigación y generación de reglas sintéticas de seguridad (SAST) basadas en inteligencia de amenazas en tiempo real.

## 📋 Orden de Ejecución del Pipeline

Para generar nuevas reglas basadas en las últimas amenazas, ejecuta los scripts en el siguiente orden secuencial:

### 1. Análisis de Gaps (`analyze_rules.py`)
Analiza el inventario actual de reglas para identificar qué áreas (Top 10 OWASP, Lenguajes) necesitan más cobertura.
*   **Comando:** `python3 analyze_rules.py`
*   **Input:** Reglas existentes en `../../data/rules`.
*   **Output:** `rules_inventory.json` (Resumen estadístico y gaps).

### 2. Monitor de Amenazas (`cve_monitor.py`)
Consulta fuentes oficiales (NVD y CISA KEV) para identificar vulnerabilidades críticas recientes (últimos 120 días) y explotadas activamente (últimos 10 años) que afecten a nuestro stack tecnológico.
*   **Comando:** `python3 cve_monitor.py`
*   **Input:** APIs de NIST NVD y CISA.
*   **Output:** `trending_cves.json` (Lista cruda de CVEs relevantes).

### 3. Enriquecimiento de Datos (`cve_enricher.py`)
Toma los CVEs detectados y los enriquece con datos técnicos profundos necesarios para la IA:
*   **EPSS Score:** Probabilidad de explotación (API FIRST.org).
*   **CWE ID:** Clasificación precisa del tipo de debilidad (Scraping CVEDetails).
*   **Código de Exploit:** Fragmentos de código real extraídos de referencias de GitHub para entender el ataque.
*   **Comando:** `python3 cve_enricher.py`
*   **Input:** `trending_cves.json`.
*   **Output:** `trending_cves_enriched.json` (Data contextual lista para GPT).

### 4. Filtrado de Reglas Sigma (`sigma_to_sast_candidates.py`)
Analiza miles de reglas de detección de amenazas (Sigma Rules) y filtra aquellas relacionadas con aplicaciones web y frameworks (Django, Node.js, Spring, etc.) que pueden servir como inspiración para reglas SAST.
*   **Comando:** `python3 sigma_to_sast_candidates.py`
*   **Input:** Repositorio de reglas Sigma (`../../datasets/sources/yml/sigma_rules/rules`).
*   **Output:** `sast_candidates_from_sigma.json` (Lista de candidatos de alta calidad).

### 5. Generación de Reglas Sintéticas (`synthetic_rules_gen.py`)
El núcleo del sistema. Utiliza GPT-5.1 para generar reglas Semgrep precisas a partir de múltiples fuentes de inteligencia (CVEs y Sigma).
*   **Comando:** `python3 synthetic_rules_gen.py`
*   **Input:** 
    *   `trending_cves_enriched.json` (Vulnerabilidades recientes).
    *   `sast_candidates_from_sigma.json` (Patrones de ataque conocidos).
    *   `skipped_cves.json` (Log de omisiones).
    *   `failed_cves.json` (Log de fallos para reintento).
*   **Flujo Inteligente:**
    1.  **Filtro SAST:** Consulta a la IA si el CVE es detectable vía código fuente. Si no (ej. bug de memoria en navegador), lo omite y guarda en `skipped_cves.json`.
    2.  **Generación de Código:** Crea casos de prueba (vulnerable vs seguro).
    3.  **Generación de Regla:** Crea la regla Semgrep YAML.
    4.  **Validación:** Ejecuta Semgrep contra los casos de prueba.
    5.  **Auto-Corrección:** Si falla, reintenta hasta 3 veces usando el error como feedback.
    6.  **Memoria:** Si falla definitivamente, guarda el estado en `failed_cves.json` para reintentar con contexto en la próxima ejecución.
*   **Output:**
    *   Reglas validadas en `../../data/rules/synthetic/`.
    *   Logs de estado en `temp/skipped_cves.json` y `temp/failed_cves.json`.

### 6. Restauración de Reglas (`restore_from_temp.py`)
Utilidad para recuperar reglas desde el directorio `temp/` en caso de borrado accidental o para procesar lotes fallidos.
*   **Comando:** `python3 restore_from_temp.py`
*   **Funcionalidad:**
    *   Copia reglas `.yaml` desde `scripts/research/temp/` a `data/rules/synthetic/`.
    *   **Validación y Parcheo Automático:** Antes de copiar, verifica que la regla sea válida y le inyecta metadatos faltantes (CWE, OWASP, etc.) usando heurística inteligente.
    *   **Seguridad:** NO sobrescribe reglas que ya existan en el destino para evitar perder cambios manuales.

---

## 🕒 Frecuencia de Ejecución

1.  **`analyze_rules.py` (Mensual):** Ejecutar periódicamente para evaluar la salud del inventario y detectar nuevas áreas de riesgo no cubiertas.
2.  **`cve_monitor.py` (Diario/Semanal):** Ejecutar regularmente para capturar nuevas vulnerabilidades publicadas en NVD y CISA KEV.
3.  **`cve_enricher.py` (Tras el Monitor):** Ejecutar siempre después de `cve_monitor.py` para preparar los datos.
4.  **`sigma_to_sast_candidates.py` (Bajo demanda):** Ejecutar cuando se actualice el repositorio de reglas Sigma o se quiera buscar nuevos patrones de ataque.
5.  **`synthetic_rules_gen.py` (Continuo/Infinito):** Este script está diseñado para ser re-ejecutado tantas veces como sea necesario.
    *   Reintenta automáticamente reglas fallidas con nuevo contexto.
    *   Salta inteligentemente trabajo ya realizado (reglas existentes o casos no viables).
    *   Puede dejarse corriendo como un proceso de fondo para "limpiar" la cola de generación.

---

## ⚠️ Nota sobre Sobreescritura de Datos

Todos los scripts están diseñados para ser **idempotentes** o **no destructivos** con la información crítica, pero ten en cuenta:

*   `rules_inventory.json`, `trending_cves.json`, `trending_cves_enriched.json`, `sast_candidates_from_sigma.json`: **SE SOBREESCRIBEN** en cada ejecución. Esto es intencional para reflejar siempre el estado más actual de las fuentes. Si necesitas históricos, haz backup antes.
*   `temp/skipped_cves.json` y `temp/failed_cves.json`: **SE ACTUALIZAN (Append/Upsert)**. Mantienen el histórico de decisiones para evitar re-procesamiento innecesario.
*   `../../data/rules/synthetic/*.yaml`: **NO SE SOBREESCRIBEN** si ya existen y son válidas (el generador las salta). Solo se crean nuevas reglas.

---

## �📂 Estructura de Archivos

*   `analyze_rules.py`: Auditoría de inventario.
*   `cve_monitor.py`: Ingesta de amenazas (NVD/CISA).
*   `cve_enricher.py`: Enriquecimiento técnico (EPSS/Exploits).
*   `synthetic_rules_gen.py`: Generador y validador con IA.
*   `requirements.txt`: Dependencias Python.
*   `temp/`: Directorio de trabajo para pruebas y logs (ignorado por git).
*   `*.json`: Archivos intermedios de datos (trending, enriched, inventory).
