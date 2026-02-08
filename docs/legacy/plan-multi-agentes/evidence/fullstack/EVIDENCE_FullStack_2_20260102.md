# Documento de Evidencia - FullStack

**Agente**: FullStack
**Tarea**: Fase 1.1 - Seguridad y Gestión de Identidad (Auth)
**Fecha**: 2026-01-02 10:30
**Estatus**: Completado

## 📸 Verificación Visual / Logs

### 1. Eliminación de Cuenta (Danger Zone)
*   **Comportamiento**: Al hacer clic en "Delete Account", se abre un diálogo de confirmación.
*   **Seguridad**: El botón "Confirm Deletion" permanece deshabilitado hasta que el usuario escribe su email exacto.
*   **Resultado**: Redirección a `/login` tras el borrado exitoso.
*   **Log Backend**:
    ```json
    [Server] Deleting tenant for user: user_12345
    [Server] Core API response: 200 OK (Tenant deleted)
    [Server] Local DB: User deleted successfully.
    ```

### 2. Prevención de "Persistencia Fantasma" (Rollback)
*   **Prueba**: Simulación de fallo en conexión con Core API durante el registro.
*   **Log**:
    ```
    [Auth] Creating user in Local DB... OK
    [Auth] Syncing with Securetag Core... FAILED (Timeout)
    [Auth] ⚠️ Rollback triggered: Deleting local user...
    [Auth] Rollback successful. User removed.
    ```
*   **Resultado**: El usuario no queda "flotando" en la base de datos local sin tenant.

## 🛠️ Cambios Técnicos

### Archivos Modificados

*   `src/user/AccountPage.tsx`:
    *   Implementación de sección `Danger Zone` con diseño de advertencia (Rojo/Alerta).
    *   Lógica de estado `deleteConfirmation` para validar el input del email.
    *   Llamada a acción `deleteAccount` con manejo de errores y redirección forzada (`window.location.href = '/login'`).

*   `src/auth/hooks.ts`:
    *   Refactorización de `onAfterSignup`.
    *   Bloque `try/catch` envolvente para la llamada a `createSystemClient`.
    *   Implementación de `prisma.user.delete` en el bloque `catch` para garantizar atomicidad.

*   `src/server/actions/user.ts` (y `operations.ts`):
    *   Nueva acción `deleteAccount`.
    *   Orquestación de borrado: Primero Core (vía API), luego Local (Prisma).
    *   Manejo de caso borde: Si el tenant ya no existe en Core (404), se permite el borrado local para sanear la BD.

*   `src/auth/userSignupFields.ts`:
    *   Mejora en `getErrorMessage` para detectar error `P2002` de Prisma.
    *   Feedback amigable: "Este correo electrónico ya está en uso."

## 🧪 Pruebas Realizadas

1.  [x] **Unicidad de Email**: Intentar registrarse con un email existente. -> Muestra error correcto.
2.  [x] **Fallo de Red en Registro**: Desconectar `securetag-app` y registrarse. -> Usuario no se crea en local (Rollback OK).
3.  [x] **Borrado de Cuenta Exitoso**: Usuario confirma email y borra. -> Acceso revocado, datos eliminados.
4.  [x] **Borrado Cancelado**: Usuario cierra el diálogo o escribe mal el email. -> No pasa nada.

## ⚠️ Notas / Bloqueos
*   Ninguno. La funcionalidad es estable y segura.
*   Listo para proceder con Fase 1.2.

---

**Actualización: Fase 1.2 - Flujo de Escaneo Core (Inicio Incremental)**
**Fecha**: 2026-01-02 11:15

### 🛠️ Cambios en `NewScanPage.tsx`

1.  **Selección de Proyecto (New vs Existing)**:
    *   Se implementó un `Toggle` (Radio Buttons visuales) para alternar entre crear un nuevo proyecto o seleccionar uno existente.
    *   Integración con `getProjects` query para poblar el dropdown de proyectos existentes.

2.  **Validaciones y UX**:
    *   **Validación de Nombre**: Regex `/^[a-zA-Z0-9_-]+$/` para asegurar nombres de proyecto seguros (solo alfanuméricos, guiones y guiones bajos).
    *   **Visualización de Archivo**: Implementación de helper `formatBytes` para mostrar el tamaño del archivo cargado de forma legible (MB/KB).

3.  **Flujo Post-Escaneo (Redirección Mejorada)**:
    *   **Consistencia de URL**: Se modificó la redirección para usar siempre el `alias` del proyecto (o el nombre si es nuevo) en lugar del UUID. Esto asegura URLs limpias como `/sast/projects/mi-proyecto` en lugar de UUIDs.
    *   **Invalidación de Caché**: Se integró `useQueryClient` para invalidar proactivamente las queries `getProjectHistory` y `getProjects` antes de redirigir. Esto garantiza que al llegar a la página de historial, los datos (incluyendo el nuevo escaneo en progreso) se recarguen inmediatamente desde el backend, solucionando el problema de visibilidad.

### 🛠️ Cambios en `SastProjectHistoryPage.tsx`

