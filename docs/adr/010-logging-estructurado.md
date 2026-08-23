# ADR-010 — Logging estructurado con pino

- **Estado**: Aceptado
- **Fecha**: 2026-08-22
- **Contexto**: El backend no tenía ningún sistema de logging estructurado. Los errores se procesaban en catch blocks pero solo devolvían respuestas HTTP; no quedaba registro persistente en Render. Además, varios catch blocks filtraban `err.message` directo al client (information leak). No había forma de diagnosticar problemas en prod (fallos de stock, subidas R2 fallidas, intentos de auth no autorizados).
- **Decisión**:
  - **pino** como librería de logging: JSON estructurado nativo, mínimo overhead, sin dependencias pesadas. Alternativas evaluadas: winston (más pesado), morgan (solo request logging), console.log (no estructurado).
  - **Solo eventos críticos**: startup/conexión DB, creación/confirmación/cancelación de órdenes, decremento de stock, uploads/eliminación de R2, intentos de login fallidos, token inválido/expirado, errores globales en rutas. NO request logging de categorías/productos/config (lecturas frecuentes de solo lectura sin valor diagnóstico).
  - **Env var `LOG_LEVEL`**: nivel configurable (default `info`), útil para debug en dev sin cambiar código.
  - **Mensajes genéricos al client**: los catch blocks de rutas devuelven `error: 'Error interno del servidor'` en vez de `err.message`. El detalle real va al logger.
  - **`unhandledRejection` handler** en `server.js` para Express 4 (no captura Promise rejections por defecto).
- **Consecuencias**:
  - Los logs de Render (stdout) ahora son consultables desde el panel de Render.
  - Para ver logs en dev local, se puede configurar `LOG_LEVEL=debug` o instalar `pino-pretty` como devDependency.
  - `categories.js` y `config.js` fueron refactorizados para usar logger y mensajes genéricos (consistencia).
  - pino-pretty no está instalado como devDependency — si se necesita pretty-print en dev local, instalar con `npm install --save-dev pino-pretty`.
