# ADR-002 — Frontera de datos uniforme: Observables + proveedor por abstracción

- **Estado**: Enmendado (2026-08-08) — la frontera de catálogo ya usa `HttpClient` sobre assets JSON; ver cambio al final.
- **Fecha**: 2026-08-08
- **Contexto**: Los servicios del core mezclaban estilos de retorno: `CatalogService` devolvía `Promise` mientras el estado reactivo del carrito ya usaba Observables. Al sumar la configuración de contacto (redes sociales del negocio) se necesitaba una frontera de datos única, reactiva y reemplazable por `HttpClient` sin tocar componentes.
- **Decisión**: Todos los métodos públicos de `CatalogService` pasan a devolver `Observable`. El contacto se modela con una interfaz `ContactConfig` y una abstracción `ContactService` (clase abstracta) con implementación mock persistida en `localStorage`, inyectada en `AppModule` con `{ provide: ContactService, useClass: MockContactService }`. Los componentes (`AppComponent`, `CartSummaryComponent`) consumen solo la abstracción y nunca el mock concreto.
- **Consecuencias**: Un único punto de reemplazo (una línea en `AppModule`) cambia el origen de datos del contacto a `HttpClient` o `environment`. Todos los consumidores usan `subscribe`/`async`; se cumple el pre-flight de "servicios = única frontera de datos". El pipe `| currency` (USD) y el componente `Breadcrumbs` quedaron en `SharedModule` para ser usados por catálogo y carrito. La ruta de detalle se anidó (`catalog/:categoryId/product/:productId`) para preservar el contexto de categoría en el breadcrumb y recargar una sola vez el `CatalogModule` lazy.

## Enmienda 2026-08-08

- **Cambio**: `CatalogService` pasó de mock en memoria a `HttpClient` sobre `src/assets/data/categories.json` y `products.json`. Las categorías y productos dejaron de vivir hardcodeados en el servicio.
- **Motivo**: Datos ≠ código; editar contenido (precios, descripciones) no debe requerir recompilar, y es el paso natural hacia la API remota (MongoDB) planificada.
- **Consecuencias**: El contrato público no cambió (siguen siendo Observables), por lo que ningún componente requirió modificaciones de API. Se sumó `HttpClientModule` en `AppModule` y manejo de error unificado en el servicio; los consumidores ahora muestran estados visibles de carga/error. El contacto NO migró a assets porque es configuración, no contenido.
