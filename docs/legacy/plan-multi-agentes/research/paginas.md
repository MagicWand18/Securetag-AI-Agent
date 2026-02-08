### 1. Estrategia de Navegación: ¿Lista Expandible o Página de Detalle?

**Tu pregunta:** *¿Deberíamos mostrar los detalles desplegables en la misma lista o una página separada?*

**Mi recomendación:** Un enfoque **Híbrido**.
1.  **Lista Principal**: Muestra los proyectos. Al hacer clic en una fila, se **expande** para mostrar los *últimos 3 escaneos* (vista rápida).
2.  **Página de Detalle (`/sast/projects/:id`)**: Es necesaria. ¿Por qué? Porque un proyecto tendrá docenas de escaneos históricos, gráficos de tendencia (¿estamos mejorando o empeorando?) y configuraciones específicas. No podemos meter todo eso en un desplegable sin saturar.

---

### 2. Diseño Detallado de Pantallas

#### A. Página de Listado de Proyectos (`/sast/projects`)
**Objetivo**: Gestión de alto nivel.
**Elementos Clave**:
*   **Tabla de Proyectos**:
    *   **Columnas**: Nombre del Proyecto (`project_alias`), Último Escaneo (Fecha), Estado de Salud (Basado en severidades del último scan), Acciones.
    *   **Interacción (Expandible)**: Al hacer clic en una fila, se despliega un mini-resumen:
        *   *"Último scan: Hace 2 horas. 1 Crítico, 3 Altos. [Ver Reporte Completo]"*
*   **Botón Primario**: "Nuevo Proyecto" (o vincular al flujo de Nuevo Escaneo).

---

#### B. Página de Detalle de Proyecto (`/sast/projects/:id`)
**Objetivo**: Trazabilidad histórica.
**Estructura**:
1.  **Encabezado**: Nombre del Proyecto + Métricas acumuladas (Total escaneos, Total vulnerabilidades detectadas históricamente).
2.  **Gráfico de Tendencia**: Una línea de tiempo mostrando la cantidad de vulnerabilidades Críticas/Altas por escaneo. *Esto le dice al manager si el equipo está arreglando los bugs.*
3.  **Historial de Escaneos (Tabla)**:
    *   **ID**: `taskId` (truncado).
    *   **Fecha**: `created_at`.
    *   **Configuración**: Iconos indicando si usó `Double Check` o `Custom Rules`.
    *   **Resumen**: Badges con conteo (`High: 1`, `Info: 6`).
    *   **Acción**: Botón "Ver Reporte" que lleva a la página crítica.

---

#### C. Página de Reporte de Resultados (`/sast/report/:taskId`)
**Objetivo**: La "Joya de la Corona". Aquí es donde el desarrollador trabaja.
**Diseño Propuesto: Master-Detail (Panel Lateral + Visor Central)**
Este diseño es superior a una simple lista vertical para este tipo de datos densos.

**1. Header del Reporte**:
*   **Izquierda**: `project_alias` / `taskId`.
*   **Derecha**: Resumen de Severidad (Semáforo).
    *   Ejemplo: `🔴 1 Critical` `🟠 3 High` `🔵 6 Info`.
*   **Meta**: Costo del escaneo (si disponible en `custom_rules.total_cost`).

**2. Panel Lateral Izquierdo (Lista de Hallazgos)**:
*   **Filtros**: Checkboxes para filtrar por severidad (Critical, High, Medium, Low).
*   **Lista de Items**:
    *   Cada tarjeta muestra:
        *   **Icono Severidad**.
        *   **Regla**: `rule_name` (ej. "Service call detected: cursor.fetchone").
        *   **Archivo**: `file_path` (ej. "vuln.py").
    *   Al hacer clic, carga el detalle en el panel derecho.

**3. Panel Derecho (Detalle del Hallazgo - El "Brain" de la IA)**:
Aquí mapeamos el JSON `analysis_json` que me mostraste:

*   **Bloque 1: Contexto**:
    *   **Título**: `rule_name`.
    *   **Ubicación**: `file_path` : línea `line`. (Con un botón para "Ver Código" si tuviéramos el archivo cargado).
    *   **Badge de Triage**: `analysis_json.triage` (ej. "True Positive").

*   **Bloque 2: Análisis (El "Reasoning")**:
    *   Un cuadro de texto con fondo suave (gris/azul).
    *   **Contenido**: `analysis_json.reasoning`.
    *   *Ejemplo del JSON*: "El archivo vuln.py contiene una función get_user que concatena directamente..."

*   **Bloque 3: Solución (La "Recommendation")**:
    *   Un bloque de código con resaltado de sintaxis.
    *   **Contenido**: `analysis_json.recommendation`.
    *   *Valor*: Aquí el usuario ve exactamente qué cambiar (`db_cursor.execute` en lugar de concatenar).

*   **Bloque 4: Double Check (Condicional)**:
    *   *Solo si existe `analysis_json.double_check`*.
    *   Un cuadro distintivo (borde morado/dorado) titulado "AI Second Opinion".
    *   **Triage**: `double_check.triage` (ej. "Needs Review").
    *   **Opinión**: `double_check.reasoning`.
    *   *Por qué es vital*: En tu ejemplo JSON, el `Double Check` dice "Needs Review" y explica que falta contexto en `proxy.service.ts`. Esto es información crucial para no perder tiempo en falsos positivos.