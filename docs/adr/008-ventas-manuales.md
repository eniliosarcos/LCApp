# ADR-008 — Ventas manuales (registradas fuera de la página)

- **Estado**: Aceptado
- **Fecha**: 2026-08-15
- **Contexto**: Parte de las ventas se concretan por fuera de la web (mostrador, conocidos, WhatsApp) y el negocio necesitaba que esa información también quedara registrada para que el stock y el resumen de `/admin/ventas` reflejen la realidad. Las decisiones (descuento de stock, estado inicial, fecha/precio editables, UX modal) se confirmaron con el usuario antes de implementar.
- **Decisión**:
  - Nuevo campo `source: 'web' | 'manual'` (default `web`) en `Order` y prefijo de código propio `MAN-XXXXX` (las web siguen `CAR-XXXXX`) para identificar ventas externas; badge "Manual" en lista y detalle.
  - `POST /api/orders/manual` (JWT): crea la venta directamente `confirmed` + `confirmedAt`, **descuenta stock al registrar** (la mercancía ya salió del negocio; mismo mecanismo que confirmar una web) y guarda `createdAt = saleDate` (default hoy, validada para no ser futura) para que caiga en la ventana correcta del resumen.
  - Precio editable por línea, default = precio efectivo del producto (`discountPrice ?? price`); `customerName` opcional con default "Cliente de mostrador".
  - UX: modal `ManualSaleModalComponent` dentro de `/admin/ventas` (botón "+ Registrar venta" rosa distintivo y link de sidebar "+ Registrar venta" que navega a `/admin/ventas?registrar=1` y abre el mismo modal). **Doble confirmación** antes de guardar reusando `AppConfirmDialogComponent` (mismo patrón que Confirmar/Cancelar).
- **Consecuencias**:
  - Las ventas manuales cuentan automáticamente en `stats`, `summary` y la lista de órdenes por ser `confirmed` (no requieren cambios en las agregaciones).
  - El stock se descuenta al registrar: si el admin se equivoca, debe reponer el stock manualmente en Productos (no hay undo).
  - Como el precio y la fecha son editables, hay que registrar con cuidado para no distorsionar los históricos; el snapshot de `order.items` ya protege los históricos de cambios posteriores del catálogo.
  - Una venta manual nunca pasa por `pending` → no le aplica el TTL perezoso.
