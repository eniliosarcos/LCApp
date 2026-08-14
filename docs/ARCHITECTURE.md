# Arquitectura — L'Essence de Cerise (LCApp)

Este documento es el mapa del sistema completo: qué piezas existen, cómo se conectan, cómo fluye un pedido y dónde vive cada regla. Para el quickstart, ver `README.md`; para la bitácora de cambios, `HISTORIAL.md`; para decisiones puntuales, `docs/adr/`.

## Vista general

Sistema de 3 piezas: una SPA pública, una API y una base de datos, desplegadas por separado.

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│  Frontend (GitHub Pages)    │  HTTPS │  Backend (Render)        │
│  Angular 15 SPA /LCApp      │ ─────► │  Express API :3000       │
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
3. En prod, `environment.prod.ts` apunta a Render y es inyectado por el CI.

## Flujo de compra (end-to-end)

```
1. Cliente navega:  home → categoría → producto
2. Agrega al carrito:  CartService  →  persistencia en localStorage (entidad Cart)
3. Abre el resumen:  CartSummaryComponent (subtotal, envío gratis, código del carrito)
4. Toca un canal de contacto (WhatsApp/Instagram/Telegram):
     a. Si no hay orden registrada: OrderService.postOrder()  →  POST /api/orders  (público)
     b. Backend genera código CAR-XXXXX, guarda la orden como 'pending'
     c. El frontend guarda el código real y abre el canal con mensaje prefabricado
     d. Si la orden ya existe y el carrito fue modificado (flag `orderModified`):
        OrderService.updateOrderItems()  →  PATCH /api/orders/:code/items  (público, solo 'pending')
        sincroniza items y total; si falla (400/404) se re-verifica el estado (paso 5)
     e. Botón "Actualizar pedido" en el carrito ejecuta el mismo PATCH de forma explícita
        (visible solo con orden registrada, deshabilitado sin cambios pendientes)
5. Al volver al carrito con una orden registrada, CartSummaryComponent consulta
   el estado real:  OrderService.getOrderStatus()  →  GET /api/orders/:code/status  (público)
     - 'confirmed'  → modal de éxito, clearCart() (vacía todo) y redirect a home
     - 'cancelled' o 404 → clearOrderCode() (conserva items) + aviso; botones de contacto activos
     - error de red → mantiene el estado actual sin romper la UI
6. El cliente negocia por el canal humano (la confirmación de datos es fuera del sistema)
7. Admin entra a /admin (login JWT):
     - `AdminLayoutComponent` (sidebar lateral, drawer en móvil) envuelve todas las páginas admin vía rutas hijas
     - Lista órdenes (GET /api/orders) y ve stats (GET /api/orders/stats)
     - Confirma:  PATCH /api/orders/:id/confirm  → valida stock y descuenta
     - Cancela:   PATCH /api/orders/:id/cancel   (solo si está 'pending')
     - Edita contacto: /admin/contact (PUT /api/config)
```

Regla de estados de una orden: `pending → confirmed | cancelled`. Confirmar/cancelar solo es válido desde `pending`.

## Frontera de datos

Toda la entrada/salida de datos vive en `src/app/core/services/` — los componentes nunca llaman `HttpClient` directamente.

| Servicio | Rol |
|---|---|
| `CatalogService` | Catálogo: categorías y productos desde la API (Observables). |
| `CartService` | Entidad `Cart` persistida en `localStorage`; expone `getCart`, `getCount`, `getTotal` y mutaciones atómicas (`addItem`, `updateQuantity`, `removeItem`, `clearCart`, `restoreCart`, `registerOrder`, `clearOrderCode`, `markOrderSynced`). Rastrea `orderModified` (cambios sobre un carrito con orden registrada). |
| `OrderService` | Pedidos: crear orden desde el carrito (`postOrder`), verificar estado real de una orden registrada (`getOrderStatus`), actualizar items de una orden pendiente (`updateOrderItems`) + operaciones admin (`getOrders`, `getStats`, `confirmOrder`, `cancelOrder`). |
| `AuthService` | Login contra `/api/auth/login`; guarda token y usuario; expone `authState`, `getToken`, `logout`. |
| `ContactService` | Abstracción del contacto (redes). Implementación: `HttpContactService` (lee de `GET/PUT /api/config`, cachea en `BehaviorSubject`, un solo GET por sesión). Registro por provider en `AppModule`. |

### Notificaciones (snackbar)

`SnackbarService` (servicio global) + `AppSnackbarComponent` (singleton en `AppComponent`, exportado por `SharedModule`). Cualquier componente dispara avisos con `snackbar.show(message, type, duration, actionLabel?, onAction?)`; el servicio expone un `BehaviorSubject` y el componente auto-cierra con un timer reiniciable. `actionLabel`/`onAction` opcionales habilitan una acción en el aviso (ej. **Deshacer** en "Vaciar carrito", que restaura el carrito con `CartService.restoreCart`). Tipos `success`/`error`/`info` con `role=status`/`role=alert`. Responsive: ancho completo abajo en móvil (< 600px), centrado con `min-width: 344px` en desktop. A diferencia del modal (presentacional `@Input`/`@Output`), el snackbar se controla por servicio por decisión de producto.

Consumidores actuales: `cart-view` (éxito/error al actualizar el pedido; "Tu carrito fue vaciado." con Deshacer), `product-detail` y `product-list` ("«Nombre» agregado al carrito."). Los avisos "¡Pedido registrado!" y "Modificaste tu carrito…" del `cart-summary` son inline bajo el bloque del código (no snackbar); el error de registro sigue junto a los botones de contacto.

