# Historial de Cambios — Mi Catálogo

Este archivo es el historial oficial del proyecto. Todo cambio que se realice sobre el código o la configuración debe registrarse aquí antes de darse por terminado.

## Regla

1. Agregar una entrada al inicio de la sección `## Historial` (la más reciente arriba).
2. No editar ni borrar entradas previas.
3. Si el cambio toca varios archivos, listar los relevantes.
4. El skill `change-history` implementa y hace cumplir esta regla.

## Formato

| Campo | Valor |
|---|---|
| Fecha | `AAAA-MM-DD` |
| Tipo | `feat` / `fix` / `refactor` / `config` / `docs` / `test` / `style` |
| Descripción | Qué se hizo y por qué |
| Archivos | Rutas afectadas |
| Decisión clave | Patrón o decisión importante (opcional) |

## Historial

### 2026-08-13 — style — Layout admin con sidebar lateral y vistas responsive
- **Descripción**: El admin dejó de ser dos páginas sueltas con un nav improvisado al pie del dashboard. Se creó `AdminLayoutComponent` (`admin/layout/`) que envuelve las rutas hijas con un sidebar fijo (Dashboard, Configuración de contacto, Cerrar sesión); en móvil (< 768px) el sidebar colapsa a un drawer con botón hamburguesa + backdrop. El routing de `admin` ahora usa un componente padre con `children`. El dashboard perdió su nav inferior y el logout (viven en el layout) y es responsive: métricas con `flex-wrap` y tablas con wrapper `.table-scroll` (scroll horizontal en pantallas angostas). `contact-settings` dejó de depender de la clase global `container`. `AppComponent` detecta la ruta `/admin` (`router.events` + `NavigationEnd`) y oculta el header público (con el carrito) y el footer en la vista admin.
- **Archivos**: `src/app/admin/layout/admin-layout.component.ts|html|scss` (nuevo), `src/app/admin/admin-routing.module.ts`, `src/app/admin/admin.module.ts`, `src/app/admin/pages/dashboard/dashboard.component.html|scss|ts`, `src/app/admin/pages/contact-settings/contact-settings.component.html`, `src/app/app.component.ts|html`, `docs/ARCHITECTURE.md`
- **Decisión clave**: Patrón layout + children con `router-outlet` anidado (mismo patrón que el resto de módulos lazy). Sidebar fijo en desktop, drawer en móvil con un único breakpoint (768px) — sin librerías, solo CSS + `*ngIf` para el backdrop.
- **Verificación**: `ng build --configuration production` OK, 8/8 specs OK.

### 2026-08-13 — feat — Contacto configurable desde el admin (API, no mock)
- **Descripción**: El contacto del negocio (WhatsApp/Instagram/Telegram) dejó de ser constante de build + localStorage y pasa a ser dato persistido en MongoDB (`Config`, doc único `site`) con API `GET /api/config` (público) y `PUT /api/config` (admin JWT). En frontend, `MockContactService` se reemplazó por `HttpContactService` (misma abstracción `ContactService`, cachea en `BehaviorSubject` con un solo GET por sesión). Nueva página admin `contact-settings` en `/admin/contact` (FormModule) con link desde el dashboard. Se eliminó `contact` de `environment.ts`/`environment.prod.ts` y del `deploy.yml` (secrets `WHATSAPP_*`/`INSTAGRAM_*`/`TELEGRAM_*` obsoletos). `ContactConfig` se movió a `core/models/contact.model.ts`. Seed siembra la config con placeholders.
- **Archivos**: `backend/models/Config.js` (nuevo), `backend/routes/config.js` (nuevo), `backend/server.js`, `backend/seed.js`, `src/app/core/services/http-contact.service.ts` (nuevo), `src/app/core/services/http-contact.service.spec.ts` (nuevo), `src/app/core/services/mock-contact.service.ts` (eliminado), `src/app/core/services/contact.service.ts`, `src/app/core/models/contact.model.ts` (nuevo), `src/app/core/models/environment.model.ts`, `src/app/app.module.ts`, `src/app/app.component.ts`, `src/app/app.component.spec.ts`, `src/app/cart/components/cart-summary/cart-summary.component.ts`, `src/app/admin/pages/contact-settings/*` (nuevo), `src/app/admin/admin.module.ts`, `src/app/admin/admin-routing.module.ts`, `src/app/admin/pages/dashboard/*`, `src/environments/environment.ts`, `src/environments/environment.prod.ts`, `.github/workflows/deploy.yml`, `angular.json` (fix preexistente: faltaba `stylePreprocessorOptions.includePaths` en target test), `docs/adr/006-contacto-configurable-admin.md` (nuevo), `README.md`, `docs/ARCHITECTURE.md`
- **Decisión clave**: La abstracción `ContactService` se diseñó para esto — el reemplazo del mock por la implementación HTTP fue un cambio de provider en `AppModule`. El contacto es dato de negocio (base), no config de build (env). Pruebas: build producción OK, 8/8 specs OK, flujo local verificado (login, PUT 401 sin token / 200 con token, GET público, orden CAR-XXXXX confirmada con descuento de stock 25→23) contra la base `lcapp-dev`.

