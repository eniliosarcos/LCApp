# Arquitectura — L'Essence de Cerise (LCApp)

Este documento es el mapa del sistema completo: qué piezas existen, cómo se conectan, cómo fluye un pedido y dónde vive cada regla. Para el quickstart, ver `README.md`; para la bitácora de cambios, `HISTORIAL.md`; para decisiones puntuales, `docs/adr/`.

## Vista general

Sistema de 3 piezas: una SPA pública, una API y una base de datos, desplegadas por separado.

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│  Frontend (Cloudflare Pages)│  HTTPS │  Backend (Render)        │
│  Angular 15 SPA             │ ─────► │  Express API :3000       │
│                             │  /api  │  /api/health             │
│  home, catalog, cart,       │        │  /api/categories         │
│  login, admin               │        │  /api/products           │
└─────────────────────────────┘        │  /api/orders             │
        │                               │  /api/auth/login         │
        │  contacto por red social      └────────────┬─────────────┘
        ▼                                            │ mongoose
┌─────────────────────────────┐                      ▼
│  WhatsApp / Instagram /     │        ┌──────────────────────────┐
│  Telegram (canal humano)    │        │  MongoDB Atlas (M0 free) │
└─────────────────────────────┘        │  DB: lcapp              │
                                       │  collections: categories,│
                                       │  products, orders        │
                                       └──────────────────────────┘
```

### Cómo corre un request (dev)

1. `ng serve` (4200) sirve la SPA; `npm run dev` (3000) sirve la API.
2. Los servicios usan `environment.apiUrl` → `http://localhost:3000/api`.
3. En prod, `environment.prod.ts` apunta a Render y es inyectado por `scripts/cloudflare-build.sh` desde variables de entorno de Cloudflare.

## Flujo de compra (end-to-end)

