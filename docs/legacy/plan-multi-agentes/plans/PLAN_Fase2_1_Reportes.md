# Plan de Implementación - Fase 2.1: Reportes Profesionales "Aegis"

**Fecha**: 2026-01-04
**Agente**: FullStack
**Objetivo**: Implementar un sistema de generación de reportes (PDF, JSON, XML) robusto y profesional para la plataforma SecureTag.

---

## 1. Arquitectura de Solución

Se utilizará una estrategia de **Server-Side Rendering** para la generación de documentos, garantizando consistencia, seguridad y rendimiento.

*   **Motor de PDF**: `@react-pdf/renderer`. Permite definir layouts complejos usando componentes React y CSS (Flexbox), renderizándolos en el servidor Node.js sin necesidad de un navegador headless.
*   **Motor de Datos**: Servicio dedicado `ReportService` que agrega datos de múltiples fuentes (Core DB + Frontend DB).
*   **Formatos de Salida**:
    *   **PDF**: Para consumo humano (Ejecutivo y Técnico).
    *   **JSON**: Raw data para integraciones personalizadas.
    *   **XML (JUnit/SARIF)**: Para integración con pipelines CI/CD.

---

## 2. Estructura de Reportes

### A. Reporte Ejecutivo (PDF)
*Target: C-Level, Managers, Clientes Finales.*

**Secciones:**
1.  **Portada**:
    *   Logotipo "Aegis" / SecureTag.
    *   Título del Proyecto (ej. "Backend API Core").
    *   Preparado para: [Nombre Cliente] - [Cargo].
    *   Fecha de Emisión.
2.  **Executive Scorecard**:
    *   **Net Risk Score**: Indicador visual (0-100) del estado de seguridad.
    *   **Nivel de Riesgo**: Crítico / Alto / Medio / Bajo / Seguro.
    *   **Resumen de Hallazgos**: Gráfico de distribución por severidad.
3.  **Análisis de Tendencia**:
    *   Comparativa con escaneo anterior (New vs Fixed issues).
    *   Métrica de "Deuda Técnica de Seguridad".
4.  **Top 5 Riesgos Críticos**:
    *   Lista resumida de los 5 hallazgos con mayor impacto, priorizados por severidad y confianza de la IA.

### B. Reporte Técnico (PDF)
*Target: Desarrolladores, DevOps, Auditores.*

**Secciones:**
1.  **Resumen Técnico**: Tabla compacta de metadatos (Duración, Archivos escaneados, Reglas ejecutadas).
2.  **Detalle de Hallazgos** (Iterativo):
    *   **Encabezado**: ID, Severidad (con código de color), Tipo de Vulnerabilidad (CWE/OWASP).
    *   **Ubicación**: Archivo y línea específica.
    *   **Evidence Block**: Snippet de código fuente resaltado mostrando la vulnerabilidad.
    *   **Argus Analysis**: Explicación generada por IA sobre *por qué* es un riesgo y el contexto arquitectónico.
    *   **Remediación**: Pasos técnicos sugeridos para corregir.

### C. Exportables de Máquina
*   **JSON**: Estructura completa del objeto `ScanResult`.
*   **XML**: Formato estándar JUnit para que herramientas de CI (Jenkins, GitLab, GitHub Actions) puedan parsear los resultados y bloquear pipelines si es necesario.

---

## 3. Mapeo de Datos (Data Dictionary)

Identificación de la fuente de verdad para cada campo del reporte.

| Campo Reporte | Fuente (Sistema) | Tabla.Columna | Notas |
| :--- | :--- | :--- | :--- |
| **Nombre Cliente** | Frontend | `User.firstName` + `lastName` | |
| **Cargo Cliente** | Frontend | `User.jobTitle` | |
| **Empresa** | Frontend | `User.organization` (Calculado/Futuro) | Usar Email domain por ahora |
| **Nombre Proyecto** | Core Backend | `project.name` | Fallback a `project.alias` |
| **Fecha Escaneo** | Core Backend | `task.finished_at` | |
| **Risk Score** | Core Backend | `task.net_risk_score` | Calculado al finalizar scan |
| **Tendencia** | Core Backend | `task.new_findings_count` | vs `fixed_findings_count` |
| **Hallazgo (Título)** | Core Backend | `finding.rule_id` / `category` | |
| **Hallazgo (Sev)** | Core Backend | `finding.severity` | |
| **Hallazgo (Código)**| Core Backend | `finding.code_snippet` | **CRÍTICO**: Debe existir |
| **Hallazgo (IA)** | Core Backend | `finding.analysis_json` | Extraer campo `reasoning` |
| **Resumen Severidad** | Core Backend | `scan_result.summary_json` | Campo `severity` (JSONB) |
| **Total Hallazgos** | Core Backend | `scan_result.summary_json` | Campo `findingsCount` |

---

## 4. Plan de Ejecución

### Fase 1: Setup & Infraestructura (Completado)
1.  [x] Instalar dependencias en `securetag-app` (Core):
    *   `npm install @react-pdf/renderer xml-js`