### 2026-08-12 — config — Dev local aislado de producción con DB `lcapp-dev` en Atlas
- **Descripción**: Para probar localmente sin ensuciar los datos reales, el `backend/.env` local ahora apunta su `MONGODB_URI` a la base `lcapp-dev` (mismo cluster M0 de Atlas, base separada de la de producción `lcapp`). Se corrió `yarn seed` una vez (4 categorías, 9 productos) y se verificó que el backend local sirve `GET /api/health`, `/api/categories` y `/api/products` desde esa base. Producción (Render + Atlas `lcapp`) no se toca porque lee sus propias env vars.
- **Archivos**: `backend/.env` (solo local, gitignoreado), `README.md`, `docs/ARCHITECTURE.md`
- **Decisión clave**: Aislamiento de dev con costo cero: en lugar de instalar MongoDB local o Docker (no disponible en la máquina) o un json-server (que no puede replicar la lógica de negocio del backend: JWT, descuento de stock, stats), se usa una segunda base en el mismo cluster gratuito de Atlas. json-server quedó descartado porque el frontend depende de lógica de negocio del backend, no de CRUD plano.

### 2026-08-12 — config — Skill docs-sync + regla de documentación en AGENTS.md
- **Descripción**: Para que la documentación no vuelva a desactualizarse, se creó el skill `skills/docs-sync/SKILL.md` (mismo formato que `no-env-leak`) con una tabla de decisión que mapea cada tipo de cambio con el doc que debe actualizarse, y una regla obligatoria en `AGENTS.md` que obliga a sincronizar `README.md`/`docs/ARCHITECTURE.md` antes de dar por terminada la tarea. Se agregó el check de docs al pre-flight checklist.
- **Archivos**: `skills/docs-sync/SKILL.md` (nuevo), `AGENTS.md`
- **Decisión clave**: La doc se mantiene con dos niveles (README = quickstart, ARCHITECTURE = mapa) y se actualiza solo cuando el cambio toca estructura — no en cada micro-fix. La regla vive en AGENTS.md y el skill la ejecuta, igual que el patrón `change-history`.

### 2026-08-12 — docs — Mapa del mundo: README actualizado y ARCHITECTURE.md
- **Descripción**: El README quedó anclado en la etapa "frontend-only con JSONs" y desorientaba al entrar al repo. Se actualizó al estado real (stack Angular + Node/Express + MongoDB, estructura con `backend/`, cómo correr los dos procesos, despliegue Pages/Render/Atlas, tabla de endpoints y secrets por entorno). Se creó `docs/ARCHITECTURE.md` como mapa del sistema completo: diagrama de piezas, flujo de compra end-to-end (carrito → código CAR-XXXXX → contacto → orden → confirmación con descuento de stock), frontera de datos (core/services), decisión de sesión en memoria + storage best-effort, y variables de entorno sin valores reales.
- **Archivos**: `README.md`, `docs/ARCHITECTURE.md` (nuevo)
- **Decisión clave**: La documentación de onboarding va en dos niveles — README = puerta de entrada (quickstart), ARCHITECTURE.md = mapa profundo (cómo funciona el todo). Sin secretos en los docs; solo nombres de variables.