```
1. Cliente navega:  home → (filtro por categoría) → detalle de producto
  El home (`/`) muestra hero + cinta deslizable de categorías (chip "Todos" activo por defecto, carga todos los productos activos) + grid de tarjetas (`ProductCardComponent`). Seleccionar un chip filtra en el lugar; la deep link por categoría es `/catalog/:categoryId` (`ProductListComponent`, mismo grid + breadcrumb). El footer se eliminó; el contacto sigue disponible desde el carrito.
 2. Agrega al carrito:  CartService  →  persistencia en localStorage (entidad Cart). El catálogo muestra el estado de stock (badge "En stock" / "¡Últimas X unidades!" / "Agotado") y bloquea el agregado de productos agotados; `CartService` además **topea la cantidad al stock disponible** (defensa en profundidad: la API también valida).
 3. Abre el resumen:  CartSummaryComponent (subtotal, envío gratis, código del carrito)
 4. Toca un canal de contacto (WhatsApp/Instagram/Telegram):
     a. Si no hay orden registrada: OrderService.postOrder()  →  POST /api/orders  (público)
     b. Backend genera código CAR-XXXXX, guarda la orden como 'pending'
     c. El frontend guarda el código real y abre el canal con mensaje prefabricado
     d. Si la orden ya existe, **primero se re-verifica el estado al contactar**
        (OrderService.getOrderStatus()): 'confirmed' → modal "¡Gracias por tu compra!"
        sin redirect (vuelve a home a los 4s); 'cancelled' → aviso y se limpia el código;
        'pending' → sigue el flujo; 404 → aviso "Pedido no encontrado"; error de red →
        degrada y redirige igual (no bloquea el contacto)
     e. Con la orden 'pending' y el carrito modificado (flag `orderModified`):
        OrderService.updateOrderItems()  →  PATCH /api/orders/:code/items  (público, solo 'pending')
        sincroniza items y total; si falla (400/404) se re-verifica el estado (paso 5)
     f. Botón "Actualizar pedido" en el carrito ejecuta el mismo PATCH de forma explícita
        (visible solo con orden registrada, deshabilitado sin cambios pendientes)
 5. Al volver al carrito con una orden registrada, CartSummaryComponent consulta
    el estado real:  OrderService.getOrderStatus()  →  GET /api/orders/:code/status  (público)
      - 'confirmed'  → modal de éxito, clearCart() (vacía todo) y redirect a home
      - 'cancelled' o 404 → clearOrderCode() (conserva items) + aviso; botones de contacto activos
      - error de red → mantiene el estado actual sin romper la UI
 6. El cliente negocia por el canal humano (la confirmación de datos es fuera del sistema)
 7. Admin entra a /admin (login JWT):
      - `AdminLayoutComponent` (sidebar lateral, drawer en móvil) envuelve todas las páginas admin vía rutas hijas: `/admin` (dashboard), `/admin/ventas`, `/admin/orders`, `/admin/products`, `/admin/categories`, `/admin/contact`. En móvil (<768px) hay una barra superior fija (`admin-topbar`) con el hamburguesa + marca "LC · Admin"; la X de cierre vive en el propio sidebar (`.sidebar-close`, porque el drawer tapa el lado izquierdo de la topbar al abrir); el contenido compensa la barra con `padding-top`. Capas: sidebar 55 > topbar 54 > backdrop 53
      - Dashboard: métricas (GET /api/orders/stats) + últimas 5 pendientes (GET /api/orders?page=1&limit=5&status=pending)
      - Ventas (SalesComponent, /admin/ventas): resumen por período calendario con toggle Diario/Semanal/Mensual (GET /api/orders/summary?range=day|week|month). Métricas (Ventas confirmadas, Ingresos, Unidades, Ticket promedio, Canceladas, Tasa de cancelación, Pendientes del período) + tablas "Productos más vendidos" (ordenable por Unidades/Ingreso) y "Por categoría". `avgTicket`/`cancellationRate` se derivan en el componente (getters). Incluye el botón **"+ Registrar venta"** (color rosa distintivo) que abre `ManualSaleModalComponent`: registrar una venta realizada fuera de la página (mostrador, conocido, WhatsApp) → `POST /api/orders/manual`. El link del sidebar "+ Registrar venta" navega a `/admin/ventas?registrar=1` y el modal se abre automáticamente (el query param abre el mismo modal, sin ruta extra)
      - Órdenes: lista paginada con filtro por estado y buscador por código (GET /api/orders?page=&limit=&status=&q=) + confirmar/cancelar; cada fila es clicable y el código es un enlace → /admin/orders/detail/:code
      - Detalle de orden (OrderDetailComponent, GET /api/orders/:code admin): breadcrumb "Órdenes › CÓDIGO" + botón "‹ Volver a Órdenes", datos de cliente, items con subtotal por línea, total, fechas y confirmar/cancelar si está 'pending'
      - Productos: lista con estado (activos e inactivos), alta/edición en modal y activar/desactivar (GET /api/products?all=true + POST/PUT /api/products con JWT). Resaltado de stock sin badges: filas teñidas (rojo `stock === 0`, ámbar `stock <= 10`) y nombre en cursiva; los agotados muestran nombre y número de stock en rojo. Barra de chips "Agotados (N)" / "Stock bajo (N)" que al hacer click **filtran** la tabla (solo productos activos; click de nuevo o "Ver todas" resetea). Umbral único `LOW_STOCK_THRESHOLD = 10` en `product.model.ts` (lo usan catálogo y admin)
      - Categorías: lista + alta/edición en modal (GET /api/categories + POST/PUT /api/categories con JWT)
      - Confirmar/Cancelar (dashboard, órdenes y detalle) pasa primero por `AppConfirmDialogComponent`
        (diálogo de reconfirmación compartido en `SharedModule`); el servicio se llama recién al aceptar
     - Confirma:  PATCH /api/orders/:id/confirm  → valida stock y descuenta
     - Cancela:   PATCH /api/orders/:id/cancel   (solo si está 'pending')
     - Edita contacto: /admin/contact (PUT /api/config)
```

Regla de estados de una orden: `pending → confirmed | cancelled`. Confirmar/cancelar solo es válido desde `pending`. Las **ventas manuales** nacen `confirmed` (con `source: 'manual'`) y descuentan stock al registrarse; las web nacen `pending` y descuentan stock al confirmar.

## Frontera de datos

