# Plan de Integración Frontend - Securetag SaaS

**Fecha**: 2025-12-24
**Autor**: Agente Frontend
**Estado**: 🚀 En Desarrollo (Fase 2 Completada - Visual)

## 1. Análisis de Situación Actual

### 1.1 Estructura del Proyecto (Open SaaS / Wasp)
El proyecto base es una aplicación **Wasp** robusta que incluye:
*   **Stack**: React 19, Node.js, Prisma, TailwindCSS.
*   **UI Library**: Shadcn/UI (basado en Radix UI) ya integrado en `src/client/components/ui`.
*   **Auth**: Sistema de autenticación completo (Email/Pass) listo para usar.
*   **File Upload**: Módulo existente en `src/file-upload` (configurado para AWS S3, requerirá adaptación).
*   **AI Demo**: Módulo `src/demo-ai-app` que sirve como referencia para operaciones asíncronas.

### 1.2 Integración con Securetag Backend
El backend existente (DigitalOcean) expone una API REST protegida por `X-API-Key`.
*   **Endpoint Base**: `http://143.198.61.64:8080`
*   **Desafío Principal**: La API espera un archivo ZIP directo (`multipart/form-data`), mientras que el módulo actual de Open SaaS usa S3 Presigned URLs.
*   **Estrategia de Auth**: Los usuarios del SaaS deberán vincular su `X-API-Key` de Securetag en su perfil, o gestionaremos una llave maestra si el modelo de negocio lo dicta (asumiremos configuración por usuario para la Beta).

## 2. Estrategia de Implementación (Revisión Docker-First)

### Fase 0: Despliegue Docker Base (Completado)
**Estado**: ✅ Finalizado y Validado.
*   Entorno Docker (`node:22-slim`) configurado y funcional.
*   Proyecto Open SaaS levantado en `localhost:3000`.
*   **Validación**: Usuario admin creado (`a@a.com`) y acceso al panel verificado con holahola.12
*   **Notas**: Se observaron errores de conexión (`ERR_CONNECTION_RESET`) en llamadas a la API (`/auth/me`). Esto es esperado ya que no hemos configurado las variables de entorno ni la base de datos de producción, pero confirma que el frontend intenta comunicarse con el servidor. Estos errores se resolverán en la Fase 1.

### Fase 1: Configuración de Entorno y Adaptación (Completado)
**Estado**: ✅ Finalizado.
*   **Limpieza**:
    *   Rutas de demo (`/demo-app`, `/pricing`) ocultadas/reemplazadas por `/dashboard`.
    *   `NotFoundPage` y `AccountPage` redirigen a Dashboard.
*   **Base de Datos**:
    *   Campo `securetagApiKey` agregado a `User` (Beta).
    *   Migración `added_securetag_api_key` aplicada exitosamente.
*   **Navegación Multi-Producto**:
    *   Implementado `ProductSwitcher` en el Top Bar para cambiar contexto (General, SAST, WAF, OSINT).
    *   Implementado `Sidebar` contextual que cambia opciones según el producto seleccionado.
    *   Definidas rutas base para SAST, WAF y OSINT apuntando a `PlaceholderPage` ("En Construcción").
*   **Solución de Problemas (Docker)**:
    *   Corregido error `xdg-open` (navegador) en Docker (`ENV BROWSER=none`).
    *   Corregido error de sintaxis Tailwind (`delay-[0]`).
    *   Estabilizado el entorno local en `localhost:3000`.

### Fase 2: Consolidación Visual y Conexión Backend (Completado)
**Objetivo**: Validar la experiencia de usuario (UX) Multi-Producto y establecer el puente técnico con Securetag API.

#### 2.1 Validación Visual (Frontend First)

    *   [x] Refinar estilos del `ProductSwitcher` y `Sidebar` para asegurar coherencia con Shadcn/UI.
    *   [x] Crear vistas preliminares (Mockups) para las páginas clave de SAST:
        *   [x] `SastDashboardPage` (/sast): Dashboard con métricas (Créditos, AI Triage) y tabla de escaneos.
        *   [x] `NewScanPage` (/sast/new): Formulario avanzado con estimación de costos, configuración IA (Double Check/Custom Rules).
        *   [x] `SastProjectsPage` (/sast/projects): Listado de proyectos con estrategia híbrida (filas expandibles con resumen del último escaneo).
        *   [x] `SastProjectHistoryPage` (/sast/projects/:id): Detalle histórico con métricas de tendencias y tabla de escaneos completa.
        *   [x] `SastReportPage` (/sast/report/:taskId): Reporte detallado de vulnerabilidades (Master-Detail).
        *   [x] Corrección de errores de hidratación y limpieza de consola.