### 2026-08-12 — fix — Login falla cuando localStorage está lleno (QuotaExceededError)
- **Descripción**: El login contra el backend respondía 200 pero el frontend mostraba "No se pudo iniciar sesión. Intenta de nuevo." Causa raíz: el `tap()` que persistía el token en `localStorage` lanzaba `QuotaExceededError` (storage lleno), la excepción caía en `catchError` y se mostraba el mensaje genérico aunque el POST hubiera sido exitoso. Se hizo `AuthService` resiliente: la sesión vive en memoria (`BehaviorSubject`) y `localStorage` es persistencia best-effort dentro de `try/catch`; `isAuthenticated()`/`getToken()` usan memoria primero y storage como fallback.
- **Archivos**: `src/app/core/services/auth.service.ts`
- **Decisión clave**: El estado de sesión nunca debe depender de que `localStorage` funcione; si la escritura falla la sesión sigue activa en memoria (se pierde al recargar) en vez de bloquear el login.

### 2026-08-12 — chore — Script npm run hash para cambiar la clave admin
- **Descripción**: Script `npm run hash -- "clave"` que genera un hash bcrypt para `ADMIN_PASSWORD_HASH`, validando longitud mínima de 8 caracteres. Facilita el cambio futuro de la clave del admin sin depender de generar el hash a mano.
- **Archivos**: `backend/hash-password.js` (nuevo), `backend/package.json`
- **Decisión clave**: La clave del admin no vive en el código sino en env (`ADMIN_PASSWORD_HASH`); cada ejecución de bcrypt produce un hash distinto y válido del mismo password.

### 2026-08-12 — feat — Admin: login JWT y gestión de órdenes
- **Descripción**: El panel admin ahora se protege con JWT real (`POST /api/auth/login`). Se añadió middleware `authenticate` en las rutas admin de órdenes (GET /, GET /stats, GET /:code, PATCH confirm/cancel); el POST de creación de orden sigue público para el carrito. El frontend deja el mock: `AuthService` consume la API, un interceptor inyecta `Authorization: Bearer` y el dashboard muestra métricas de órdenes, listado con estado, y acciones confirmar/cancelar.
- **Archivos**: `backend/routes/auth.js` (nuevo), `backend/middleware/auth.js` (nuevo), `backend/routes/orders.js`, `backend/server.js`, `backend/.env.example`, `backend/package.json`; `src/app/core/interceptors/auth.interceptor.ts` (nuevo), `src/app/core/services/auth.service.ts`, `src/app/core/services/order.service.ts`, `src/app/core/models/order.model.ts`, `src/app/core/models/user.model.ts`, `src/app/app.module.ts`, `src/app/auth/pages/login/*`, `src/app/admin/pages/dashboard/*`
- **Decisión clave**: Credenciales de admin vía env (`ADMIN_USER` + `ADMIN_PASSWORD_HASH` bcrypt + `JWT_SECRET`), sin modelo de usuarios en Mongo. Confirmar orden descuenta stock; cancelar solo aplica a pendientes.

### 2026-08-12 — feat — Carrito registra pedido en el backend al contactar
- **Descripción**: Al tocar WhatsApp/Instagram/Telegram en el resumen del carrito, el pedido se registra en el backend (`POST /api/orders`) con un estado loading; al confirmarse, se guarda el código real del backend en el carrito y se abre el canal con ese código. Anti-duplicados: si el carrito ya registró una orden, reutiliza el código sin re-enviar. `customerName` pasó a ser opcional (default `Cliente web`) porque el registro es anónimo hasta la conversación.
- **Archivos**: `backend/routes/orders.js`, `src/app/core/models/order.model.ts`, `src/app/core/models/cart.model.ts`, `src/app/core/services/order.service.ts`, `src/app/core/services/cart.service.ts`, `src/app/cart/components/cart-summary/*`
- **Decisión clave**: El registro es anónimo (no se pide nombre/teléfono); la confirmación y los datos del cliente se resuelven por la conversación, y el admin aplica el estado (aprobado/rechazado) desde su panel.