Toda la entrada/salida de datos vive en `src/app/core/services/` — los componentes nunca llaman `HttpClient` directamente.

| Servicio | Rol |
|---|---|
| `CatalogService` | Catálogo: categorías y productos desde la API (Observables). Público: `getCategories`, `getProducts`, `getProductById`, `getProductBySlug`, `getProductsByCategory`. Admin (JWT vía `AuthInterceptor`): `getAllProducts` (`?all=true` incluye inactivos), `createProduct`, `updateProduct`, `createCategory`, `updateCategory`. `handleError` expone el mensaje del servidor (p. ej. "El SKU ya existe"). |
| `CartService` | Entidad `Cart` persistida en `localStorage`; expone `getCart`, `getCount`, `getTotal` y mutaciones atómicas (`addItem`, `updateQuantity`, `removeItem`, `clearCart`, `restoreCart`, `registerOrder`, `clearOrderCode`, `markOrderSynced`). `addItem` no agrega productos agotados y topea la cantidad al stock; `updateQuantity` limita al stock y elimina el item si el producto quedó sin stock. Rastrea `orderModified` (cambios sobre un carrito con orden registrada). |
| `OrderService` | Pedidos: crear orden desde el carrito (`postOrder`), verificar estado real de una orden registrada (`getOrderStatus`), actualizar items de una orden pendiente (`updateOrderItems`) + operaciones admin (`getOrders(page?, limit?, status?, q?)` → `OrderPage`, `getOrderByCode(code)` → detalle por código, `getStats`, `getSummary(range)` → `OrderSummary`, `createManualOrder(request)` → registra una venta externa, `confirmOrder`, `cancelOrder`). |
| `AuthService` | Login contra `/api/auth/login`; guarda token y usuario; expone `authState`, `getToken`, `logout`. |
| `ContactService` | Abstracción del contacto (redes). Implementación: `HttpContactService` (lee de `GET/PUT /api/config`, cachea en `BehaviorSubject`, un solo GET por sesión). Registro por provider en `AppModule`. |

### Notificaciones (snackbar)

`SnackbarService` (servicio global) + `AppSnackbarComponent` (singleton en `AppComponent`, exportado por `SharedModule`). Cualquier componente dispara avisos con `snackbar.show(message, type, duration, actionLabel?, onAction?)`; el servicio expone un `BehaviorSubject` y el componente auto-cierra con un timer reiniciable. `actionLabel`/`onAction` opcionales habilitan una acción en el aviso (ej. **Deshacer** en "Vaciar carrito", que restaura el carrito con `CartService.restoreCart`). Tipos `success`/`error`/`info` con `role=status`/`role=alert`. Responsive: ancho completo abajo en móvil (< 600px), centrado con `min-width: 344px` en desktop. A diferencia del modal (presentacional `@Input`/`@Output`), el snackbar se controla por servicio por decisión de producto.

Consumidores actuales: `cart-view` (éxito/error al actualizar el pedido; "Tu carrito fue vaciado." con Deshacer), `product-detail` y `product-card` ("«Nombre» agregado al carrito.") y `cart-summary` (error al registrar el pedido). Los avisos "¡Pedido registrado!" y "Modificaste tu carrito…" del `cart-summary` son inline bajo el bloque del código; los estados "Verificando…" y "Registrando…" quedan junto a los botones de contacto.

### Tarjeta de producto compartida

`ProductCardComponent` (`app-product-card`, en `SharedModule`) encapsula la tarjeta de producto del catálogo (media con imagen del carousel, nombre, descripción truncada con `-webkit-line-clamp: 3` + indicador "ver más", badge de stock, precio con descuento tachado y botón "Agregar al carrito"). Entrada: `product`. Es `OnPush` + `ChangeDetectorRef.markForCheck()` porque el timer del estado "added" (1.5s) no re-renderizaba con la estrategia por defecto heredada; limpia el timer en `ngOnDestroy`. Lo usan `HomeComponent` y `ProductListComponent`; el grid (`repeat(auto-fill, minmax(220px, 1fr))`) vive en cada página, la tarjeta es agnóstica del layout.

### Carousel de imágenes compartido