#### 2.2 Conexión Backend (Proxy Seguro) (Completado)
    *   [x] **Ver detalle técnico en**: [`PLAN_Backend_Connection.md`](./PLAN_Backend_Connection.md)
    *   [x] Crear `src/server/securetagClient.ts` para centralizar llamadas.
    *   [x] Implementar un "Health Check" que conecte Frontend -> Wasp Server -> Securetag API para validar credenciales.

#### 2.3 Mapa de Archivos e Integración (Referencia)
Esta tabla mapea las URLs funcionales con sus archivos fuente, facilitando la próxima etapa de conexión con el backend.

| Página / Componente | URL (Ruta) | Archivo Fuente (Path relativo a `template/app/`) | Descripción |
| :--- | :--- | :--- | :--- |
| **SAST Dashboard** | [`/sast`](http://localhost:3000/sast) | `src/client/pages/sast/SastDashboardPage.tsx` | Dashboard principal de SAST con métricas. |
| **New Scan** | [`/sast/new`](http://localhost:3000/sast/new) | `src/client/pages/sast/NewScanPage.tsx` | Formulario de escaneo y configuración IA. |
| **Project List** | [`/sast/projects`](http://localhost:3000/sast/projects) | `src/client/pages/sast/SastProjectsPage.tsx` | Lista de proyectos con expansión híbrida. |
| **Project History** | `/sast/projects/:id` | `src/client/pages/sast/SastProjectHistoryPage.tsx` | Detalle histórico y tendencias (mock ID: `1`). |
| **Scan Report** | `/sast/report/:taskId` | `src/client/pages/sast/SastReportPage.tsx` | Reporte de vulnerabilidades (mock ID: `mock-task-id`). |
| **Organization** | [`/settings/organization`](http://localhost:3000/settings/organization) | `src/client/pages/settings/OrganizationPage.tsx` | Gestión de usuarios y roles. |
| **Billing** | [`/settings/billing`](http://localhost:3000/settings/billing) | `src/client/pages/settings/BillingPage.tsx` | Historial de créditos y facturación. |
| **Product Switcher** | N/A (Navbar) | `src/client/components/ProductSwitcher.tsx` | Selector de contexto en barra superior. |
| **Sidebar** | N/A (Layout) | `src/client/components/Sidebar.tsx` | Navegación lateral contextual. |



### Fase 3: Funcionalidades Core (Iterativo)

#### 3.1 Arquitectura de Navegación (Product Switcher)
Se adopta un modelo de navegación jerárquica para soportar múltiples productos (SAST, WAF, OSINT) manteniendo la claridad.

*   **Top Bar (Global)**:
    *   **Logo & Home**: Link al Dashboard Unificado.
    *   **Product Switcher**: Dropdown/Selector central para cambiar de contexto (ej. de "General" a "SecureTag AI").
    *   **User Menu**: Perfil, Ajustes, Logout.

*   **Sidebar (Contextual)**:
    *   Cambia dinámicamente según el producto seleccionado en la Top Bar.
    *   **Contexto "General"**: Resumen, Facturación, Usuarios.
    *   **Contexto "SecureTag AI" (SAST)**: Dashboard SAST, Nuevo Escaneo, Proyectos, Reportes.

#### 3.2 Dashboard Unificado (Home)
Ruta: `/` o `/dashboard-general`
Vista ejecutiva que consolida métricas de alto nivel de todos los productos contratados.
*   **Widgets**:
    *   *SAST*: "X Vulnerabilidades Críticas detectadas hoy".
    *   *WAF*: "Y Ataques bloqueados última hora".
    *   *System*: Estado de salud de los servicios.

#### 3.3 Definición de Roles y Dashboards
Es crucial distinguir las métricas y funciones visibles para cada tipo de actor en la plataforma:

1.  **Superadmin (System Owner)**:
    *   **Visibilidad**: Global del sistema.
    *   **Métricas Exclusivas**: Amenazas bloqueadas (AppSec), uso global de recursos, salud del sistema.
    *   **Gestión**: Tenants, planes globales, configuraciones de infraestructura.

2.  **Admin de Organización / Solo User**:
    *   **Visibilidad**: Limitada a su organización o cuenta personal.
    *   **Dashboard**:
        *   Métricas de escaneos (vulnerabilidades, tendencias).
        *   **Gestión de Créditos**: Visualización de saldo, consumo y compra de paquetes.
        *   **Gestión de Usuarios**: Crear/Editar/Eliminar miembros del equipo y asignarles cuotas.
    *   **Acciones**: Iniciar escaneos, gestionar proyectos, facturación.

3.  **Usuario Final (Miembro de Organización)**:
    *   **Visibilidad**: Limitada a los proyectos asignados o de la organización.
    *   **Dashboard**: Similar al Admin pero sin funciones de facturación ni gestión de usuarios.
    *   **Limitaciones**: No puede comprar créditos (consumen la cuota de la org).

#### 3.4 Especificaciones Detalladas de Vistas SAST
**Estado Global SAST**: ✅ Completado y Funcional (Escaneos activos conectando con Backend)

##### A. Página de Nuevo Escaneo (`NewScanPage`)
*   **Estado**: ✅ Funcional
*   **Perfil de Escaneo**: Fijado en `auto`.
*   **Configuración Avanzada (IA)**:
    *   **Double Check ("Segunda Opinión")**:
        *   Switch de activación.
        *   Selectores para **Nivel** (`Standard`, `Pro`, `Max`) y **Alcance** (`Critical`, `High`, `All`).
        *   Indicador de costo en créditos.
    *   **Custom Rules**:
        *   Switch de activación.
        *   Input para **Cantidad** (1-10) y **Modelo** (`Standard`, `Pro`, `Max`).
    *   **Estimación de Costo**: Widget que calcula y muestra el costo total estimado de la operación antes de lanzar el escaneo.

##### B. Dashboard SAST (`SastDashboardPage`)
*   **Enfoque**: Orientado al Admin/Usuario (no Superadmin).
*   **Métricas Clave**:
    *   **Security Credits**: Widget destacado con Saldo Restante vs. Usado.
    *   **AI Triage Effectiveness**: Gráfico (Donut) mostrando Vulnerabilidades Reales vs. Falsos Positivos descartados por la IA.
    *   **Escaneos Activos**: Tabla con barra de progreso real y ETA (Tiempo estimado).
*   **Nota**: Las métricas de "Amenazas Bloqueadas" se reservan para el Dashboard de Superadmin.

##### C. Listado de Proyectos (`SastProjectsPage`)
*   **Estrategia Híbrida**: Tabla principal con filas expandibles.
*   **Interacción**:
    *   Click en fila -> Expande resumen del último escaneo (Severidad, Fecha, Link a Reporte).
    *   Click en nombre -> Navega al detalle completo del proyecto.
*   **Acciones**: Crear nuevo proyecto/escaneo.

##### D. Detalle de Proyecto (`SastProjectHistoryPage`)
*   **Objetivo**: Trazabilidad y tendencias.
*   **Componentes**:
    *   **Header**: Score de riesgo y metadatos.
    *   **Tendencias**: Gráfico de línea (Critical/High/Medium) a lo largo del tiempo.
    *   **Historial**: Tabla completa de escaneos con filtros y configuración usada.

#### 3.5 Estructura de Rutas Propuesta

##### Contexto Global
*   `/` -> Dashboard Unificado.
*   `/settings` -> Configuración de Cuenta/Organización.

##### Contexto SAST (SecureTag AI)
*   `/sast` -> Dashboard específico de SAST.
*   `/sast/new` -> Nuevo Escaneo (Wizard).
*   `/sast/projects` -> Lista de proyectos SAST.
*   `/sast/projects/:id` -> Historial de escaneos del proyecto.
*   `/sast/report/:taskId` -> Reporte de resultados.

##### Contexto Futuro (WAF, OSINT)
*   `/waf/*`
*   `/osint/*`

#### 3.6 Gestión de Organización y Facturación (Nuevas Vistas)
**Estado**: 🟢 Completado (Lógica Backend & Frontend Integrada)
Estas vistas son requeridas para los roles de "Admin de Organización" y "Solo User".

##### A. Gestión de Organización (`OrganizationPage`)
*   **Estado**: ✅ Completado (Identity Linking & Owner Protection)
*   **Ruta**: `/settings/organization`
*   **Objetivo**: Administración de miembros del equipo.
*   **Componentes**:
    *   **Header**: Nombre de la Organización + Total Miembros.
    *   **Members Table**:
        *   Columnas: Usuario (Avatar+Email), Rol (Admin/Member), Estado (Activo/Invitado), Último Acceso.
        *   Acciones: Editar Rol, Revocar Acceso.
        *   **Seguridad**: Protección contra eliminación del Owner e impedimento de auto-degradación.
    *   **Invite User**: Funcionalidad conectada a la API `/api/v1/tenant/invite`.

##### B. Facturación y Créditos (`BillingPage`)
*   **Estado**: 🟡 UI Implementada en Mock - Lógica de Pasarela Pendiente
*   **Ruta**: `/settings/billing`
*   **Objetivo**: Control financiero y de consumo.
*   **Componentes**:
    *   **Credit Balance**: Widget destacado con saldo actual.
    *   **Top-up Zone**: Tarjetas rápidas para compra de paquetes de créditos (10, 50, 100).
    *   **Usage History**: Tabla de consumo (Fecha, Usuario, Acción/ScanID, Costo).
    *   **Billing History**: Lista de facturas/recibos pasados.

##### B. Account Settings (`AccountPage`)
*   **Estado**: ✅ Completado
*   **Ruta**: `/settings/account`
*   **Objetivo**: Configuración personalizada del usuario.
*   **Componentes**:
    *   **Profile Section**:
        *   **Avatar**: Nuevo diseño circular con borde neón (`border-blue-500/30`), overlay de gradiente y efecto de "scanlines" sutiles. Imagen estática `ST-blanco.png` integrada.
        *   **Datos de Identidad**:
            *   Nombre Completo dinámico (First + Last Name).
            *   Job Title y Phone Number reales obtenidos de la base de datos.
            *   Alineación a la izquierda para mejor lectura.
    *   **Contact Info**: Formulario editable para actualizar email, username, y password.
    *   **About Section**: Campo editable para una breve descripción del usuario.

### 3.7 Vistas Superadmin / System Owner (Adaptación)
**Estado**: 🔴 Pendiente de Implementación
Estas vistas aprovechan el template de administración existente de OpenSaaS, adaptándolo a las necesidades de seguridad.

#### A. System Dashboard (`/admin`)
*   **Base**: `src/admin/dashboards/analytics/AnalyticsDashboardPage.tsx`
*   **Métricas a Agregar (KPIs Ciberseguridad)**:
    *   **Global Threat Monitor**: Contador de ataques bloqueados (WAF) en todos los tenants.
    *   **System Health**: Estado de los microservicios de Securetag (Backend API, AI Engine).
    *   **Resource Usage**: Consumo global de créditos y almacenamiento.
    *   **Global Vulnerabilities**: Total de hallazgos críticos detectados en la plataforma.

#### B. Gestión de Tenants (`/admin/users`)
*   **Base**: `src/admin/dashboards/users/UsersDashboardPage.tsx`
*   **Adaptación**:
    *   Renombrar a "Tenants" o "Customers".
    *   Agregar columnas para "API Key Status" y "Plan Limit".
    *   Permitir asignación manual de créditos (para soporte/ventas).

### 3.8 UX Avanzada y Efectos Visuales (ReactBits & Polish)
**Estado**:  ✅ Completado
Mejoras estéticas y funcionales para elevar la calidad percibida del producto (Wow Factor).

#### A. Efectos Visuales (ReactBits)
1.  **Profile Card Effect**:
    *   **Estado**: ✅ Completado (Command Center)
    *   **Ubicación**: Perfiles de usuario (`/account`).
    *   **Descripción**: Implementada tarjeta interactiva tipo "Command Center" con datos en tiempo real y estética Cyberpunk refinada.
2.  **Letter Glitch Effect**:
    *   **Estado**: ✅ Completado
    *   **Ubicación**: Páginas de Login, Sign Up y Recuperación de Contraseña.
    *   **Descripción**: Aplicado efecto de lluvia de caracteres (Glitch) en el panel lateral de autenticación, reforzando la identidad de marca.

#### B. Páginas de Error Personalizadas
1.  **Página 404 (Not Found)**:
    *   **Estado**: ✅ Completado
    *   **Efecto**: **Fuzzy Text** implementado en el código de error.
    *   **Contenido**: Diseño inmersivo "SYSTEM_FAILURE" sin distracciones de navegación.
2.  **Páginas de Error General (500)**:
    *   **Estado**: ✅ Completado
    *   **Implementación**: Página de alerta crítica con efecto `FuzzyText` gigante en rojo neón (`#FF0055`) y mensajes de "SYSTEM_FAILURE".
    *   **Diseño**: Fondo negro, grid sutil, sin distracciones de navegación.

#### C. Empty States y Placeholders
1.  **Empty States**:
    *   **Estado**: ✅ Completado
    *   **Implementación**: Componente reutilizable `EmptyState.tsx` con diseño Cyberpunk (bordes punteados, iconos con halo) y soporte para acciones (CTA).
    *   **Ubicación**: Implementado en `SastProjectsPage` (Lista de Proyectos) para guiar al usuario a iniciar su primer escaneo.
2.  **Páginas "Coming Soon" (WAF / OSINT)**:
    *   **Estado**: ✅ Completado (Efecto ASCII Fullscreen)
    *   Reemplazados los placeholders por vistas inmersivas de pantalla completa con efecto `ASCIIText` de ReactBits.