### 2026-08-12 — feat — Catálogo consume la API del backend
- **Descripción**: `CatalogService` dejó de leer `assets/data/*.json` y ahora consume la API (`environment.apiUrl` + `/categories`, `/products`). Se agregó `apiUrl` al modelo `Environment` y al CI (inyectado por secret `API_URL` en prod; local apunta a `localhost:3000` para desarrollo con el backend o Mockoon). El backend ajustó su shape para cumplir el contrato del frontend: `categoryId` como string (se quitó el populate) y `id` generado por imagen en el `toJSON`. CORS del backend ahora configurable por env var `CORS_ORIGIN` (por defecto `*`).
- **Archivos**: `src/app/core/services/catalog.service.ts`, `src/app/core/models/environment.model.ts`, `.github/workflows/deploy.yml`, `backend/models/Product.js`, `backend/routes/products.js`, `backend/server.js`, `backend/.env.example`
- **Decisión clave**: Dev y prod se separan vía `environment`: local usa `http://localhost:3000/api` (backend real o Mockoon en el mismo puerto); prod usa la URL de Render inyectada por el CI. El contrato de datos lo define el frontend (shape de los JSON que ya existían).

### 2026-08-08 — config — Base de datos MongoDB: `lcapp` en vez de `test`
- **Descripción**: La connection string en `backend/.env` no especificaba nombre de base → MongoDB guardaba los datos en `test` (default). Se agregó `/lcapp` antes del `?` para usar una base con nombre propio y se re-ejecutó el seed (4 categorías, 9 productos). La base `test` (con la orden de prueba `CAR-BHOE7`) se elimina desde Atlas Data Explorer.
- **Archivos**: `backend/.env` (gitignoreado, no se commitea)
- **Decisión clave**: Nunca dejar que Mongo use la base default `test` — el nombre de la base va en la connection string. El seed solo toca catálogo; las órdenes sobreviven a un re-seed.

### 2026-08-08 — feat — Backend Node.js + Express + MongoDB
- **Descripción**: Se creó el backend en `backend/` (Express + Mongoose): modelos Category/Product/Order (basados en los JSON de assets y el ADR-009), rutas de catálogo (GET categories/products), órdenes completas (crear con código `CAR-XXXXX`, confirmar con descuento de stock, cancelar, stats) y script de seed que carga los datos de assets a MongoDB. Conectado a MongoDB Atlas (cluster M0 FREE) y verificado end-to-end.
- **Archivos**: `backend/` completo (`server.js`, `seed.js`, `models/`, `routes/`, `package.json`, `package-lock.json`, `.env.example`)
- **Decisión clave**: Los modelos devuelven `id` (no `_id` de Mongo) vía `toJSON.transform` para mantener el contrato del frontend. `backend/.env` está en `.gitignore` (no-env-leak). `.gitignore` ahora ignora `node_modules/` en cualquier nivel (antes solo `/node_modules` raíz).

### 2026-08-08 — docs — ADR-005: backend Node.js + Express + MongoDB
- **Descripción**: Se heredó del proyecto anterior (catalogApp) el ADR-005 que decide Node.js + Express + MongoDB como backend futuro. El backend vivirá en `LCApp/backend/` dentro del mismo repo. Se adaptó al formato local de ADR y al contexto actual de LCApp.
- **Archivos**: `docs/adr/005-backend-nodejs-mongodb.md`
- **Decisión clave**: No se reabre el debate de stack — se hereda la decisión ya tomada (Node+Express+Mongo) y se registra el costo de migración del auth mock a JWT real.

### 2026-08-08 — fix — CI: servir SPA en GitHub Pages con 404.html
- **Descripción**: Navegar directamente a `/LCApp/admin` (o cualquier subruta) daba 404 en GitHub Pages porque el servidor estático busca un archivo físico `admin/index.html` que no existe. Se agregó un paso al workflow que copia `index.html` → `404.html`. GitHub Pages sirve `404.html` ante cualquier ruta inexistente → Angular arranca y resuelve la ruta del SPA. URLs limpias, sin hash routing.
- **Archivos**: `.github/workflows/deploy.yml`
- **Decisión clave**: Opción A (404.html trick) sobre HashLocationStrategy para no cambiar el código de la app ni ensuciar las URLs.

### 2026-08-08 — docs — Flujo de trabajo con Git (rama + PR)
- **Descripción**: Se documentó en el README la política de ramas y PR ahora que `master` está protegida (push directo bloqueado, requiere PR con aprobación). Incluye naming de ramas (`type/descripcion`), conventional commits y pasos del flujo.
- **Archivos**: `README.md`
- **Decisión clave**: La protección de rama es config de GitHub (no se versiona); el README la documenta para que el flujo sea reproducible por cualquier colaborador.