`ProductImageCarouselComponent` (`app-product-image-carousel`, en `SharedModule`) muestra un carrusel de imágenes con auto-play (jitter 1.5–5s, intervalo configurable), pausa en hover, dots clickeables y swipe con CSS scroll-snap. Cuando hay 1 imagen, muestra `<img>` directo sin carousel. `IntersectionObserver` pausa/reanuda el auto-play según visibilidad (ahorra CPU y batería en pestañas en background). Inputs: `images` (ProductImage[]), `autoPlayInterval` (default 4s), `sizes` (srcset sizes attribute). Solo se usa en `ProductCardComponent` (home grid).

### Home (vista del cliente)

`HomeComponent` (`/`, en `HomeModule`) es la portada: hero (título + subtítulo) + **cinta de categorías** + grid de productos. La cinta es un scroll horizontal (`overflow-x: auto`, scrollbar oculto, scroll-snap) con chips: "Todos" fijo al inicio y una chip por categoría; los chips viven en estado del componente (`selectedCategoryId`, sin cambios de URL). La barra muestra **degradados en los bordes y flechas ‹ ›** (desktop y móvil) solo cuando hay overflow y según la posición de scroll: `canScrollLeft`/`canScrollRight` se calculan con `scrollLeft`/`clientWidth`/`scrollWidth` (en `ngAfterViewChecked` y en el evento `scroll`), y la flecha llama a `scrollBy({ left: ±320, behavior: 'smooth' })`. Al seleccionar una categoría la cinta **centra el tab activo** (`scrollIntoView` con `inline: 'center'`); el índice del chip en el DOM suma 1 por el tab "Todos" antepuesto. Es **sticky arriba** bajo el header (`top: 2.75rem`) en desktop y **fixed abajo** (`bottom: 0`, `padding-bottom` en el contenido) en móvil ≤600px: un `sticky bottom` sobre un elemento que arranca arriba en el flujo **nunca se activa** (solo entra en acción si su posición natural viola el borde), por eso en móvil se usa `fixed`. La selección de chip llama a `getProducts()` (todos) o `getProductsByCategory(id)` (filtro client-side de `CatalogService`); cada cambio resetea `loading`/`error` y los estados de error/vacío son visibles. Remplazó a `CategoryListComponent` (que solo mostraba tarjetas de categorías).

El **header** (`HeaderComponent`, solo rutas no-admin) es `position: fixed` (top 0, z-index 50) para que nunca desaparezca al scrollear; `app.component` compensa el alto (2.75rem) con `padding-top` en `main` (la clase `main--no-pad` lo quita en rutas admin). La cinta de categorías del home se pega justo bajo él con `top: 2.75rem`.

### Galería de producto (detail)

`ProductGalleryComponent` (`app-product-gallery`, en `CatalogModule`) muestra la galería de imágenes en `/catalog/:slug`. Entrada: `images` (ProductImage[]). Muestra la imagen principal (primaria o la seleccionada) con `srcset` responsive y `cursor: zoom-in`; si hay 2+ imágenes, una fila de **thumbnails** debajo (4rem × 4rem, borde dorado en activo, scroll horizontal). Click en la imagen principal abre un **lightbox** (`position: fixed`, fondo oscuro 92%) con la imagen a tamaño natural (`max-width: 90vw; max-height: 85vh; object-fit: contain`), flechas `‹` `›`, teclado `←` `→` / `Escape`, y contador `1 / N`. Thumbnails rotos muestran fallback "LC". Se usa `NO_ERRORS_SCHEMA` en tests porque no depende de `ProductImageCarouselComponent`.

### Spinner de carga

