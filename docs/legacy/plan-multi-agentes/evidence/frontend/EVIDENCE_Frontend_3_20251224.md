# Documento de Evidencia - Frontend

**Agente**: Frontend
**Tarea**: Fase 2.2: Conexión Backend (Infraestructura Base)
**Fecha**: 2025-12-25
**Estatus**: Completado (Infraestructura y UI Reporte Detallado Funcionales)

## 📸 Estado Actual
*   **Reporte SAST Completo**: El sistema ahora visualiza reportes detallados de vulnerabilidades con datos reales del backend.
*   **Conectividad de Red**: Se ha implementado exitosamente la conexión "Docker-to-Docker" uniendo el contenedor `opensaas-app` a la red `securetag-net`.
*   **Verificación Visual**: El Dashboard muestra el indicador "System Online" (verde), confirmando comunicación bidireccional exitosa con el backend.
*   **Infraestructura Backend (Wasp)**: Módulos Proxy/BFF completamente funcionales.

## 🛠️ Cambios Técnicos

### Fase 2.7: Reporte Detallado SAST (Finalización) - Completado
**Objetivo**: Visualizar el detalle completo de las vulnerabilidades encontradas en un escaneo específico.
*   **Integración Backend**:
    *   Implementación final de `getScanResults` en `sast.ts` conectando al endpoint `/codeaudit/:taskId`.
    *   Manejo robusto de errores (404 Scan Not Found, 401 Unauthorized).
*   **Mejoras UI (SastReportPage)**:
    *   **Conexión Real**: Reemplazo de datos mockeados ("ecommerce-platform") por datos vivos provenientes del API.
    *   **Visualización de Hallazgos**:
        *   Ordenamiento inteligente por severidad (Critical > High > Medium > Low > Info).
        *   Generación de IDs únicos (`_uiId`) para garantizar una selección de items estable y sin errores de renderizado.
        *   Corrección de desbordamiento de texto en la barra lateral mediante ajustes CSS (`break-all`, `whitespace-normal`).
    *   **Navegación**: Corrección de enlaces rotos en el Dashboard (uso correcto de `taskId` en lugar de ID interno).
    *   **Compilación**: Solución de errores de tipos en iconos (Lucide React) y dependencias faltantes.

### Fase 2.6: Refactorización BFF Dashboard (Backend for Frontend) - Completado
**Objetivo**: Optimizar la carga del Dashboard y desacoplar el frontend de la base de datos.
*   **Nuevo Endpoint Backend**: Se implementó `GET /dashboard/stats` en el servidor core (`src/server/routes/dashboard.ts`). Este endpoint centraliza consultas SQL complejas (Créditos, Proyectos, Escaneos Activos, Distribución de Severidad).
*   **Refactorización Wasp**: Se modificó `getSastDashboard` en `sast.ts` para eliminar la conexión directa a PostgreSQL (`pg`). Ahora consume el nuevo endpoint vía `securetagClient`.
*   **Resultado**: Carga más rápida, código más limpio en el frontend y mejor seguridad al no exponer lógica de BD en la capa de presentación.

### Fase 2.5: Dashboard Inteligente - Completado

#### 1. Implementación Backend (Wasp Query)
*   **Query**: `getSastDashboard` implementada en `src/server/actions/sast.ts`.
*   **Conexión**: Proxy transparente hacia `GET /dashboard/stats`.
*   **Lógica de Negocio**:
            *   **Autenticación**: Validación de API Key via Header `X-API-Key`.
            *   **Datos**: Métricas completas "cocinadas" listas para renderizar.

#### 2. Implementación Frontend (Mapeo de Datos)
*   **Tarjetas de Estadísticas (Stats Cards)**:
    1.  **Security Credits**: Dato real de la DB Securetag (Tabla Tenant).
    2.  **Active Scans**: Conteo real de tareas en progreso (Tabla Task).
    3.  **Total Vulnerabilidades**: Suma precisa de la última ejecución de cada proyecto.
    4.  **Total Projects**: Conteo de repositorios.
*   **Visualización**:
    *   Gráfico de Distribución de Severidad poblado con datos agregados reales.
    *   Tabla "Recent Scans" muestra el historial real de ejecuciones con estado y fecha.