1.  **Visualización de Progreso en Tiempo Real**:
    *   **Estado "En Progreso"**: Se agregó lógica para detectar escaneos con estado distinto a `completed` o `failed`.
    *   **Barra de Progreso**: Implementación visual de una barra de progreso animada basada en el campo `progress` (%) retornado por el backend.
    *   **ETA**: Visualización del tiempo estimado de finalización (`eta`) junto a la barra de progreso.
    *   **Auto-Refresh**: Se configuró `refetchInterval: 5000` (5 segundos) en `useQuery` para actualizar automáticamente el estado de los escaneos activos sin necesidad de recargar la página.

2.  **Correcciones de Visualización (Bugfixes)**:
    *   **Nombre de Proyecto**: Se corrigió el error donde se mostraba el UUID en lugar del nombre del proyecto. Se agregó una llamada adicional a `getProjects` para resolver el nombre correctamente si la metadata del historial está incompleta.
    *   **Badges de Configuración**: Se ajustó el mapeo de `customRules` y `doubleCheck` para leer correctamente las propiedades snake_case (`custom_rules`, `double_check`) devueltas por el backend, asegurando que el badge "CUSTOM RULES" aparezca cuando corresponde.
    *   **AI Double Check**: Se eliminó la dependencia incorrecta con `is_retest`, mostrando el badge solo si la configuración explícita `double_check` es verdadera.

3.  **Adaptación de Interfaz**:
    *   Reemplazo condicional de la sección de "Config Badges" por un badge de estado pulsante (`SCANNING`, `PROCESSING`) cuando el escaneo está activo.
    *   Reemplazo condicional de la sección de "Threat Composition" por la barra de progreso y ETA.

### 📸 Estado Actual (Fase 1.2)
*   [x] **New Scan**: Usuario puede elegir proyecto existente o crear nuevo con validaciones.
*   [x] **New Scan**: Redirección correcta a Historial tras iniciar escaneo.
*   [x] **History**: Escaneos en curso muestran barra de progreso y ETA.
*   [x] **History**: La página se actualiza automáticamente cada 5 segundos para reflejar el avance.
*   [x] **Bugfix**: Corregido problema de visualización donde el selector "New vs Existing" no se renderizaba correctamente en la tarjeta "Basic Parameters".
*   [x] **Bugfix**: Habilitación correcta del botón "START OPERATION" cuando se selecciona un proyecto existente.
*   [x] **Bugfix**: El título del proyecto ahora muestra el nombre legible (e.g., "MiProyectoWeb") en lugar del UUID.
*   [x] **Bugfix**: Los badges "CUSTOM RULES" y "AI DOUBLE CHECK" reflejan fielmente la configuración del escaneo.
*   [x] **Bugfix**: Redirección usa Alias en lugar de UUID para consistencia de URL.
*   [x] **Bugfix**: Invalidación de caché asegura que el nuevo escaneo aparezca inmediatamente en el historial.

### 🛠️ Refinamiento Final Fase 1.2
**Fecha**: 2026-01-02 11:45

1.  **Optimización de Rendimiento**:
    *   **Eliminación de Polling**: Se retiró el `refetchInterval` de 5 segundos en `SastProjectHistoryPage` a petición del usuario para reducir carga innecesaria, confiando en actualizaciones bajo demanda o invalidación de caché post-acción.

2.  **Limpieza de Logs**:
    *   **Server Logs**: Se eliminaron los `console.log` redundantes en `server/actions/sast.ts` que listaban todos los proyectos en cada petición, manteniendo limpia la terminal del servidor.

3.  **Mejoras de UI/UX en Historial**:
    *   **Columna Status**: Se renombró la columna "Configuration" a "**Status**".
    *   **Badges Unificados**: Se estandarizó la visualización del estado (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) con iconos y colores consistentes.
    *   **AI Double Check**: Se eliminó el badge persistente "AI DOUBLE CHECK" ya que es una funcionalidad bajo demanda y no una configuración estática siempre visible.
    *   **Custom Rules**: Se mantuvo la visibilidad del badge "CUSTOM RULES" como información contextual secundaria.

4.  **UX Improvements en "New Scan"**:
    *   **Visualización de Archivos**: Se implementó el helper `formatBytes(size)` en `NewScanPage.tsx`. Ahora archivos pequeños muestran correctamente su tamaño (e.g., "500 Bytes", "15 KB") en lugar de "0.00 MB".

5.  **Transparencia en Custom Rules**:
    *   **ScanReportDialog**: Se creó e integró un nuevo componente modal `ScanReportDialog.tsx` reutilizable.
    *   **Accesibilidad**: Disponible desde `SastReportPage` (Header) y `SastProjectHistoryPage` (Columna Action).
    *   **Contenido**: Muestra estadísticas detalladas (Solicitadas, Generadas, Fallidas), modelo utilizado y una tabla desglosada con el estado de cada regla (Created/Failed) y mensajes de error si aplican.
    *   **Reembolsos**: Incluye banner informativo si hubo reembolso de créditos por fallos en la generación.

---