`AppLoadingSpinnerComponent` (`app-loading-spinner`, en `SharedModule`) estandariza los estados de carga de toda la app: un anillo animado SCSS puro (`@keyframes spin`, borde `$color-border` con `border-top-color: $color-primary`) sin librerías ni SVG. Entradas: `label?: string` (texto opcional bajo el anillo) y `size?: 'sm'|'md'|'lg'` (default `md`). Accesible: el contenedor lleva `role="status"` + `aria-live="polite"` y el anillo es `aria-hidden`. Se usa bajo `*ngIf="loading"` (o dentro de `ng-template #loading`/`ng-container`) con el texto anterior como `label`. El host es `display:flex; justify-content:center` con `grid-column: 1 / -1` para centrar en grids. En admin, el loading va dentro de un **estado div** `.loading-region` (min-height 320px, centrado) que ocupa la misma región que el contenido (el dashboard envuelve métricas + pendientes en `*ngIf="!loading"`); en catálogo/carrito/home el spinner se coloca dentro del grid/región de contenido existente. Requiere importar `SharedModule` en el módulo consumidor (se agregó a `admin` y `home`, que no lo importaban).

### Diálogo de confirmación (admin)

`AppConfirmDialogComponent` (`app-confirm-dialog`, en `SharedModule`) es un wrapper de `AppModalComponent` para la **reconfirmación** de acciones destructivas/irreversibles. Entradas: `open`, `title`, `message`, `confirmLabel`, `cancelLabel` y `variant: 'confirm' | 'cancel'` (botón verde con `$color-success` o rojo con `$color-danger`); salidas `confirmed`/`cancelled`. Dismissible por backdrop/Esc → emite `cancelled` (equivale a "no hacer nada"). Se usa en las tres superficies de órdenes (dashboard, lista y detalle) como **gate UI puro**: los botones "Confirmar"/"Cancelar" llaman a `requestConfirm`/`requestCancel` (setean `pendingAction` y abren el diálogo) y el servicio se invoca recién al aceptar (`runPendingAction`); los métodos `confirmOrder`/`cancelOrder` no cambiaron. Al cerrar sin aceptar (`closePendingAction`), no se llama a la API.

### Sesión y storage (decisión importante)

`AuthService` mantiene la sesión **en memoria** (BehaviorSubject `session`) y usa `localStorage` como persistencia **best-effort** dentro de `try/catch`. Razón: si `localStorage` está lleno o bloqueado (`QuotaExceededError`), el login fallaba con mensaje genérico aunque el backend respondiera 200. Hoy, un storage roto no bloquea el login; solo hace que la sesión no sobreviva a un refresh.

Reglas derivadas:
- `isAuthenticated()` y `getToken()` consultan memoria primero, storage como fallback.
- `AuthInterceptor` inyecta `Authorization: Bearer <token>` solo a requests cuyo URL empieza con `environment.apiUrl`. Si la respuesta es **401** (token expirado/inválido), limpia la sesión y redirige a `/login`.
- `AuthGuard` protege la ruta `/admin`; redirige a `/login?returnUrl=...`.

## Backend (Express + Mongoose)

```
backend/
  server.js            # express, cors, json, health, monta rutas, conecta Mongo
  routes/auth.js       # POST /login → bcrypt.compare + jwt.sign
  routes/categories.js # GET / (público) + POST / y PUT /:id (admin JWT)
  routes/products.js   # GET / (público, solo activos; ?all=true con token incluye inactivos), GET /:id + POST / y PUT /:id (admin JWT) + DELETE /:id (admin JWT, limpia R2)
  routes/orders.js     # POST / (público; valida stock disponible), GET /:code/status (público), PATCH /:code/items (público, solo pending; valida stock) + admin (JWT): GET / (paginado: ?page&limit&status&q → { orders, total, page, limit, totalPages }), /stats, /manual, /:code, PATCH :id/confirm (valida y descuenta stock), :id/cancel
  routes/config.js     # GET / (público, contacto) + PUT / (admin JWT, upsert doc único 'site')
  routes/images.js     # POST / (admin JWT, upload → R2 → variantes WebP) + DELETE / (admin JWT, limpia URLs de R2)
  middleware/auth.js   # verify Authorization: Bearer JWT (authenticate + authenticateOptional)
  utils/slugify.js     # slugify (sin acentos) + uniqueSlug (garantiza unicidad con sufijo -2, -3…)
  models/              # Category, Product, Order, Config
  seed.js              # carga src/assets/data/*.json → MongoDB + Config de contacto
  hash-password.js     # npm run hash -- "clave" → hash bcrypt
```

### CORS