### Fase 2.4: Nuevo Escaneo (Upload) - Completado

#### 1. Implementación Backend (Wasp Action)
*   **Acción**: `createScan` configurada en `main.wasp`.
*   **Lógica**: `src/server/actions/sast.ts`
    *   Recibe archivo codificado en Base64.
    *   Reconstruye `Buffer` y crea `FormData` compatible con la API externa.
    *   Maneja correctamente los boundaries de `multipart/form-data` (dejando que Axios/Node lo gestionen).

#### 2. Implementación Frontend
*   **Página**: `NewScanPage.tsx` actualizada.
*   **Funcionalidad**:
    *   Lectura de archivo local (ZIP) y conversión a Base64.
    *   Envío mediante acción Wasp `createScan`.
    *   Redirección automática al Dashboard tras éxito.
    *   Manejo de estados de carga (`isUploading`).


### Fase 2.3: Integración de Proyectos (SAST) - Completado

#### 1. Gestión de Credenciales
*   **Backend**: Acción `updateApiKey` segura.
*   **Frontend**: Página `/account` actualizada para ingreso de API Key.
*   **Flujo**: El usuario ingresa su llave, se guarda en DB cifrada (o protegida por acceso), y se usa en cada petición al backend de Securetag.

#### 2. Listado de Proyectos (`getProjects`)
*   **Backend**: Query `getProjects` implementada conectando a `GET /projects`.
*   **Frontend**: `SastProjectsPage` conectada a datos reales.
*   **Manejo de Errores**: Si no hay API Key, muestra alerta amigable y redirige a configuración.
*   **Fix**: Se corrigió el error de React "unique key prop" al usar `Fragment` en el renderizado de la tabla.

### Fase 2.2: Conexión Backend (Infraestructura) - Completado

#### 1. Configuración de Entorno
*   **Archivo**: `.env.server` (Actualizado)
*   **Cambio**: 
    *   `SECURETAG_API_URL=http://securetag-nginx:80` (Comunicación interna directa).
    *   `SECURETAG_API_HOST=api.securetag.com.mx` (Header para validación Nginx).
*   **Propósito**: Habilita la resolución de nombres interna y satisface las reglas de seguridad del proxy inverso.

#### 2. Cliente HTTP Centralizado
*   **Archivo**: `src/server/securetagClient.ts` (Actualizado)
*   **Funcionalidad**:
    *   Inyección dinámica del header `Host` para evitar errores 444 (No Response) de Nginx.
    *   Cliente `axios` robusto con timeouts y manejo de errores.

#### 3. Health Check (Backend Side)
*   **Archivo**: `src/server/actions/healthCheck.ts` (Actualizado)
*   **Endpoint**: `/healthz` (Confirmado 200 OK).
*   **Resultado**: Query `checkApiConnection` ahora devuelve estado real de la red.

#### 4. UI/UX
*   **Componente**: `SastDashboardPage.tsx`
*   **Feature**: Indicador de estado visual (Rojo/Verde) con botón de reintento manual y polling automático al cargar.

## 5. Visualización de Datos (Dashboard)

### 5.1. Distribución de Severidad (Mejoras UI)
- **Soporte Completo de Niveles**: Se extendió la lógica para incluir `Low` e `Info` en todos los cálculos y visualizaciones.
- **Gráfico de Donut Multi-segmento**:
  - Implementación SVG personalizada para mostrar la distribución porcentual de **todos** los niveles de severidad (Critical, High, Medium, Low, Info).
  - Uso de `stroke-dasharray` y offsets acumulativos para renderizar los segmentos correctamente.
  - **Interacción Dinámica (Hover)**: 
    - Al pasar el mouse sobre un segmento, el texto central cambia automáticamente.
    - Muestra el porcentaje (ej. `33%`) y la etiqueta con cantidad (ej. `12 High`).
    - El texto toma el color correspondiente a la severidad seleccionada.
    - Al salir del segmento, regresa a mostrar el "Total".
  - **Estilo**: Efecto de hover (`stroke-width` aumentado) y cursor de ayuda.
