# Documento de Evidencia - Frontend

**Agente**: Frontend
**Tarea**: Fase 1: Configuración de Entorno y Adaptación Inicial
**Fecha**: 2025-12-24 09:30
**Estatus**: Completado

## 📸 Screenshots / Demos
*   **Entorno Docker**: El contenedor `opensaas-app` está ejecutándose correctamente sin errores.
*   **Interfaz Principal**:
    *   Se ha integrado el `ProductSwitcher` en la barra de navegación superior.
    *   Se ha implementado el `Sidebar` contextual que cambia según el producto seleccionado.
    *   Las rutas `/dashboard` (General), `/sast`, `/waf`, y `/osint` están activas y funcionales.
*   **Módulo SAST**:
    *   Vista `/sast/new` funcional con selectores avanzados y cálculo de costos en tiempo real.
    *   Vista `/sast` con métricas de créditos y estado de escaneos.

## 🛠️ Cambios Técnicos

### Fase 2: Consolidación Visual y Conexión Backend

#### 2.1 Validación Visual (Frontend First) - Completado
*   **SastDashboardPage (`/sast`)**:
    *   Implementado dashboard específico con métricas de créditos y widgets de eficacia de IA.
    *   Tabla de "Recent Scans" con barras de progreso simuladas y estados (Scanning, Completed, Failed).
    *   Integración de widget "AI Triage Effectiveness" (Gráfico Donut).
*   **NewScanPage (`/sast/new`)**:
    *   Formulario avanzado alineado con API de Securetag.
    *   **Funcionalidades IA**: Configuración de "Double Check" y "Custom Rules" con selectores de modelo y alcance.
    *   **Estimador de Costos**: Sidebar reactivo que calcula el consumo de créditos en tiempo real según la configuración seleccionada.
    *   **UX**: Corrección de errores de hidratación (anidación de botones) y validación de formulario.
*   **SastProjectsPage (`/sast/projects`)**:
    *   Implementada **Estrategia Híbrida**: Tabla principal con filas expandibles.
    *   Cada fila expandida muestra un resumen del último escaneo (fecha, severidad crítica/alta) y acceso directo al reporte.
    *   Integración de iconos `lucide-react` para indicadores visuales de riesgo.
*   **SastProjectHistoryPage (`/sast/projects/:id`)**:
    *   Página de detalle dedicada para trazabilidad histórica.
    *   **Gráfico de Tendencias**: Visualización de evolución de vulnerabilidades (ApexCharts).
    *   **Historial Completo**: Tabla con todos los escaneos, configuraciones usadas (Double Check, Custom Rules) y estado.
*   **SastReportPage (`/sast/report/:taskId`)**:
    *   Vista **Master-Detail** para navegación eficiente de hallazgos.
    *   Panel lateral con lista de vulnerabilidades filtrable.
    *   Panel principal mostrando detalles técnicos, recomendaciones de IA y bloques de código.
*   **SastLayout**:
    *   Ajuste de rutas en `main.wasp` para soportar navegación SAST.

#### 2.2 Conexión Backend (Proxy Seguro) - Pendiente
*   [ ] Crear `src/server/securetagClient.ts` para centralizar llamadas.
*   [ ] Implementar "Health Check" Frontend -> Wasp -> Securetag API.

### Fase 3: Funcionalidades Core (En Progreso)

#### 3.1 Arquitectura de Navegación (Completado)
*   Implementado `ProductSwitcher` y `Sidebar` contextual (ver Componentes).

#### 3.6 Gestión de Organización y Facturación (En Progreso)
*   [x] **OrganizationPage (`/settings/organization`)**: 
    *   Implementada interfaz visual para gestión de equipos.
    *   Tabla de miembros con roles (Admin/Member) y estado (Active/Invited).
    *   Modal funcional para invitar nuevos usuarios por email.
    *   Menú de acciones para reenviar invitaciones o revocar acceso.
*   [x] **BillingPage (`/settings/billing`)**: 
    *   Widget destacado de "Saldo Actual" con estimación de escaneos restantes.
    *   Sección de "Top-up" con paquetes de créditos (100, 500, 1000).
    *   Tabla de historial de consumo (Escaneos vs Compras).
    *   Historial de facturación con descarga de recibos (mock).

### Infraestructura (Docker)
*   **Corrección de Error Crítico**: Se solucionó el error `spawn xdg-open ENOENT` agregando `ENV BROWSER=none` al `Dockerfile.dev`.
*   **Limpieza**: Se regeneraron los volúmenes de Docker para eliminar corrupciones en `node_modules`.

### Componentes Modificados/Creados
*   `src/client/components/ProductSwitcher.tsx`: Nuevo componente. Dropdown para cambiar entre contextos (General, SAST, WAF, OSINT).
*   `src/client/components/Sidebar.tsx`: Nuevo componente. Navegación lateral dinámica basada en la ruta actual.
*   `src/client/components/NavBar/NavBar.tsx`: Modificado para aceptar `centerContent`, permitiendo inyectar el `ProductSwitcher`.
*   `src/client/App.tsx`: Modificado para integrar el `ProductSwitcher` y el `Sidebar` en el layout principal.
*   `src/admin/layout/Header.tsx`: Corrección de sintaxis en clases de Tailwind (`delay-[0]` -> `delay-0`).

### Base de Datos
*   `schema.prisma`: Agregado campo `securetagApiKey` (String?) al modelo `User`.
*   Migración: `added_securetag_api_key` aplicada exitosamente.

## 🧪 Verificación (Manual)
1.  [x] **Docker Build**: `docker compose up -d --build` finaliza exitosamente.
2.  [x] **Login**: Usuarios pueden autenticarse.
3.  [x] **Navegación**:
    *   Al entrar a `/dashboard`, se ve el sidebar "General".
    *   Al cambiar a "SecureTag SAST" en el switcher, la ruta cambia a `/sast` y el sidebar muestra opciones de SAST.
4.  [x] **Consola**: Sin errores críticos de ejecución.

## ⚠️ Notas / Bloqueos
*   **Próximos Pasos**: Validar visualmente con el usuario y proceder a la conexión con la API (Fase 2).
