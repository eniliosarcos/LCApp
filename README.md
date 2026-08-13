# L'Essence de Cerise — Catálogo

Catálogo público de una tienda artesanal con carrito persistente y compra por código vía redes sociales. El cliente arma su pedido, recibe un código (`CAR-XXXXX`) y finaliza la compra contactando al negocio por WhatsApp, Instagram o Telegram con ese código. El admin ve los pedidos en un panel y los confirma (descontando stock) o cancela.

## Stack

| Capa | Tecnología | Dónde vive |
|---|---|---|
| Frontend | **Angular 15** (NgModules clásicos, lazy loading, SCSS con tokens, RxJS + `HttpClient`) | `src/` |
| Backend | **Node.js + Express + Mongoose** | `backend/` |
| Base de datos | **MongoDB Atlas** (cluster M0 free; prod DB `lcapp`, local DB `lcapp-dev`) | nube |
| Despliegue | **GitHub Pages** (front) + **Render** (API) | CI en `.github/workflows/deploy.yml` |

## Funcionalidades

- **Catálogo por categorías**: home → categorías → productos → detalle con galería, descuentos y stock (datos desde la API).
- **Carrito persistente**: entidad con código en `localStorage`; resumen con subtotal, envío gratis y botones de contacto con mensaje prefabricado. Al contactar, el pedido se registra en el backend y se usa el código real (`CAR-XXXXX`).
- **Panel admin** (`/admin`) y **login** (`/login`): accesibles por URL para el dueño, ocultos al cliente. Autenticación con JWT contra el backend.
- **Gestión de pedidos**: el admin lista pedidos, ve estadísticas, confirma (valida y descuenta stock) o cancela.

## Cómo correr

El proyecto son **dos procesos**: backend y frontend.

### 1. Backend (API)

```bash
cd backend
npm install
cp .env.example .env   # completar MONGODB_URI, ADMIN_USER, ADMIN_PASSWORD_HASH, JWT_SECRET
npm run dev            # http://localhost:3000/api
```

> Para desarrollo local, `MONGODB_URI` debe apuntar a una base separada (`lcapp-dev`). Así `npm run seed` y las pruebas no tocan la base de producción (`lcapp`).

Scripts disponibles:

```bash
npm run seed   # carga categorías y productos desde src/assets/data/*.json a MongoDB
npm run hash -- "clave"   # genera hash bcrypt para ADMIN_PASSWORD_HASH (mín 8 chars)
```

### 2. Frontend

```bash
npm install
ng serve        # http://localhost:4200
```

El frontend apunta a `http://localhost:3000/api` en desarrollo (`src/environments/environment.ts`). Con el backend corriendo, `ng serve` levanta la app completa contra la API local.

Build de producción:

```bash
ng build --configuration production --base-href /LCApp/   # output en dist/
```

## Configuración y secretos

### Frontend — `src/environments/`

| Archivo | Uso |
|---|---|
| `environment.ts` | Desarrollo: `apiUrl` → `http://localhost:3000/api`, contacto en blanco |
| `environment.prod.ts` | Producción: `apiUrl` y contactos **inyectados por CI** desde GitHub Secrets (nunca con datos reales en el repo) |

### Backend — `backend/.env`

Variables (ver `.env.example`): `PORT`, `MONGODB_URI`, `CORS_ORIGIN`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, `JWT_EXPIRES_IN`.

**Nunca commitear `backend/.env` ni `src/environments/*` con datos reales.** Los valores reales viven en GitHub Secrets (inyectados por CI al front) y en las env vars de Render (backend).

## Despliegue

| Pieza | Plataforma | Cómo se actualiza |
|---|---|---|
| Frontend | GitHub Pages (`/LCApp`) | Push a `master` → GitHub Actions inyecta `environment.prod.ts` con secrets, build y deploy |
| Backend | Render | Push a `master` (branch del servicio) → Render rebuilda; env vars desde el panel |
| Datos | MongoDB Atlas | `npm run seed` manual desde local |

URLs de referencia: frontend `https://eniliosarcos.github.io/LCApp`, API `https://lcapp-backend-o0jt.onrender.com/api`, health `GET /api/health`.

## Estructura

```
src/app/
  core/         # modelos, servicios (única frontera de datos: HttpClient), interceptor JWT, guard
  shared/       # header, breadcrumbs, pipe currencyFormat (SharedModule)
  home/         # categorías (home)
  catalog/      # listado y detalle de producto
  cart/         # carrito, cart-item, cart-summary (registra orden al contactar)
  auth/         # login
  admin/        # dashboard (protegido por AuthGuard + JWT)
backend/
  server.js     # Express, CORS, rutas, conexión a Mongo
  routes/       # auth, categories, products, orders
  models/       # Category, Product, Order (Mongoose)
  middleware/   # auth.js (verify JWT)
  seed.js       # carga catálogo a MongoDB
  hash-password.js  # genera hash bcrypt para el admin
docs/adr/       # decisiones de arquitectura
HISTORIAL.md    # bitácora de cambios
docs/ARCHITECTURE.md  # mapa del sistema completo
```

## API — endpoints

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | público |
| GET | `/api/categories` | público |
| GET | `/api/products` | público |
| POST | `/api/orders` | público (registro de pedido desde el carrito) |
| POST | `/api/auth/login` | público (devuelve JWT) |
| GET | `/api/orders`, `/api/orders/stats`, `/api/orders/:code` | admin (JWT) |
| PATCH | `/api/orders/:id/confirm`, `/api/orders/:id/cancel` | admin (JWT) |

## Convenciones

- NgModules clásicos (no standalone), lazy loading por feature.
- Inyección por constructor; estado reactivo con Observables + `async` pipe.
- SCSS con tokens de `styles/_variables.scss` (`@use 'styles/variables' as v;`).
- `ChangeDetectionStrategy.OnPush` y `trackBy` en componentes.
- Cambios menores van a `HISTORIAL.md`; decisiones de arquitectura, a `docs/adr/`.
- Nunca commitear secrets; todo cambio espera aprobación explícita antes de commitear.

## Flujo de trabajo con Git

`master` está protegida: no se puede pushear directo ni forzar. Todo cambio pasa por una rama + Pull Request con al menos una aprobación.

1. Crear rama desde `master`: `git checkout -b feat/cart-checkout` (naming: `type/descripcion`).
2. Commits convencionales: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test` — un feature/fix = un commit.
3. Push: `git push -u origin feat/cart-checkout`.
4. Abrir PR desde GitHub y esperar aprobación.
5. Merge con squash (o merge normal) — nunca pushear a `master` directamente.
