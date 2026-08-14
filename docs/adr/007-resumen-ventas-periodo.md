# ADR-007 — Resumen de ventas por período (endpoint de agregación + ventanas calendario)

- **Estado**: Aceptado
- **Fecha**: 2026-08-14
- **Contexto**: El admin pedía ver "diario, semana y mensual" qué productos se vendieron, cuántas ventas, cuántas canceladas y cuánto dinero se hizo. `GET /api/orders/stats` solo da totales globales (sin fecha); no existía nada por período ni por producto. La decisión de diseño (ventanas, top productos, categorías, tasa de cancelación) se confirmó con el usuario antes de implementar.
- **Decisión**:
  - Nuevo endpoint `GET /api/orders/summary?range=day|week|month` (JWT, default `week`) que agrega en Mongo: counts por estado dentro de la ventana, ingreso y unidades (Σ price×qty vía `$unwind` de `items`), top 20 productos por unidades y desglose por categoría (2 `$lookup`). `avgTicket` y `cancellationRate` **no viajan por la API**: se derivan en el componente (getters) para poder testearlos en specs.
  - **Ventanas calendario** (no rodantes): `day` = hoy 00:00, `week` = lunes 00:00, `month` = día 1 00:00, calculadas en la zona horaria del servidor. Se eligió calendario porque el admin piensa en "ventas de hoy/esta semana/este mes", no en "últimas 24 h".
  - Nueva página `/admin/ventas` con toggle Diario/Semanal/Mensual (patrón de chips ya usado en productos), tarjetas métricas y dos tablas; el dashboard conserva su resumen global.
  - `seed.js` ahora siembra 12 órdenes demo con fechas relativas repartidas en las tres ventanas.
- **Consecuencias**:
  - Los históricos son estables: `order.items` snapshotea nombre y precio, así que editar el catálogo no distorsiona el ingreso pasado. Solo el desglose por categoría consulta el catálogo actual (las categorías no se borran, solo se desactivan).
  - El TTL perezoso aplica antes del resumen: una `pending` > 48 h cuenta como cancelada en el período. Es el comportamiento existente, no un cambio.
  - Top productos está limitado a 20 (orden por unidades); el re-orden por ingreso ocurre en el cliente y puede dejar fuera un producto de mucho ingreso que no esté en el top 20 — aceptable para este volumen.
  - No hay comparación vs. período anterior, export CSV ni gráficos (descartados por el usuario en la etapa de planificación); el endpoint devuelve `from`/`to` por si se agregan después.
  - Ventanas en zona horaria del servidor: un admin en otro huso vería cortes según el servidor, no según su localidad.
