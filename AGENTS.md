# Reglas del proyecto

## Historial de cambios (obligatorio)

- Toda tarea que modifique código, configuración o documentación DEBE actualizar `HISTORIAL.md` antes de darse por terminada.
- Agregar la entrada al inicio de la sección `## Historial` (la más reciente arriba). No editar ni borrar entradas previas.
- Usar el formato documentado en `HISTORIAL.md` (Fecha, Tipo, Descripción, Archivos, Decisión clave).
- El skill `change-history` implementa esta regla; cargarlo al comenzar cualquier cambio.

## Documentación (obligatorio)

- Si el cambio toca estructura (endpoints, rutas/módulos, frontera de datos, infraestructura, env vars), la documentación debe quedar sincronizada ANTES de darse por terminada la tarea.
- `README.md` se actualiza cuando cambia el quickstart, el stack o el despliegue.
- `docs/ARCHITECTURE.md` se actualiza cuando cambia la estructura del sistema (flujos, endpoints, frontera de datos, infra).
- Nunca incluir secretos ni valores reales en docs: solo nombres de variables.
- El skill `docs-sync` implementa esta regla; cargarlo al tocar estructura.

## Commit policy (crítica)

- NUNCA commitear sin aprobación explícita del usuario — preguntar "¿Commiteamos?".
- Conventional commits: `type(scope): descripción` (`feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`).
- Nombres de branch: `type/description` en minúsculas (ej: `feat/cart-checkout`).
- Un feature/fix = un commit; los tests van en el mismo commit que la funcionalidad.

## Entorno y secretos (crítica)

- NUNCA commitear `src/environments/environment*.ts` con datos reales (ver skill `no-env-leak`).
- En el repo solo placeholders; los secretos reales van en env vars de Cloudflare Pages (front) y Render (backend).

## Pre-flight checklist (cada tarea)

- [ ] Leer modelos/servicios relevantes antes de tocar código.
- [ ] `ng build` pasa sin errores.
- [ ] `HISTORIAL.md` actualizado.
- [ ] `README.md` / `docs/ARCHITECTURE.md` sincronizados si el cambio toca estructura (ver `docs-sync`).
- [ ] ADR en `docs/adr/` si hubo una decisión de arquitectura.
- [ ] Decisiones importantes guardadas en Engram.

## Code style

- NgModules clásicos (no standalone). Módulos con lazy loading.
- Inyección por constructor; estado reactivo con Observables + `async` pipe en templates.
- SCSS: todo componente arranca con `@use 'styles/variables' as v;` y usa tokens, no colores hardcodeados.
- Componentes de página en `{feature}/pages/`; componentes reutilizables en `shared/components/` (exportados por `SharedModule`).
- Modelos en `src/app/core/models/`; servicios en `src/app/core/services/` (única frontera de datos: hoy mock, mañana HttpClient).

## Manejo de errores

- Nunca tragar errores silenciosamente.
- Los servicios devuelven Promise/Observable y los componentes muestran un estado de error visible.

## Accesibilidad

- HTML semántico (`nav`, `main`, `section`, `article`), `aria-label` en botones de solo icono, `alt` en imágenes.

## Performance

- `ChangeDetectionStrategy.OnPush` en componentes.
- `trackBy` con `*ngFor`.
- Lazy loading de rutas (ya implementado).

## Testing

- Specs `.spec.ts` junto al source.
- Servicios: probar los métodos públicos. Carrito: probar la persistencia en localStorage.

## ADR

- Cada decisión de arquitectura se registra en `docs/adr/XXX-nombre.md` con formato `000-template.md`.