`CORS_ORIGIN` env var (default `*`); si trae varios orígenes, se separan por comas. Render usa los orígenes de Cloudflare Pages.

### Auth (admin)

- Credenciales vía env, **sin modelo de usuarios en Mongo**: `ADMIN_USER` + `ADMIN_PASSWORD_HASH` (bcrypt) + `JWT_SECRET`.
- `JWT_EXPIRES_IN` opcional, default `12h`.
- El POST de creación de orden y el PATCH de items (`/orders/:code/items`) son **públicos** (el carrito no tiene token); solo las operaciones de gestión son admin. El PATCH solo muta órdenes `pending`. **Ambos validan disponibilidad** (`validateStockAvailability`: el producto existe, está activo y `stock >= cantidad`) → 400 con mensaje claro; al confirmar (`PATCH /:id/confirm`) se revalida y se descuenta stock (chequeo atómico final).

### Catálogo admin (productos y categorías)

- `POST /api/products` y `PUT /api/products/:id` (JWT): validan nombre, categoría existente, `price > 0`, `discountPrice < price`, `stock` entero ≥ 0 y SKU único (400 con mensaje claro). El **slug lo genera el backend** (`slugify` sin acentos + `uniqueSlug` que agrega `-2`, `-3`… si colisiona); el frontend nunca lo envía. `PUT` es parcial (estilo `config.js`): al cambiar `name` se regenera el slug.
- `GET /api/products?all=true`: devuelve también inactivos solo si el token es válido (`authenticateOptional`); sin token se mantiene el comportamiento público (solo `isActive: true`).
- `POST/PUT /api/categories` (JWT): análogos (nombre obligatorio, slug autogenerado/único, descripción e imageUrl opcionales).
- **`DELETE /api/products/:id`** (JWT): elimina el producto y borra sus imágenes de R2. `PUT /api/products/:id` calcula el diff de URLs y borra las huérfanas. `DELETE /api/images` (JWT) limpia URLs específicas de R2 (cancelar uploads pendientes). Para productos, la baja lógica vía `isActive` sigue siendo la forma principal de desactivar.
- Frontend: `CatalogService` agrega los métodos admin; el formulario de producto mapea la imagen a `images[{ url, alt, isPrimary, order, variants }]` (vacía → `images: []`). El modal `AppModalComponent` admite `size: 'sm' | 'md'`. El umbral de "stock bajo" es una constante compartida del dominio: `LOW_STOCK_THRESHOLD = 10` en `product.model.ts` (catálogo: badge/clasificación de `getStockStatus`; admin: resaltado de filas y chips de filtro).

### Self-hosting de imágenes (Cloudflare R2)

- `POST /api/images` (JWT): sube **una** imagen de hasta **5 MB** (JPEG/PNG/WebP/AVIF/GIF, `multer` en memoria). El backend la procesa con `sharp`: corrige orientación (`rotate()`), genera **WebP en 400/800/1200w** (`resize` sin agrandar, quality 80) y las sube a R2 como `products/<uuid>/<width>w.webp` con `Cache-Control: public, max-age=31536000, immutable`. Responde `{ variants: [{ width, url }], primaryUrl }` (200/201). Si algo falla a mitad de subida, borra los objetos ya creados (`DeleteObjectsCommand` best-effort).
- **Render es efímero** → los archivos no viven en el servidor; el backend solo firma y sube al bucket. El frontend sirve las URLs públicas directo desde R2 (los `<img>` no requieren CORS para display).
- `ProductImage` (modelo Mongo) guarda `variants: [{ width, url }]` junto a `url`; `normalizeImages()` los preserva/limpia en `POST/PUT /api/products`. La galería del detalle usa las variantes para `srcset` (`400w/800w/1200w`, `sizes="(min-width: 720px) 520px, 100vw"`) y thumbnails clickeables; productos viejos sin variantes siguen funcionando (sin srcset).
- Frontend: `ImageService.uploadImage(file)` → `POST /api/images` multipart (el `AuthInterceptor` agrega el Bearer); el formulario de producto tiene input de archivo que sube y rellena `imageUrl` + `variants` (mantiene el campo de URL manual para pegadas externas). Los errores del backend (mime, tamaño, procesado) se muestran en el formulario.
- **Eliminación**: `DELETE /api/products/:id` borra imágenes de R2 al eliminar el producto. `PUT /api/products/:id` calcula el diff de URLs y borra las huérfanas. `DELETE /api/images` limpia URLs específicas (cancelar uploads pendientes). Pendiente: custom domain (la `Public Development URL` de R2 es rate-limited, no apta producción).