**Actualización: Fase 1.3 - Project Security Intelligence Dashboard**
**Fecha**: 2026-01-03

### 🛠️ Cambios en `SastProjectHistoryPage.tsx`

1.  **Transformación a Dashboard**:
    *   Se evolucionó la página de "Historial de Escaneos" a un "Project Intelligence Dashboard".
    *   **KPIs**: Implementación de tarjetas de métricas en el header: Vulnerabilidades Nuevas, Tasa de Resolución, Recurrencia y Tendencia de Riesgo.
    *   **Tabs**: Se dividió la vista principal en dos pestañas:
        *   **Mission Log**: Historial cronológico de escaneos (con badges de estado y custom rules).
        *   **Project Backlog**: Inventario único deduplicado de vulnerabilidades activas.

2.  **Gráficos Avanzados (Resolution Dynamics)**:
    *   Reemplazo del gráfico de línea simple por un gráfico mixto (Mixed Chart) usando `ReactApexChart`.
    *   **Visualización**: Muestra simultáneamente:
        *   Barras Rojas (Arriba): Vulnerabilidades Nuevas introducidas.
        *   Barras Verdes (Abajo): Vulnerabilidades Resueltas (Fixed).
        *   Línea Amarilla: Tendencia del Backlog acumulado.

3.  **Backend & Datos (Migración 025)**:
    *   **Migración SQL**: `025_add_task_evolution_metrics.sql` para agregar columnas `new_findings_count`, `fixed_findings_count`, `recurring_findings_count`, `net_risk_score` a la tabla `Task`.
    *   **Cálculo de Métricas**: Implementación en `TaskExecutor.ts` (`calculateEvolutionMetrics`) que compara fingerprints entre el escaneo actual y el anterior exitoso para poblar estas columnas automáticamente al finalizar un escaneo.
    *   **Endpoints**:
        *   Actualización de `getProjectVulnerabilities` para soportar deduplicación (`DISTINCT ON fingerprint`) y mostrar solo el backlog activo.

4.  **Restauración de Funcionalidades**:
    *   **Custom Rules**: Se aseguró que los escaneos con reglas personalizadas muestren el badge "CUSTOM RULES" y un botón de "Terminal" para ver los logs de generación, manteniendo la paridad con la versión anterior.

### 📸 Estado Actual (Fase 1.3)
*   [x] **Dashboard**: Vista unificada con KPIs de negocio y técnicos.
*   [x] **Gráfico**: Visualización clara de deuda técnica (Nuevas vs Resueltas).
*   [x] **Backlog**: Inventario limpio de vulnerabilidades únicas por proyecto.
*   [x] **Persistencia**: Las métricas se calculan y guardan en DB, evitando recálculos costosos en frontend.

---

**Actualización: Fase 1.3 - Billing & Data Integrity (Finalización)**
**Fecha**: 2026-01-03

### 🛠️ Cambios en Facturación y Créditos (`BillingPage.tsx` & Backend)

1.  **Integridad de Datos (Backend)**:
    *   **Metadata en Créditos**: Implementación de campo `metadata` (JSON) en `CreditUsage` para persistir el desglose exacto de costos en el momento de la transacción.
    *   **Persistencia de Costos**: Actualización de `createScan` para guardar `breakdown` (Base + Custom Rules + Double Check) dentro de la metadata.
    *   **Auto-Sync & Refunds**: Lógica en `getCreditUsageHistory` para detectar discrepancias con el Core y generar registros de "REFUND" automáticos si aplica.

2.  **Refactorización de BillingPage**:
    *   **Separación de Tablas**: División clara entre "Payment History" (Dinero real/PayPal) y "Credit Usage Log" (Consumo interno).
    *   **Traducción e Internacionalización**: Estandarización de todas las descripciones a Inglés ("Purchase of...", "Monthly credits for..."), con soporte retroactivo para registros antiguos en español.

3.  **Transparencia de Costos (Breakdown)**:
    *   **Modal de Detalle**: Nuevo diálogo "Transaction Details" en el historial de uso.
    *   **Desglose Profundo**: Visualización jerárquica de costos de Custom Rules:
        *   Processing Fee (Costo por generación).
        *   Success Fee (Costo por regla exitosa).
    *   **Legacy Support**: Compatibilidad visual para registros antiguos que no tienen la nueva estructura de metadata.

4.  **Generación de Recibos (Receipts)**:
    *   **Browser-Native Print**: Implementación de generación de recibos PDF mediante impresión nativa del navegador.
    *   **Ruta Dedicada**: `/billing/receipt/:paymentId` genera una vista imprimible limpia y profesional.
    *   **Acceso**: Botón de descarga directo en la tabla de Payment History.

### 📸 Estado Actual (Billing)
*   [x] **Transparencia**: El usuario sabe exactamente en qué gastó cada crédito.
*   [x] **Recibos**: Capacidad de descargar comprobantes para contabilidad.
*   [x] **Idiomas**: Interfaz y datos estandarizados en inglés.
*   [x] **UX**: Tablas separadas y limpias para pagos y consumo.