- **Formato de Etiquetas**: Cambio del formato "Label (Count)" a "**Count Label**" (ej. "14 High") para mejor legibilidad.
- **Total de Hallazgos**:
  - Se colocó el contador total **dentro del gráfico** (en el centro del donut).
  - Funciona como estado por defecto cuando no hay interacción.

### 5.2. Tabla de Escaneos Recientes
- **Columnas Adicionales**: Se agregaron columnas para `Low` e `Info` en la sección de Findings.
- **Mapeo de Datos**: Actualización en el backend (`sast.ts`) para retornar estos valores en el array `recentScans`.

### 5.3. Historial de Proyecto (Project History Page) - Nueva Funcionalidad
- **Gráfico de Tendencia (Vulnerability Trend)**:
  - Se agregaron series para **Low** (Verde) e **Info** (Gris).
  - Visualización completa de la evolución de todas las severidades a lo largo del tiempo.
- **Tabla de Historial (Scan History)**:
  - Columna "Findings Summary" actualizada para incluir íconos y conteos de `Low` e `Info`.
- **Tarjetas de Métricas (Stats Cards) Actualizadas**:
  1.  **Total Identified Vulnerabilities**: Reemplaza a "Avg. Criticals". Muestra la suma histórica total de vulnerabilidades detectadas en todos los escaneos.
  2.  **Latest Scan Findings**: Reemplaza a "Remediation Rate". Muestra el total de hallazgos del escaneo más reciente, ofreciendo una visión inmediata del estado actual de riesgo.

## 6. Corrección de Bugs y Ajustes
- **Filtrado por Tenant**: Corrección crítica en `sast.ts` para usar `task.tenant_id` en lugar de `scan_result.tenant_id`, resolviendo el problema de "0 vulnerabilidades" cuando los tenants no coincidían exactamente.
- **Cálculo de Totales**: Ajuste en la suma total para incluir los 5 niveles de severidad.
- **Historial de Proyecto (Fix)**:
  - **Endpoint Correcto**: Se cambió el uso de `/codeaudit/history/:uuid` (que daba 404) por `/projects/:alias/history` (que funciona correctamente).
  - **Mapeo Frontend**: Se adaptó `SastProjectHistoryPage.tsx` para manejar la respuesta del endpoint, mapeando `taskId` a `id` y agregando valores por defecto para los conteos de vulnerabilidades (que el endpoint actual aún no devuelve).
- **Recent Scans Link (Fix)**:
  - **Backend Core**: Se actualizó el endpoint `/dashboard/stats` en `src/server/routes/dashboard.ts` para retornar `task_id` (UUID público) además del ID interno del resultado.
  - **Causa Raíz**: El dashboard enlazaba al reporte usando el ID interno del escaneo (`scan.id`) en lugar del ID de la tarea (`scan.taskId`), causando errores 404.
  - **Solución**: El frontend ahora usa prioritariamente `taskId` para construir los enlaces al reporte.

### Historial de Proyecto (Enriquecimiento) - Completado
- **Mejora de Endpoint**: Se modificó `src/server/index.ts` en el backend para enriquecer el endpoint `/projects/:alias/history`.
- **Nuevos Datos**: Ahora retorna el conteo detallado de vulnerabilidades por severidad (`critical`, `high`, `medium`, `low`, `info`) y el total (`totalVulns`) para cada escaneo histórico.
- **Implementación SQL**: Se optimizó la consulta utilizando subqueries sobre la tabla `securetag.finding` en lugar de `securetag.scan_result` (que no contenía el detalle), asegurando datos precisos y consistentes.
- **Validación**: Verificado con `curl`, mostrando datos consistentes (ej. Total 16 = 3 High + 2 Medium + 11 Info).

## 🧪 Verificación (Preliminar)
1.  **Red**: `docker network connect` manual exitoso.
2.  **HTTP**: Peticiones `curl` desde dentro del contenedor confirman 200 OK en `/healthz` inyectando el Host correcto.
3.  **Frontend**: UI refleja "System Online".
4.  **Dashboard**: Links a reportes funcionales y ordenamiento correcto.

## ⚠️ Próximos Pasos
*   **Optimización**: Refinar caché de consultas para mejorar tiempos de carga en reportes muy grandes.