### Resumen de ventas por período

- `GET /api/orders/summary?range=day|week|month` (JWT, default `week`). Ventanas **calendario** en zona horaria del servidor: `day` = hoy 00:00, `week` = lunes 00:00, `month` = día 1 00:00. Las agregaciones corren en paralelo (`Promise.all`): counts por estado dentro de la ventana + `$unwind` de `items` para `revenue` (Σ price×qty) y `units` + **top 20** productos por unidades + desglose por categoría (2 `$lookup` products→categories; categoría ausente → "Sin categoría"). Se apoya en que `order.items` snapshotea `productName`/`price` → los históricos no cambian aunque el catálogo se edite; solo el desglose por categoría consulta el catálogo actual (categorías no se borran). El frontend deriva `avgTicket` y `cancellationRate`.
- `seed.js` crea **12 órdenes demo** con fechas relativas repartidas en las tres ventanas (auxiliares `startOfWeek`, `startOfMonth`, `beforeWeekStart`) para ejercitar los rangos con números verificables.

### Ventas manuales (registradas fuera de la página)

- `POST /api/orders/manual` (JWT): registra una venta que no pasó por la web (mostrador, conocido, WhatsApp). Body: `{ customerName?, customerPhone?, saleDate?, items: [{ productId, quantity, price? }] }`.
- **Descuenta stock al registrar** (mismo mecanismo que confirmar una orden web) porque la mercancía ya salió del negocio. Precio por defecto = precio efectivo del producto (`discountPrice ?? price`), editable línea por línea (descuentos/negociados). `customerName` opcional, default "Cliente de mostrador". `saleDate` opcional (default hoy), validada para no ser futura; se guarda en `createdAt` y `confirmedAt` para que la venta caiga en la ventana correcta del resumen. **Se permite repetir el mismo producto en varias líneas** (precios distintos por línea); por eso la validación **agrega las cantidades por producto** y compara el total contra el stock disponible antes de descontar (evita sobre-venta: ej. stock 5 con líneas 4+4 → 400).
- Nace `status: 'confirmed'` + `source: 'manual'` y usa código `MAN-XXXXX` (las web siguen `CAR-XXXXX`), así cuenta directo en `stats`, `summary` y la lista. Badge "Manual" junto al código en la lista de órdenes y el detalle.
- Frontend: `ManualSaleModalComponent` (dentro de `/admin/ventas`, abierto por el botón "+ Registrar venta" o por `?registrar=1` desde el sidebar) con **doble confirmación** antes de guardar (reusa `AppConfirmDialogComponent`, igual que Confirmar/Cancelar). Cada línea muestra **cantidad y precio unitario recién al seleccionar el producto** (el precio autocompleta el efectivo, editable). La lista de productos scrollea internamente (`max-height: 40vh`); "+ Agregar producto" queda fijo fuera de esa zona.

### TTL perezoso de órdenes pendientes

Las órdenes `pending` huérfanas (p. ej. cliente que vació el carrito o abandonó el flujo) se auto-cancelan sin cron ni TTL de Atlas: `expireStalePendingOrders()` se ejecuta **bajo demanda** al inicio de `GET /api/orders` (lista admin), `GET /api/orders/stats`, `GET /api/orders/summary` y `GET /api/orders/:code/status` (público), marcando como `cancelled` toda `pending` con `createdAt` más antiguo que `ORDER_TTL_HOURS` (default **48h**). No borra documentos — el historial y las stats se conservan en `cancelled`. Efecto: al ingresar al dashboard admin, las huérfanas vencidas aparecen canceladas de inmediato; el cliente que verifica un código viejo ve `cancelled`. Tradeoff aceptado: el barrido solo corre al leer (una pestaña de admin abierta sin recargar no lo dispara).

