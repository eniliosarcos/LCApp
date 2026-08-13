# ADR-006 — Contacto configurable desde el admin (API, no mock)

- **Estado**: Aceptado
- **Fecha**: 2026-08-13
- **Contexto**: El contacto del negocio (WhatsApp/Instagram/Telegram) vivía como constante compilada en `environment.contact` + override en `localStorage` vía `MockContactService`. Para cambiarlo había que tocar environments, re-deployar o setear secretos de CI. El contacto es dato de negocio, no config de build, y debe poder editarse desde la página del admin.
- **Decisión**: Mover el contacto a una entidad persistida en MongoDB (modelo `Config`, documento único con clave fija `site`) expuesta por una nueva API: `GET /api/config` (público, lo consume footer y carrito) y `PUT /api/config` (protegido con JWT, solo admin). En el frontend, `MockContactService` se reemplaza por `HttpContactService` (misma abstracción `ContactService`, mismo provider en `AppModule`). Se agrega la página admin `contact-settings` en `/admin/contact` con formulario (patrón `FormsModule`). Se elimina `contact` de `environment.ts`, `environment.prod.ts` y del `deploy.yml` (los secrets `WHATSAPP_*`/`INSTAGRAM_*`/`TELEGRAM_*` quedan obsoletos).
- **Consecuencias**:
  - La abstracción `ContactService` pagó su deuda: se diseñó para este reemplazo y el cambio fue una línea en `AppModule` + una implementación nueva.
  - `HttpContactService` cachea la config en un `BehaviorSubject` (un solo GET por sesión, `requested` flag evita duplicados en vuelo); el footer y el carrito se actualizan al instante al guardar desde el admin.
  - Los valores iniciales salen del `seed.js` (placeholders), que el admin edita desde la página.
  - Dependencia del backend para el footer: si la API cae, el footer oculta el nav de contacto (fallback silencioso) en vez de romper.
  - Deuda a futuro: no hay validación de formato (número/usuarios) ni historial de cambios de la config; el PUT acepta cualquier string no vacío.
