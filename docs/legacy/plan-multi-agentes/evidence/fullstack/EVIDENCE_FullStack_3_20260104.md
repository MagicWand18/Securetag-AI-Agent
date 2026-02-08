# Documento de Evidencia - FullStack

**Agente**: FullStack
**Tarea**: Fase 2.1 - Implementación y Depuración de Reportes (Backend/Frontend)
**Fecha**: 2026-01-09 (Actualizado)
**Estatus**: **COMPLETADO** (Implementación Fase 2.1 Finalizada y Verificada)

## 📸 Verificación Visual / Logs

### 1. Integración Frontend (Dropdown de Descarga)
Se implementó el componente `DropdownMenu` en `SastProjectHistoryPage.tsx` reemplazando el enlace estático roto. Ahora permite seleccionar entre 4 formatos de reporte.

### 2. Depuración de Error 500 (Backend Logs)
Se identificaron y corrigieron múltiples causas raíz para el fallo en la generación de PDF mediante logs extensivos:

**A. Error de Fuentes (Roboto):**
```
Error: Could not resolve font "Roboto"
```
*Solución*: Se eliminó la dependencia de fuentes externas y se estandarizó a fuentes estándar (Helvetica, Courier) para garantizar compatibilidad en el entorno de contenedores sin acceso a internet o sistema de archivos local de fuentes.

**B. Error de Tipos TypeScript:**
```
TypeError: Cannot read properties of undefined (reading 'ruleId')
```
*Solución*: Se detectó discrepancia entre `ruleId` (esperado) y `ruleName` (existente en DB). Se refactorizó `TechnicalReport.ts` y `reports.ts` para usar `ruleName` y se eliminó código muerto (`riskScore`) en `ExecutiveReport.ts`.

### 3. Cierre Fase 2.1: Funcionalidades Finales (Backend & Frontend)
**Implementación de los 3 puntos pendientes del plan original:**

**A. Metadatos Extendidos en Reportes (PDF)**
*   **Backend**: Extracción de métricas `files_scanned_count` y `rules_executed_count` en `ReportService.ts`.
*   **Visualización**: Implementación de tabla "Scan Coverage" y visualización jerárquica "Source Tree" en `TechnicalReport.ts`.
*   **Ajustes UX**: Corrección de espaciado en árbol de archivos, "Carpeta Maestra" contenedora y uso de notación texto `[DIR]` en lugar de emojis para compatibilidad PDF.

**B. Paridad Visual en Web (SastReportPage)**
*   **Syntax Highlighting (Code Snippets)**: Integración de `react-syntax-highlighter` con contexto extendido (5-10 líneas alrededor de la vulnerabilidad) para facilitar la lectura rápida del fallo, cumpliendo con los requisitos de backlog.
*   **Métricas y Árbol**: Implementación de componentes `ScanCoverage` y `SourceTree` (vía Modal `Dialog`) en la interfaz web para igualar la información del PDF.

**C. Reporte Global de Proyecto**
*   **Nuevo Endpoint**: `/reports/project/:projectId/global` con soporte robusto para **UUID y Alias** (resolviendo error `invalid input syntax for type uuid`).
*   **Template**: Creación de `GlobalReport.tsx` enfocado en métricas históricas.
*   **Integración Segura**: Implementación de Wasp Action `getGlobalReport` para descarga autenticada servidor-servidor, eliminando exposición de tokens en cliente.
*   **UI**: Botón "GLOBAL REPORT" añadido en `SastProjectHistoryPage.tsx`.

## 🛠️ Cambios Técnicos

### Archivos Modificados

#### Frontend & Middleware
*   `src/client/pages/sast/SastProjectHistoryPage.tsx`: Implementación de UI de descarga global y lógica `handleDownloadReport` / `getGlobalReport`.
*   `src/client/pages/sast/SastReportPage.tsx`: Componentes visuales de paridad (Highlighter, Tree Modal).
*   `src/client/components/ui/use-toast.ts`: Creación del hook de notificaciones (faltante).
*   `src/server/actions/sast.ts`: Implementación de acciones `generateReport` y `getGlobalReport` que actúan como proxy seguro.
*   `main.wasp`: Registro de nuevas acciones.

#### Backend (Core)
*   `src/server/routes/reports.ts`: Ajuste de rutas, soporte Alias/UUID y lógica de reporte global.
*   `src/server/routes/codeaudit.ts`: Inclusión de `code_snippet` en queries y logs de depuración.
*   `src/server/services/ReportService.ts`: Lógica de agregación de datos globales y sanitización.
*   `src/client/components/react-bits/FloatingLines.tsx`: Corrección de estabilidad `ResizeObserver`.
*   `src/server/reports/templates/TechnicalReport.ts`: Refactorización a `React.createElement`, estilos de árbol y métricas.
*   `src/server/reports/templates/GlobalReport.ts`: Nuevo template.
*   `src/server/reports/templates/ExecutiveReport.ts`: Limpieza de referencias obsoletas.

### Detalles de Implementación

1.  **Estrategia de Renderizado Seguro**: Se optó por renderizado en servidor (SSR) usando `@react-pdf/renderer`.
2.  **Proxy de Autenticación**: El frontend no accede directamente a la DB de reportes. Usa una Acción Wasp que se autentica con el Backend mediante un secreto compartido (`createSystemClient`).
3.  **Manejo de Alias**: El backend resuelve dinámicamente si el `projectId` es un UUID o un Alias humano ("avatar3"), garantizando que los enlaces permanentes funcionen.

## 🧪 Pruebas Realizadas

1.  [x] **UI Rendering**: El menú desplegable y botón Global aparecen correctamente.
2.  [x] **Auth Flow**: La acción `generateReport` y `getGlobalReport` rechazan peticiones sin usuario logueado.
3.  [x] **Data Fetching**: El backend recupera correctamente los datos del escaneo y del proyecto (Histórico).
4.  [x] **Formatos Texto**: La generación de JSON y XML funciona correctamente.
5.  [x] **Generación PDF Técnico**: Árbol de archivos legible y sin superposiciones.
6.  [x] **Generación PDF Global**: Descarga funcional con resolución de Alias.

## ⚠️ Notas / Bloqueos
*   La librería `@react-pdf/renderer` es sensible a la falta de fuentes en entornos minimalistas (Alpine Linux). Se mantiene uso de fuentes estándar.
*   Se requiere un escaneo completo exitoso en la base de datos para validar la visualización final de todos los campos del reporte.

## 👨‍🏫 Revisiones y comentarios del supervisor
*   (Espacio reservado para el Supervisor)
