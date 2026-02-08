# Plan de Desarrollo - Fase 1.2: Flujo de Escaneo Core (SAST)

## 🎯 Objetivo
Implementar y perfeccionar el flujo completo de escaneo de seguridad (SAST), enfocándose en la asociación con proyectos existentes, mejoras de UX en la creación ("New Scan") y feedback de progreso en tiempo real en la vista de historial.

## 📋 Estado Actual
*   **Backend**:
    *   `createScan` (Action): Funcional, maneja subida a Core API.
    *   `getProjects` (Query): Implementada.
*   **Frontend**:
    *   `NewScanPage.tsx`: Solo permite crear proyectos nuevos. Faltan validaciones de UX.
    *   `SastProjectHistoryPage.tsx`: Muestra lista de escaneos, ideal para monitorear progreso.

## 🛠️ Requerimientos Funcionales

### 1. Selección y Asociación de Proyectos
*   **Selector de Proyecto**: En `NewScanPage`, permitir elegir entre:
    *   **"Crear Nuevo Proyecto"**: Input de texto.
    *   **"Usar Proyecto Existente"**: Dropdown cargado dinámicamente (`getProjects`).
*   **Navegación Contextual**:
    *   Soporte para `?projectId=xyz` en la URL.
    *   Si el parámetro existe, pre-seleccionar "Usar Proyecto Existente" y el proyecto correspondiente en el dropdown.

### 2. Mejoras UX en "New Scan"
*   **Validación de Nombres de Proyecto**:
    *   Aplicar restricción estricta: Solo caracteres alfanuméricos, guiones y guiones bajos (`/^[a-zA-Z0-9_-]+$/`).
    *   Mostrar error en tiempo real si el usuario ingresa espacios o caracteres inválidos.
*   **Visualización de Archivos**:
    *   Mostrar el tamaño del archivo seleccionado en formato legible (KB/MB) usando un helper `formatBytes`.
*   **Transparencia en Custom Rules**:
    *   Si se seleccionan reglas personalizadas, mostrar un resumen o listado de *qué* reglas se generaron (nombre, severidad) tras la generación o como paso de confirmación (si aplica), para dar visibilidad al usuario.

### 3. Redirección y Feedback de Progreso
*   **Flujo Post-Escaneo**:
    *   Tras iniciar el escaneo exitosamente, **redirigir automáticamente a la página de Historial del Proyecto** (`/sast/projects/:id`).
*   **Progreso en Tiempo Real (History Page)**:
    *   [x] En `SastProjectHistoryPage`, identificar los escaneos en estado `scanning` o `processing`.
    *   [x] Consumir y mostrar los campos `progress` (%) y `eta` (tiempo restante) provistos por el Backend Core.
    *   [x] ~~Implementar *polling* inteligente~~ (Deshabilitado a petición del usuario para evitar sobrecarga, se prioriza actualización manual/invalidación).

## 📅 Plan de Implementación Paso a Paso
(Estado: Completado ✅)

### Paso 1: Refactorización de `NewScanPage.tsx` (Input y Validación) [x]
*   **Objetivo**: Mejorar la entrada de datos y permitir selección de proyectos.
*   **Tareas**:
    *   [x] Implementar `useQuery(getProjects)`.
    *   [x] Añadir lógica de selección (Radio Button: Nuevo vs Existente).
    *   [x] Implementar validación de Regex para nombres de proyecto nuevos.
    *   [x] Mejorar componente de `FileUploader` para mostrar tamaño formateado.
    *   *Nota*: La calculadora de créditos ya está implementada, no requiere cambios.

### Paso 2: Navegación y Pre-llenado [x]
*   **Objetivo**: Soportar el flujo "Re-escanear".
*   **Tareas**:
    *   [x] Leer `projectId` de la URL (`useLocation` / `URLSearchParams`).
    *   [x] Si existe, auto-configurar el estado del formulario para apuntar a ese proyecto.

### Paso 3: Integración de Progreso en `SastProjectHistoryPage.tsx` [x]
*   **Objetivo**: Mostrar al usuario qué está pasando con su escaneo.
*   **Tareas**:
    *   [x] Revisar la query que obtiene el historial (`getProjectHistory`). Asegurar que traiga los campos `status`, `progress`, `eta`.
    *   [x] En la tabla/lista de escaneos, agregar una columna o indicador visual para el progreso.
    *   [x] Si `status === 'scanning'`, mostrar barra de progreso con el %.
    *   [x] ~~Configurar `refetchInterval`~~ (Eliminado en refinamiento final).