### 2026-08-08 — fix — CI: inyectar también environment.ts de desarrollo
- **Descripción**: El workflow fallaba con `MissingFileReplacementException: src/environments/environment.ts path in file replacements does not exist`. El `fileReplacements` de `angular.json` valida que existan tanto la entrada (`environment.ts`) como la salida (`environment.prod.ts`), y ninguna existe en el checkout (ambas gitignoreadas, git no rastrea directorios vacíos). Se amplió el paso de inyección para crear ambos archivos: `environment.ts` con placeholders vacíos (nunca usado en build prod) y `environment.prod.ts` con los secrets.
- **Archivos**: `.github/workflows/deploy.yml`
- **Decisión clave**: Mantiene `no-env-leak` (ningún environment se commitea; solo existen en el checkout del CI). El `environment.ts` con valores vacíos es seguro porque el build de producción usa `fileReplacements` y solo se compila el `.prod.ts`.

### 2026-08-08 — fix — CI: crear src/environments antes de inyectar secrets
- **Descripción**: El workflow de GitHub Pages fallaba con `ENOENT: src/environments/environment.prod.ts`. Causa raíz: el directorio no existe en el checkout del CI (ambos environments están gitignoreados y git no rastrea carpetas vacías). Se añadió `fs.mkdirSync('src/environments', { recursive: true })` antes del `writeFileSync`.
- **Archivos**: `.github/workflows/deploy.yml`
- **Decisión clave**: `mkdirSync` con `recursive: true` es idempotente, así que cubre tanto el checkout del CI (directorio ausente) como builds locales (directorio presente).

### 2026-08-08 — docs — README real + CI de GitHub Pages
- **Descripción**: `README.md` pasó del boilerplate de Angular CLI a la documentación real del proyecto (stack, funcionalidades, cómo correr, configuración de contacto, estructura y convenciones). Se creó `.github/workflows/deploy.yml` para deploy automático a GitHub Pages en push a `master`: instala deps, inyecta `environment.prod.ts` desde GitHub Secrets (`WHATSAPP_NUMBER`, `WHATSAPP_DISPLAY`, `INSTAGRAM_HANDLE`, `TELEGRAM_HANDLE`) y publica `dist/catalog`.
- **Archivos**: `README.md`, `.github/workflows/deploy.yml`
- **Decisión clave**: El workflow replica el patrón probado del proyecto viejo (catalogApp) y respeta `no-env-leak` (los datos reales solo entran por secrets en CI; el `environment.prod.ts` local permanece gitignoreado). La salida es `dist/catalog` (Angular 15), no `dist/catalog/browser` como en Angular 19.

### 2026-08-08 — feat — Header cliente: solo marca + carrito con badge
- **Descripción**: El header dejó de mostrar Inicio, Carrito, Admin, Ingresar y el estado de sesión: el cliente no debe saber que existen el panel admin ni el login. Ahora solo muestra la marca (lleva a la home) y un icono de carrito (SVG inline, sin librería de iconos) con badge con la cantidad de productos, navegando a `/cart`. Se eliminó el uso de `AuthService` en el componente; las rutas `/admin` y `/login` siguen accesibles por URL para el dueño.
- **Archivos**: `src/app/shared/components/header/header.component.ts`, `header.component.html`, `header.component.scss`
- **Decisión clave**: La navegación de gestión (admin/login) queda fuera del alcance del cliente; el header público se reduce a marca + carrito. El SVG es inline para no depender de una librería de iconos.

### 2026-08-08 — docs — Enmienda ADR-002 tras migración a assets JSON
- **Descripción**: En lugar de crear un ADR nuevo, se enmendó `docs/adr/002-frontera-datos-observables.md` para reflejar que la frontera de catálogo ya usa `HttpClient` sobre assets JSON (la decisión "hoy mock, mañana HttpClient" se cumplió). Cambios menores de implementación (breadcrumbs, enlaces de redes, budgets) no requieren ADR propio: el razonamiento queda en `HISTORIAL.md`.
- **Archivos**: `docs/adr/002-frontera-datos-observables.md`
- **Decisión clave**: Los ADR registran decisiones de arquitectura con sus alternativas; el historial registra toda tarea. Solo se crea ADR nuevo ante una decisión de arquitectura real.