## Variables de entorno y secrets

### Frontend (`src/environments/`)

| Variable | Dev | Prod |
|---|---|---|
| `apiUrl` | `http://localhost:3000/api` | inyectada por build (env var `API_URL` de Cloudflare) |

El contacto **no** vive en environments: se configura desde el admin y persiste en Mongo (`Config`, `GET/PUT /api/config`).

`environment.ts` y `environment.prod.ts` están gitignoreados; en el repo viven como placeholders. El build de Cloudflare Pages (`scripts/cloudflare-build.sh`) los regenera antes de `ng build`.

### Backend (`backend/.env`)

| Variable | Uso |
|---|---|
| `PORT` | Puerto (default 3000) |
| `MONGODB_URI` | Connection string de Atlas; prod usa DB `lcapp`, local usa `lcapp-dev` (nunca `test`) |
| `CORS_ORIGIN` | Orígenes permitidos (default `*`) |
| `ADMIN_USER` | Usuario admin |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt de la clave (generar con `npm run hash`) |
| `JWT_SECRET` | Clave para firmar tokens |
| `JWT_EXPIRES_IN` | Opcional, default `12h` |
| `ORDER_TTL_HOURS` | Opcional; horas de vida de una orden `pending` antes de auto-cancelarse (TTL perezoso), default `48` |
| `R2_ACCOUNT_ID` | Account ID de Cloudflare R2 (está en la URL del endpoint S3 del bucket) |
| `R2_ACCESS_KEY_ID` | Access Key ID del API token R2 (solo se muestra al crear el token) |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key del API token R2 (solo se muestra al crear el token) |
| `R2_BUCKET` | Nombre del bucket (ej. `lcapp-images`) |
| `R2_PUBLIC_URL` | URL pública del bucket (hoy `https://pub-<hash>.r2.dev`; custom domain pendiente) |

**Nota Node/Render**: el backend exige Node ≥ 20.9 (`engines` en `package.json`); Render debe provisionar Node 20+ o el arranque falla (sharp nativo + AWS SDK v3).

**Regla de oro**: nada real en el repo. Front → variables de entorno de Cloudflare Pages (inyectadas por `scripts/cloudflare-build.sh`); backend → env vars de Render. `backend/.env` y `src/environments/*` jamás se commitean con datos reales.

## Despliegue

| Pieza | Plataforma | Actualización |
|---|---|---|
| Frontend | Cloudflare Pages (`lessencerise.pages.dev`) | Push a `master` → `scripts/cloudflare-build.sh` inyecta envs, `ng build --configuration production`, SPA fallback vía `_redirects`. |
| Backend | Render | Build automático desde el repo; env vars en el panel. |
| Datos | MongoDB Atlas | `npm run seed` manual. |

Nota SPA: Cloudflare Pages usa `public/_redirects` con `/* /index.html 200` para servir la SPA en todas las rutas.

## Decisiones y referencias

- `docs/adr/001` — flujo de compra por código de carrito vía contacto.
- `docs/adr/002` — frontera de datos uniforme con Observables + provider por abstracción.
- `docs/adr/005` — backend Node.js + Express + MongoDB.
- `docs/adr/006` — contacto configurable desde el admin (API, no mock).
- `docs/adr/007` — resumen de ventas por período (ventanas calendario, agregaciones en el backend).
- `docs/adr/008` — ventas manuales (source manual, descuento de stock al registrar, fecha/price editables).
- `docs/adr/009` — self-hosting de imágenes en Cloudflare R2 (upload, variantes WebP, limpieza).
- `HISTORIAL.md` — bitácora de cambios del proyecto.

## Temas conocidos / pendientes

- `ContactService` ya consume la API (`HttpContactService`); el contacto se configura en `/admin/contact`. Pendiente: validación de formato de los campos al guardar.
- `assets/data/*.json` aún alimenta el seed; el frontend consume la API (los JSON ya no se leen en runtime).
- Si `localStorage` del origen se llena, la sesión admin no persiste entre recargas (ver "Sesión y storage").
