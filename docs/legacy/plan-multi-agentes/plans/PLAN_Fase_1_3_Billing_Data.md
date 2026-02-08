# 📋 Plan de Desarrollo: Fase 1.3 - Integridad de Datos y Facturación

> **Objetivo**: Fortalecer la transparencia financiera y operativa del usuario, proporcionando métricas claras de evolución de seguridad y un desglose detallado del consumo de créditos y facturación.

---

## 1. Análisis de Estado Actual

### 1.1 Project Security Intelligence Dashboard (`SastProjectHistoryPage.tsx`) [COMPLETADO]
*   **Concepto**: Transformar la vista de "Historial" en un **Reporte Vivo del Proyecto**. Responder a: *"¿Estamos mejorando o empeorando?"* y *"¿Cuál es nuestra deuda técnica real?"*.
*   **Componentes Visuales**:
    *   **KPIs de Proyecto (Header)**:
        *   **Vulnerabilidades Únicas (Netas)**: Total de hallazgos distintos (deduplicados por fingerprint) que siguen abiertos.
        *   **Tasa de Resolución**: % histórico de arreglos.
        *   **Velocidad (MTTR)**: Tiempo promedio de vida de una vulnerabilidad.
        *   **Tendencia de Riesgo**: Comparativa vs mes anterior.
    *   **Gráfica "Dinámica de Resolución" (Resolution Dynamics)**:
        *   **Tipo**: Barras apiladas + Línea.
        *   **Eje X**: Tiempo (Escaneos).
        *   **Barra Verde (Hacia abajo)**: Vulnerabilidades **Resueltas** (Fixed) en ese escaneo.
        *   **Barra Roja (Hacia arriba)**: Vulnerabilidades **Nuevas** (New) introducidas.
        *   **Línea**: Total de vulnerabilidades **Pendientes** (Backlog).
    *   **Inventario de Vulnerabilidades (Tabs)**:
        *   **Tab 1: Historial de Escaneos (Scan Log)**: Lista cronológica de ejecuciones (con columnas de deltas +/-).
        *   **Tab 2: Inventario Único (Project Backlog)**: Tabla deduplicada por fingerprint.
            *   Muestra cada vulnerabilidad una sola vez.
            *   Columnas: Severidad, Nombre, Edad (First Seen), Recurrencia (Count), Estado.
*   **Cambios Técnicos (Backend & Datos)**:
    *   **1. Base de Datos (Migración 025)**:
        *   **Archivo**: `migrations/025_add_task_evolution_metrics.sql`
        *   **Cambios**: Agregar columnas a `securetag.task`:
            *   `new_findings_count` (INT, default 0): Vulnerabilidades introducidas en este escaneo.
            *   `fixed_findings_count` (INT, default 0): Vulnerabilidades resueltas respecto al escaneo anterior.
            *   `recurring_findings_count` (INT, default 0): Vulnerabilidades que persisten.
            *   `net_risk_score` (INT, default 0): Puntuación de riesgo acumulada.
    *   **2. Lógica de Negocio (Backend Core)**:
        *   **Ubicación**: `src/server/index.ts` (en la lógica de polling/completion).
        *   **Algoritmo**: Al detectar que una tarea cambia a `status='completed'`:
            1.  Identificar la tarea anterior del mismo proyecto (`previous_task_id`).
            2.  Si existe, comparar los `fingerprints` de los hallazgos actuales vs. los anteriores.
            3.  Calcular `new` (está en actual, no en previo), `fixed` (está en previo, no en actual) y `recurring`.
            4.  Ejecutar `UPDATE securetag.task` con estos valores.
    *   **3. Nuevos Endpoints / Queries**:
        *   **Historial Enriquecido (`GET /projects/:alias/history`)**:
            *   **Cambio**: Incluir las nuevas columnas (`new_findings_count`, etc.) en la respuesta.
        *   **Inventario de Vulnerabilidades (`GET /projects/:alias/vulnerabilities`)**:
            *   **Lógica**: Obtener los hallazgos del **último escaneo exitoso**, enriquecidos con su fecha de "primera aparición".
            *   **Query SQL**: `SELECT DISTINCT ON (fingerprint) ...` para obtener el backlog único del proyecto.