### 2026-08-08 — refactor — Datos de catálogo movidos a assets JSON + HttpClient
- **Descripción**: Categorías y productos dejaron de estar hardcodeados en `CatalogService` y pasaron a `src/assets/data/categories.json` y `products.json`. El servicio ahora usa `HttpClient` (rutas relativas) con manejo de error unificado (`handleError` que loguea y devuelve un `Error` claro). Se registró `HttpClientModule` en `AppModule`. Los consumidores (`category-list`, `product-list`, `product-detail`, `dashboard`) muestran ahora estados visibles de carga y error en lugar de tragar fallos.
- **Archivos**: `src/assets/data/categories.json`, `src/assets/data/products.json`, `src/app/core/services/catalog.service.ts`, `src/app/app.module.ts`, `src/app/home/pages/category-list/`, `src/app/catalog/pages/product-list/`, `src/app/catalog/pages/product-detail/`, `src/app/admin/pages/dashboard/`
- **Decisión clave**: Datos ≠ código: el contenido del catálogo vive en assets y el servicio es la única frontera (`HttpClient` hoy, API remota mañana sin tocar componentes). El contacto NO migra a assets porque es configuración (vive en `environment` + `localStorage`).

### 2026-08-08 — feat — Breadcrumb completo en detalle: Inicio > Categoría > Producto
- **Descripción**: El breadcrumb del detalle de producto solo mostraba Inicio > Producto. Ahora carga la categoría desde `categoryId` de la ruta y muestra Inicio > Nombre de categoría (enlazado al listado `/catalog/:categoryId`) > Nombre de producto. Se centralizó la construcción en `updateBreadcrumb()` que se recalcula cuando llega la categoría o el producto.
- **Archivos**: `src/app/catalog/pages/product-detail/product-detail.component.ts`
- **Decisión clave**: El breadcrumb de detalle usa los tres niveles disponibles en la ruta anidada, con la categoría como link intermedio.

### 2026-08-08 — feat — Breadcrumb en el listado de productos por categoría
- **Descripción**: El breadcrumb solo aparecía en el detalle de producto. Se agregó a `product-list` (Inicio > Nombre de categoría) cargando el nombre desde `getCategoryById` al inicializar y reemplazando el enlace "← Volver a categorías". Se mantiene el mismo componente `app-breadcrumbs` de `SharedModule`.
- **Archivos**: `src/app/catalog/pages/product-list/product-list.component.ts`, `src/app/catalog/pages/product-list/product-list.component.html`
- **Decisión clave**: El listado muestra el breadcrumb con la categoría como item actual (sin link), idéntico al patrón del detalle.

### 2026-08-08 — fix — Enlaces de redes activos con datos por defecto + merge sin vacíos
- **Descripción**: El botón WhatsApp del carrito no navegaba porque `MockContactService` devolvía contactos vacíos: el environment tenía `''` (los links caían a `#`). Se llenaron `environment.ts` y `environment.prod.ts` con datos de ejemplo (mismo placeholder del proyecto viejo: `+52 123 456 7890`, `@tu_usuario`) y se corrigió el merge en `getStoredContact()` para que un `contact_config` previo en `localStorage` con strings vacíos no pise los defaults del environment.
- **Archivos**: `src/environments/environment.ts`, `src/environments/environment.prod.ts`, `src/app/core/services/mock-contact.service.ts`
- **Decisión clave**: Los valores de ejemplo permiten que wa.me/instagram/telegram abran de verdad; el negocio real los reemplaza localmente o por CI vía GitHub Secrets (regla `no-env-leak`).