2.  [x] Configurar estructura de directorios:
    *   `src/server/reports/templates/` (Componentes React)
    *   `src/server/reports/generators/` (Lógica de renderizado)
    *   `src/server/services/ReportService.ts` (Data fetching)

### Fase 2: Backend Logic (Data Layer) (Completado)
1.  [x] Implementar `ReportService.getScanData(taskId)`:
    *   Realiza JOIN de `Task`, `Project`, `Finding` y `ScanResult`.
    *   Implementada sanitización de datos para evitar errores por campos nulos.

### Fase 3: Diseño de Templates (Visual Layer) (Completado)
1.  [x] Crear componentes base: `Header`, `Footer`, `ScoreBadge`, `CodeBlock`.
2.  [x] Implementar `ExecutiveReport.tsx` (Corregido para eliminar dependencias no utilizadas como `riskScore`).
3.  [x] Implementar `TechnicalReport.tsx` (Optimizada gestión de fuentes para compatibilidad server-side).

### Fase 4: API & Integration (Completado)
1.  [x] **Backend Endpoints**:
    *   Ruta: `GET /reports/:taskId/:type`
    *   Tipos soportados: `executive`, `technical`, `json`, `xml`.
    *   Autenticación vía `X-SecureTag-System-Secret`.
2.  [x] **Middleware Layer (Wasp Action)**:
    *   Acción `generateReport` implementada en `src/server/actions/sast.ts`.
    *   Manejo de buffer y conversión Base64 correcto.
3.  [x] **Frontend Integration**:
    *   Componente `SastProjectHistoryPage.tsx` actualizado con `DropdownMenu`.
    *   Lógica de descarga implementada y manejando errores con `use-toast`.

---

## 5. Validaciones y Ajustes (En Curso)
*   [x] Integración de librerías y dependencias.
*   [x] Estructura de componentes de reporte.
*   [x] Flujo de datos Frontend -> Middleware -> Backend.
*   [x] Resolución de conflictos de tipos TypeScript (`ruleId` vs `ruleName`).
*   [x] Depuración de errores 500 (Sanitización y Fuentes).
*   [ ] Validación final de generación de PDF con datos de producción.
*   [ ] Verificación visual de renderizado de fuentes.

---

## 6. Plan de Cierre Fase 2.1 (Pendientes Backlog)

Para cerrar la iteración conforme a los requerimientos del Backlog, se ejecutará el siguiente plan de 3 pasos:

### Paso 1: Metadatos Extendidos y Source Tree (Backend Data) [COMPLETADO]
*Objetivo: Enriquecer el reporte técnico con métricas de cobertura y contexto.*
1.  **Colección de Métricas (Backend Core) [COMPLETADO]**:
    *   Implementado en `TaskExecutor.ts`: Métodos `countFiles` y `countRules` agregados.
    *   Persistencia: Tabla `scan_result` actualizada con campos `files_scanned_count` y `rules_executed_count` en `summary_json`.
2.  **Consumo de Métricas (`ReportService.ts`) [COMPLETADO]**:
    *   Extraer `rules_executed_count` y `files_scanned_count` del JSON de resultados (`summary_json`).
    *   Generar estructura de "Árbol de Archivos" (Source Tree) agrupando los `file_path` de los hallazgos.
3.  **Actualizar `TechnicalReport.ts` [COMPLETADO]**:
    *   Agregar sección "Scan Coverage" en la primera página con las nuevas métricas.
    *   Agregar visualización compacta del Source Tree (lista jerárquica de archivos afectados).

### Paso 2: Visualización Web Mejorada (Frontend) [COMPLETADO]
*Objetivo: Paridad de funcionalidades en la UI Web (Syntax Highlighting).*
1.  **Actualizar `SastReportPage.tsx`**:
    *   [x] Identificada la librería `react-syntax-highlighter` en `package.json`.
    *   [x] Implementar componente `CodeSnippet` que renderice el código vulnerable con resaltado de sintaxis (tema 'prism' o similar) y contexto de 5-10 líneas.
    *   [x] Asegurar que los metadatos de escaneo (reglas, archivos) también se muestren en el encabezado de esta página.

### Paso 3: Reporte Global de Proyecto (Nuevo Feature) [COMPLETADO]
*Objetivo: Visión histórica y evolutiva.*
1.  **Backend (`reports.ts` y `ReportService.ts`)**:
    *   Crear método `getProjectGlobalData(projectId)` que agregue datos de todas las tareas del proyecto.
    *   Crear nuevo endpoint `/reports/project/:projectId/global`.
2.  **Template (`GlobalReport.tsx`)**:
    *   Crear nuevo template PDF centrado en gráficas de línea (Tendencia de Hallazgos vs Tiempo).
    *   Incluir tabla de "Vulnerabilidades Recurrentes".
3.  **Frontend (`SastProjectsPage.tsx` o `HistoryPage`)**:
    *   Agregar botón "Download Global Report" en la cabecera del proyecto.

---