*   **Acciones Inmediatas**:
    *   Eliminar componente `ScanEvolutionTimeline` (revertir).
    *   Restaurar y potenciar `ReactApexChart` para la nueva visualización mixta.

### 1.2 Billing & Credits (`BillingPage.tsx`, `schema.prisma`)
*   **Estado Actual**:
    *   Modelo `CreditUsage` actualizado con `metadata` (Json).
    *   `createScan` actualizado para registrar el desglose de costos.
    *   `BillingPage` muestra historial plano sin detalles y sin capacidad real de generar recibos.
*   **Objetivo**: Proporcionar transparencia total sobre el consumo de créditos (qué costó qué) y permitir la descarga de comprobantes de pago.
*   **Estrategia Técnica**:
    1.  **Frontend (`BillingPage.tsx`)**:
        *   **Desglose de Costos**: Visualizar la data JSON de `metadata` en la tabla de historial (mediante Dialog o Tooltip).
        *   **Generación de Recibos**: Implementar una solución basada en el navegador (`window.print()`) para generar recibos PDF limpios y profesionales sin dependencias pesadas de backend.

---

## 2. Plan de Implementación Técnica (Detallado)

### 2.1 Persistencia de Consumo (Backend/DB) [COMPLETADO]
1.  **Migración de Schema**:
    *   ✅ Agregar `metadata Json?` al modelo `CreditUsage` en `schema.prisma`.
    *   ✅ Ejecutar migración `add_credit_usage_metadata`.
2.  **Lógica de Registro (`src/server/actions/sast.ts`)**:
    *   ✅ Actualizar `createScan` para insertar registro en `CreditUsage` tras el débito de créditos.
    *   ✅ Persistir `costEstimation.breakdown` dentro de `metadata`.

### 2.2 Visualización y Recibos (Frontend) [COMPLETADO]

#### A. Desglose de Costos (Cost Breakdown)
*   **Archivo**: `src/client/pages/settings/BillingPage.tsx`
*   **Implementación**:
    1.  ✅ **Columna 'Details'**: Agregar botón o icono de información en la tabla de historial.
    2.  ✅ **Componente `CostBreakdownDialog`**:
        *   Mostrará: "Base Cost", "Custom Rules (Qty x Fee)", "Double Check (Level)".
        *   Data Source: `row.original.metadata` (parseado desde JSON).
    3.  ✅ **UX**: Badge visual para diferenciar escaneos simples de escaneos con features avanzadas.

#### B. Generación de Recibos (Receipts)
*   **Estrategia**: "Browser-Native Print". Evita librerías de PDF complejas y asegura compatibilidad visual exacta con lo diseñado.
*   **Ruta**: Crear nueva ruta `/billing/receipt/:paymentId` (o componente modal fullscreen).
*   **Componente `ReceiptInvoice`**:
    *   **Diseño**: Estilo factura profesional (Logo, Dirección Fiscal, Tabla de Items, Totales, Footer).
    *   **Datos**:
        *   Fecha, ID Transacción (PayPal Order ID).
        *   Cliente (Nombre, Email).
        *   Detalle (Paquete de Créditos / Suscripción).
        *   Monto Total (USD).
*   **Flujo**:
    1.  ✅ Usuario hace click en botón "Download" en `BillingPage`.
    2.  ✅ Se abre nueva ventana con `/billing/receipt/:id`.
    3.  ✅ `useEffect` en esa página dispara `window.print()` automáticamente al cargar.
    4.  ✅ El usuario guarda como PDF desde el diálogo de impresión del sistema.

### 2.3 Orden de Ejecución
1.  **Fase 1 (Backend)**: [YA COMPLETADO] Schema y Lógica de `createScan`.
2.  **Fase 2 (Recibos)**: [COMPLETADO] Crear componente de recibo y ruta de impresión. Conectar botón de descarga.
3.  **Fase 3 (Desglose)**: [COMPLETADO] Actualizar tabla de `BillingPage` para leer y mostrar `metadata`.