### 2026-08-08 — config — Environment de contacto + seeds para enlaces de redes sociales
- **Descripción**: Se creó `src/environments/` con `environment.ts` (dev) y `environment.prod.ts` (prod) para configurar el contacto del negocio (número WhatsApp, Instagram, Telegram). Se conectó `fileReplacements` en `angular.json` (config producción) y se amplió `Environment` en `core/models/environment.model.ts`. `MockContactService` ahora siembra los defaults desde `environment.contact` (con override por `localStorage`), de modo que los enlaces de WhatsApp/Instagram/Telegram del footer y del resumen del carrito dejan de caer en `#` y navegan de verdad: WhatsApp abre `wa.me/<número>` con mensaje prefabricado que incluye el código de carrito, Instagram/Telegram abren el perfil.
- **Archivos**: `src/environments/environment.ts`, `src/environments/environment.prod.ts`, `src/app/core/models/environment.model.ts`, `src/app/core/services/mock-contact.service.ts`, `angular.json`, `.gitignore`
- **Decisión clave**: Siguiendo `no-env-leak`, ambos environment quedan en `.gitignore` con placeholders vacíos; los valores reales del negocio se cargan localmente (nunca commiteados) y/o se inyectan por CI en build.

### 2026-08-08 — feat — Flujo de compra por código + detalle de producto y contacto configurables
- **Descripción**: El carrito deja de ser un mapa y pasa a ser una entidad persistida con código (`CAR-XXXXX`) con la que el cliente finaliza la compra por redes sociales; se agregó el detalle de producto (galería, descuentos, stock) y la config de contacto (WhatsApp/Instagram/Telegram) consumida por el footer y el resumen del pedido. Se migró `CatalogService` a Observables y se añadió `getProductById`, `getCategoryById`, `getProducts`; los consumidores (`category-list`, `product-list`, `dashboard`) migraron de `.then()` a `subscribe`. Nueva frontera de datos de contacto: abstracción `ContactService` + mock persistido en `localStorage` inyectado en `AppModule`. Se crearon `cart-item` y `cart-summary` (resumen con código, envío gratis, subtotal con descuento, botones de redes con mensaje prefabricado) y la vista `cart-view` con breadcrumbs, estados vacío/carga y feedback visual. Pipe `currencyFormat` (MXN) y `Breadcrumbs` movidos a `SharedModule`. Ruta de detalle anidada `catalog/:categoryId/product/:productId` con breadcrumb. Footer de `AppComponent` con datos de contacto.
- **Archivos**: `src/app/core/models/` (cart, environment, product, category, breadcrumb), `src/app/core/services/` (cart, catalog, contact, mock-contact), `src/app/catalog/` (módulo, rutas, product-list, product-detail, product-gallery), `src/app/cart/` (módulo, cart-view, cart-item, cart-summary), `src/app/shared/` (pipes/currency-format, components/breadcrumbs, shared.module), `src/app/home/pages/category-list/`, `src/app/admin/pages/dashboard/`, `src/app/app.module.ts`, `src/app/app.component.{ts,html,scss}`, `src/styles/_variables.scss` (`$color-footer-text-muted`), `angular.json` (budget `anyComponentStyle` 3kb/6kb), `docs/adr/001-flujo-compra-codigo.md`, `docs/adr/002-frontera-datos-observables.md`
- **Decisión clave**: Compra sin pasarela: el código de carrito es la pieza de trazabilidad del pedido (ADR-001); frontera de datos reactiva uniforme (Observables) y reemplazable por `HttpClient` cambiando una línea en `AppModule` (ADR-002).

### 2026-08-08 — style — Fix layout: hero full-bleed y contenido centrado en contenedor
- **Descripción**: Se corrigió el margen enorme que se veía en pantallas anchas: el `<main>` dejó de imponer el `.container` de 1100px sobre todas las rutas, así el hero de la home ahora es full-bleed (gradiente de borde a borde). Cada página aplica `.container` a su contenido interno; el `.container` global solo da padding horizontal.
- **Archivos**: `src/app/app.component.html`, `src/styles/_base.scss`, `src/app/home/pages/category-list/` (`html` + `scss`), `src/app/catalog/pages/product-list/`, `src/app/cart/pages/cart-view/`, `src/app/auth/pages/login/`, `src/app/admin/pages/dashboard/` (html)
- **Decisión clave**: El ancho de contenido ya no se impone desde el shell (`app-root`); el componente de página decide si usa `.container` (centrado 1100px) o full-bleed, replicando el patrón del proyecto anterior.

