# ADR-001 — Flujo de compra por código de carrito vía contacto directo

- **Estado**: Aceptado
- **Fecha**: 2026-08-08
- **Contexto**: El catálogo es de una tienda artesanal que atiende pedidos por redes sociales (WhatsApp, Instagram, Telegram), sin pasarela de pago. El carrito original era un simple mapa `productId → cantidad` sin identidad ni forma de referenciar el pedido.
- **Decisión**: Se rediseñó el modelo de carrito (`Cart`) como una entidad persistida en `localStorage` con `id`, `code` (formato `CAR-XXXXX`), `items` y `createdAt`. La compra se finaliza contactando a la tienda por redes con el código del carrito, no con un checkout tradicional. El resumen del pedido (`CartSummaryComponent`) muestra el código y enlaces prefabricados (WhatsApp con mensaje que incluye el código, Instagram, Telegram). El subtotal aplica `discountPrice` si existe, con envío gratis.
- **Consecuencias**: No existe pasarela de pago ni pedido server-side; el "pedido" queda en la conversación del canal de contacto. El código de carrito es la pieza clave de trazabilidad. `CartService` expone Observables (`getCart`, `getCount`, `getTotal`) y mutaciones atómicas (`addItem`, `updateQuantity`, `removeItem`, `clearCart`). Si mañana hay backend, el `code` sirve como identificador del pedido y `CartService` se puede migrar sin tocar componentes.

## ADR-002 — Frontera de datos uniforme: Observables + provider por abstracción

- **Estado**: Aceptado
- **Fecha**: 2026-08-08
- **Contexto**: Los servicios mezclaban estilos: `CatalogService` devolvía Promesas y `CartService` ya era reactivo. Al agregar datos de contacto (redes sociales) se necesitaba una única frontera de datos consistente y reemplazable.
- **Decisión**: Se uniformó la frontera de datos a Observables: `CatalogService` ahora devuelve `Observable` en todos sus métodos (incluido el nuevo `getProductById`). Para el contacto se definió una abstracción `ContactService` (abstract) y una implementación mock (`MockContactService`) con persistencia en `localStorage`, registrada vía `{ provide: ContactService, useClass: MockContactService }` en `AppModule`. Los componentes consumen solo la abstracción.
- **Consecuencias**: Todos los consumidores usan `subscribe`/`async pipe`; ningún componente conoce la implementación concreta del contacto. Mañana se reemplaza `MockContactService` por `HttpClient` (o se inyecta desde `environment`) cambiando una sola línea en `AppModule`. El pipe `| currency` (USD) y el componente `Breadcrumbs` viven en `SharedModule`, usados por catálogo y carrito. Rutas anidadas: el detalle de producto queda como ruta hija `catalog/:categoryId/product/:productId` para conservar contexto de categoría en el breadcrumb y evitar recargar el módulo.