### Paso 4: Redirección [x]
*   **Objetivo**: Conectar el inicio del escaneo con la vista de seguimiento.
*   **Tareas**:
    *   [x] En `NewScanPage`, tras `createScan` exitoso, obtener el `projectId` (si era nuevo, el backend debe devolverlo o debemos inferirlo del alias).
    *   [x] Ejecutar `navigate('/sast/projects/' + projectId)`.

## 🧠 Análisis y Planificación Pendiente (Backlog Refinement)

### 1. Corrección Visual de Tamaño de Archivo (UX) [x]
*   **Problema**: Archivos pequeños (< 1MB) se muestran como "0.00 MB" en `NewScanPage`, lo cual es confuso.
*   **Solución Técnica**:
    *   [x] En `NewScanPage.tsx`, localizar la línea donde se renderiza el tamaño (`selectedFile.size`).
    *   [x] Reemplazar la lógica hardcoded `(size / 1024 / 1024).toFixed(2) + ' MB'` por la función helper `formatBytes(size)` ya existente en el componente.
    *   [x] Esto asegurará que se muestre "500 Bytes" o "15 KB" automáticamente.

### 2. Reporte Detallado de Custom Rules [x]
*   **Objetivo**: Proporcionar transparencia sobre el proceso de generación de reglas (Input vs Output, Fallos y Reembolsos).
*   **Fuentes de Datos (Backend Core/Worker)**:
    *   El endpoint `GET /codeaudit/:taskId` (consumido por `getScanResults`) debe devolver un objeto rico con metadata.
    *   Según los logs del worker, disponemos de:
        *   **Configuración Solicitada**: `custom_rules_config` (Qty, Model, Enabled).
        *   **Resultados de Generación**: Logs de "Rule generation attempt...".
        *   **Reglas Creadas**: Array de reglas (nombre, severidad, CWE).
        *   **Fallos y Reembolsos**: Conteo de fallos y créditos reembolsados.

*   **Propuesta de Implementación (UI)**:
     1.  **Acceso al Reporte**:
         *   [x] **SastProjectHistoryPage**: En la columna "Action", agregar botón/icono "View Details" para escaneos completados.
         *   [x] **SastReportPage**: En el encabezado (Header Ejecutivo), agregar un botón "Custom Rules Report" (visible solo si el escaneo usó reglas personalizadas).
         *   [x] Ambos accesos abrirán el mismo **Dialog/Modal** (`ScanReportDialog`).

     2.  **Estructura del Reporte (Componente `ScanReportDialog`)**:
         *   [x] **Encabezado**: Resumen de estado (Badge) y Fecha.
         *   [x] **Sección "Custom Rules Execution"**:
             *   **Tarjetas de Resumen (Stats)**:
                 *   *Requested*: Cantidad solicitada (e.g., 3).
                 *   *Model*: Modelo usado (e.g., Standard, Pro).
                 *   *Generated*: Cantidad exitosa (e.g., 2).
                 *   *Failed*: Cantidad fallida (e.g., 1).
             *   **Aviso de Reembolso**: Si `refund_amount > 0`, mostrar banner verde: "ℹ️ 2 Credits Refunded due to generation failures."
             *   **Tabla de Detalle**:
                 *   Listado de reglas intentadas.
                 *   Columnas: `Target (CWE)`, `Rule Name`, `Status` (✅ Created / ❌ Failed), `Message` (Razón del fallo si aplica).

 *   **Pasos de Ejecución**:
     1.  [x] Crear componente `ScanReportDialog.tsx` (reutilizable).
     2.  [x] Integrar en `SastProjectHistoryPage.tsx` (nueva columna Action o botón existente).
     3.  [x] Integrar en `SastReportPage.tsx` (Header).
     4.  [x] Conectar con `useQuery(getScanResults, { taskId })` para cargar datos bajo demanda al abrir.
     5.  [x] Mockear la estructura de respuesta (basada en logs) si el endpoint aún no devuelve todo, o ajustar el frontend para parsear lo que haya.

 ## 📂 Archivos Afectados
 1.  `src/client/pages/sast/NewScanPage.tsx`
 2.  `src/client/pages/sast/SastProjectHistoryPage.tsx`
 3.  `src/client/pages/sast/SastReportPage.tsx`
 4.  `src/client/components/sast/ScanReportDialog.tsx` (Nuevo)
2.  `src/client/pages/sast/SastProjectHistoryPage.tsx`
3.  `src/client/components/ui/FileUploader.tsx` (o componente local equivalente)

## ⚠️ Consideraciones
*   **Consistencia de Datos**: Al crear un proyecto nuevo, el Core puede tardar unos milisegundos en tenerlo disponible para listar en el historial. Asegurar que la redirección maneje posibles 404 momentáneos o que el Core responda síncronamente con el ID creado.