### Sesión y storage (decisión importante)

`AuthService` mantiene la sesión **en memoria** (BehaviorSubject `session`) y usa `localStorage` como persistencia **best-effort** dentro de `try/catch`. Razón: si `localStorage` está lleno o bloqueado (`QuotaExceededError`), el login fallaba con mensaje genérico aunque el backend respondiera 200. Hoy, un storage roto no bloquea el login; solo hace que la sesión no sobreviva a un refresh.

Reglas derivadas:
- `isAuthenticated()` y `getToken()` consultan memoria primero, storage como fallback.
- `AuthInterceptor` inyecta `Authorization: Bearer <token>` solo a requests cuyo URL empieza con `environment.apiUrl`.
- `AuthGuard` protege la ruta `/admin`; redirige a `/login?returnUrl=...`.

## Backend (Express + Mongoose)

```
backend/
  server.js            # express, cors, json, health, monta rutas, conecta Mongo
  routes/auth.js       # POST /login → bcrypt.compare + jwt.sign
  routes/categories.js # GET /
  routes/products.js   # GET /
  routes/orders.js     # POST / (público), GET /:code/status (público), PATCH /:code/items (público, solo pending) + admin (JWT): GET /, /stats, /:code, PATCH :id/confirm, :id/cancel
  routes/config.js     # GET / (público, contacto) + PUT / (admin JWT, upsert doc único 'site')
  middleware/auth.js   # verify Authorization: Bearer JWT
  models/              # Category, Product, Order, Config
  seed.js              # carga src/assets/data/*.json → MongoDB + Config de contacto
  hash-password.js     # npm run hash -- "clave" → hash bcrypt
```

### CORS

`CORS_ORIGIN` env var (default `*`); si trae varios orígenes, se separan por comas. Render usa el origen de Pages.

### Auth (admin)

- Credenciales vía env, **sin modelo de usuarios en Mongo**: `ADMIN_USER` + `ADMIN_PASSWORD_HASH` (bcrypt) + `JWT_SECRET`.
- `JWT_EXPIRES_IN` opcional, default `12h`.
- El POST de creación de orden y el PATCH de items (`/orders/:code/items`) son **públicos** (el carrito no tiene token); solo las operaciones de gestión son admin. El PATCH solo muta órdenes `pending`.

### TTL perezoso de órdenes pendientes

Las órdenes `pending` huérfanas (p. ej. cliente que vació el carrito o abandonó el flujo) se auto-cancelan sin cron ni TTL de Atlas: `expireStalePendingOrders()` se ejecuta **bajo demanda** al inicio de `GET /api/orders` (lista admin), `GET /api/orders/stats` y `GET /api/orders/:code/status` (público), marcando como `cancelled` toda `pending` con `createdAt` más antiguo que `ORDER_TTL_HOURS` (default **48h**). No borra documentos — el historial y las stats se conservan en `cancelled`. Efecto: al ingresar al dashboard admin, las huérfanas vencidas aparecen canceladas de inmediato; el cliente que verifica un código viejo ve `cancelled`. Tradeoff aceptado: el barrido solo corre al leer (una pestaña de admin abierta sin recargar no lo dispara).

## Variables de entorno y secrets

### Frontend (`src/environments/`)

| Variable | Dev | Prod |
|---|---|---|
| `apiUrl` | `http://localhost:3000/api` | inyectada por CI (secret `API_URL`) |

El contacto **no** vive en environments: se configura desde el admin y persiste en Mongo (`Config`, `GET/PUT /api/config`).

`environment.ts` y `environment.prod.ts` están gitignoreados; en el repo viven como placeholders. El CI (`deploy.yml`) los regenera con `fs.writeFileSync` antes del build.

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

**Regla de oro**: nada real en el repo. Front → GitHub Secrets + CI; backend → env vars de Render. `backend/.env` y `src/environments/*` jamás se commitean con datos reales.

## Despliegue

| Pieza | Plataforma | Actualización |
|---|---|---|
| Frontend | GitHub Pages (`/LCApp`) | Push a `master` → `deploy.yml` inyecta envs, `ng build --configuration production --base-href /LCApp/`, copia `index.html` a `404.html` (fallback SPA) y deploy. |
| Backend | Render | Build automático desde el repo; env vars en el panel. |
| Datos | MongoDB Atlas | `npm run seed` manual. |

Nota SPA: GitHub Pages no reescribe rutas; por eso `404.html` es copia de `index.html`. Navegar directo a `/LCApp/admin` da 404 HTTP pero la app arranca y resuelve la ruta — es esperado, no un bug.

## Decisiones y referencias

- `docs/adr/001` — flujo de compra por código de carrito vía contacto.
- `docs/adr/002` — frontera de datos uniforme con Observables + provider por abstracción.
- `docs/adr/005` — backend Node.js + Express + MongoDB.
- `docs/adr/006` — contacto configurable desde el admin (API, no mock).
- `HISTORIAL.md` — bitácora de cambios del proyecto.

## Temas conocidos / pendientes

- `ContactService` ya consume la API (`HttpContactService`); el contacto se configura en `/admin/contact`. Pendiente: validación de formato de los campos al guardar.
- `assets/data/*.json` aún alimenta el seed; el frontend consume la API (los JSON ya no se leen en runtime).
- Si `localStorage` del origen se llena, la sesión admin no persiste entre recargas (ver "Sesión y storage").
