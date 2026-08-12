# ADR-005 — Backend Node.js + Express + MongoDB

- **Estado**: Aceptado (heredado del proyecto anterior catalogApp)
- **Fecha**: 2026-08-08
- **Contexto**: El catálogo hoy lee `src/assets/data/*.json` vía `HttpClient` y el carrito persiste en `localStorage`. La visión de producto (ver ADR-009) requiere: gestión de productos, autenticación de admin, gestión de órdenes (creadas por el cliente con código `CAR-XXXXX`, confirmadas/canceladas por el admin) y descuento de stock. Todo eso necesita una API y una base de datos persistente.
- **Decisión**: Usar **Node.js + Express + MongoDB** como backend, alojado en `backend/` dentro del mismo repo. Se hereda la decisión ya tomada en el proyecto anterior (catalogApp, ADR-005) sin reabrir el debate de stack.
- **Consecuencias**:
  - JavaScript/TypeScript en todo el stack; el frontend ya habla por `HttpClient` y Observables, así que el reemplazo de `assets/*.json` por llamadas a la API es cambiar la URL en `CatalogService`.
  - Se maneja autenticación manualmente (JWT) — sin proveedor externo.
  - MongoDB ofrece schema flexible (ideal para catálogo), pero las relaciones (orden → producto) requieren disciplina manual.
  - Alternativas descartadas en el proyecto anterior: Firebase (vendor lock-in), Supabase (costo a escala), PostgreSQL (Mongo es más simple para catálogo).
  - Deuda a futuro: el admin hoy es mock (`auth.service.ts` con `admin`/`admin123`); deberá migrar a JWT real contra la API.