### 2026-08-08 — style — Rebranding visual: paleta "L'Essence de Cerise"
- **Descripción**: Se trajo el design system del proyecto anterior (catalogApp) y se aplicó al cascarón vanilla. Paleta cerise/gold sobre fondo crema (`#8B2252`, `#C9A96E`, `#D4739D`, `#F5E6E0`), tipografías Google Fonts (DM Serif Display para títulos + DM Sans para texto), hero con gradiente rosa, header crema translúcido con monograma "LC", cards blancas con borde dorado y hover elevado, badges gold pill, precios dorados y footer cherry. Los componentes renombrados a `.scss` migran a la paleta nueva; se eliminaron tokens obsoletos (`$color-success`, etc.).
- **Archivos**: `src/styles/_variables.scss`, `src/styles/_base.scss`, `src/index.html`, `shared/components/header/`, `home/pages/category-list/`, `catalog/pages/product-list/`, `cart/pages/cart-view/`, `auth/pages/login/`, `admin/pages/dashboard/`, `app.component.{html,scss,ts}`
- **Decisión clave**: La marca se expresa exclusivamente vía tokens en `_variables.scss`; ningún color/letra hardcodeado en los componentes. El layout de `app-root` pasa a flex column con `main { flex: 1 }` para anclar el footer al fondo.

### 2026-08-08 — docs — Import de skills y reglas del proyecto anterior (catalogApp)
- **Descripción**: Se rescataron y adaptaron al stack vanilla las convenciones del proyecto viejo (Angular 19 + Tailwind, descartado). Se crearon los skills de proyecto `catalog-component` (workflow modelo → mock → servicio → componente → ruta → build, con NgModules + SCSS) y `no-env-leak` (nunca commitear `environment*.ts` con datos reales). Se extendió `AGENTS.md` con commit policy, política de entornos/secretos, pre-flight checklist, manejo de errores, accesibilidad, performance, testing y convención ADR. El viejo `changelog-discipline` ya estaba cubierto por `change-history`.
- **Archivos**: `skills/catalog-component/SKILL.md`, `skills/no-env-leak/SKILL.md`, `AGENTS.md`, `.atl/skill-registry.md`
- **Decisión clave**: Los skills nuevos viven en `skills/` del proyecto (scope `project`) y quedan indexados en el registro; el ADR de cada decisión de arquitectura futura se registrará en `docs/adr/`.

### 2026-08-08 — refactor — Migración de CSS puro a SCSS con tokens compartidos
- **Descripción**: El proyecto deja de usar CSS puro y pasa a SCSS, el preprocesador estándar de Angular, manteniendo la estética vanilla (sin Tailwind ni frameworks de utilidades). Se centralizaron los valores de diseño en `_variables.scss` (colores, espaciado, radios, sombras) y los estilos de componentes se refactorizaron con anidado y `@use`.
- **Archivos**: `angular.json` (styles + `stylePreprocessorOptions.includePaths`), `src/styles.scss` + `src/styles/_variables.scss` + `src/styles/_base.scss`, 7 `*.component.css` → `*.component.scss` y sus `*.component.ts`
- **Decisión clave**: Todos los componentes consumen tokens de `_variables.scss` vía `@use 'styles/variables'` (resuelto por `includePaths: ["src"]`), evitando colores hardcodeados duplicados.

### 2026-08-07 — feat — Sistema de historial de cambios
- **Descripción**: Se creó la convención de historial (este archivo), la regla de proyecto en `AGENTS.md` y el skill `change-history`, que obliga a registrar cada cambio antes de cerrar la tarea.
- **Archivos**: `HISTORIAL.md`, `AGENTS.md`, `C:\Users\Enilio\.config\opencode\skills\change-history\SKILL.md`
- **Decisión clave**: Ningún cambio se considera terminado sin su entrada en este historial.

### 2026-08-07 — feat — Cascarón del proyecto (creación inicial)
- **Descripción**: Proyecto Angular 15.2 con catálogo público (categorías → productos con precio), carrito persistente y dashboard admin protegido por login. Módulos con lazy loading y guard de rutas.
- **Archivos**: `src/app/` completo (core, shared, home, catalog, cart, auth, admin), `package.json`, `angular.json`, `src/styles.css`
- **Decisión clave**: Los servicios (`CatalogService`, `CartService`, `AuthService`) son la única frontera de datos; hoy devuelven mock en memoria + localStorage y mañana se reemplazan por `HttpClient` contra una API (MongoDB) sin tocar los componentes.
