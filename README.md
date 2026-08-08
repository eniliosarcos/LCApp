# L'Essence de Cerise — Catálogo

Catálogo público de una tienda artesanal con carrito persistente y compra por código vía redes sociales. El cliente arma su pedido, recibe un código (`CAR-XXXXX`) y finaliza la compra contactando al negocio por WhatsApp, Instagram o Telegram con ese código.

Stack: **Angular 15** (NgModules clásicos, lazy loading, SCSS con tokens) + RxJS + `HttpClient`.

## Funcionalidades

- **Catálogo por categorías**: home → categorías → productos → detalle con galería, descuentos y stock.
- **Carrito persistente**: entidad con código en `localStorage`; resumen con subtotal, envío gratis y botones de contacto con mensaje prefabricado (WhatsApp incluye el código de carrito).
- **Detalle de producto**: breadcrumb (Inicio > Categoría > Producto), descuento, badge de stock, control de cantidad.
- **Panel admin** (`/admin`) y **login** (`/login`): accesibles por URL para el dueño, ocultos al cliente.
- **Datos de catálogo** en `src/assets/data/*.json`: se editan sin recompilar.

## Cómo correr

```bash
npm install
ng serve        # http://localhost:4200
```

Build de producción:

```bash
ng build        # output en dist/
```

## Configuración de contacto

Los datos del negocio (número WhatsApp, Instagram, Telegram) viven en `src/environments/`:

- `environment.ts` → desarrollo
- `environment.prod.ts` → producción (inyectado por CI en build)

**Ambos están en `.gitignore`**: nunca se commitean datos reales. Los valores se cargan localmente o se inyectan desde GitHub Secrets (ver `.github/workflows/deploy.yml`).

## Estructura

```
src/app/
  core/         # modelos, servicios (única frontera de datos: assets hoy, API mañana)
  shared/       # header, breadcrumbs, pipe currencyFormat (SharedModule)
  home/         # categorías (home)
  catalog/      # listado y detalle de producto
  cart/         # carrito, cart-item, cart-summary
  auth/         # login
  admin/        # dashboard
  assets/data/  # categorías y productos (JSON)
docs/adr/       # decisiones de arquitectura
HISTORIAL.md    # bitácora de cambios
```

## Convenciones

- NgModules clásicos (no standalone), lazy loading por feature.
- Inyección por constructor; estado reactivo con Observables + `async` pipe.
- SCSS con tokens de `styles/_variables.scss` (`@use 'styles/variables' as v;`).
- Cambios menores van a `HISTORIAL.md`; decisiones de arquitectura, a `docs/adr/`.
- Nunca commitear `src/environments/*` con datos reales.
