# ADR-009 — Self-hosting de imágenes de producto en Cloudflare R2

- **Estado**: Aceptado
- **Fecha**: 2026-08-16
- **Contexto**: Las imágenes de los productos eran URLs remotas arbitrarias pegadas por el admin (hosts ajenos, sin control de tamaño, peso ni disponibilidad). Se quería que el admin pudiera subir imágenes propias y que se sirvieran optimizadas (variantes, WebP) con `srcset`. El backend corre en **Render, cuyo disco es efímero**: cualquier archivo guardado localmente se pierde en cada deploy y no escala. El usuario además descartó Cloudinary (no disponible en su país).
- **Decisión**:
  - **Cloudflare R2** como object storage S3-compatible: plan Free, **$0 egress**, CDN global, API S3 estándar. Alternativas evaluadas: AWS S3 (cobra egress), Backblaze B2 y DigitalOcean Spaces (equivalentes; R2 ganó por egress gratis + ya teníamos cuenta Cloudflare).
  - **El backend no sirve archivos**: `POST /api/images` (JWT) recibe la imagen (multer, ≤5 MB), la procesa con `sharp` (orientación + **WebP 400/800/1200w**) y sube las variantes a `products/<uuid>/<width>w.webp` en R2 con cache inmutable; responde `{ variants, primaryUrl }`. El frontend sirve las URLs públicas de R2 directo (los `<img>` no requieren CORS para display). Limpieza best-effort de objetos parciales si falla una subida.
  - `ProductImage` guarda `variants: [{ width, url }]`; la galería los usa como `srcset` real (`sizes` acorde al layout). Productos existentes sin variantes siguen funcionando.
  - **Bucket en Standard**, no Infrequent Access (las imágenes se sirven en cada visita → acceso frecuente; el IA cobra por acceso y tiene mínimo de 30 días de duración que penaliza al reemplazar imágenes durante desarrollo).
  - Acceso público vía **Public Development URL** de R2 (`pub-…r2.dev`) como **v1**, porque el frontend vive en Cloudflare Pages sin dominio propio. Node local pasó a **20.19 vía nvm** y `package.json` declara `engines: { node: ">=20.9.0" }` para que Render provisione Node 20+.
- **Consecuencias**:
  - **Custom domain pendiente**: la URL r2.dev es rate-limited y sin caché (no apta producción). Cuando el usuario tenga un dominio, se conecta `img.<dominio>` al bucket (CNAME → `<bucket>.<account-id>.r2.dev`) y solo cambia `R2_PUBLIC_URL`; los nombres de archivo hasheados son estables, no hay que migrar objetos.
  - **Eliminación de imágenes**: `DELETE /api/products/:id` (admin) elimina el producto y borra sus imágenes de R2. `PUT /api/products/:id` calcula el diff entre URLs viejas y nuevas y borra las huérfanas. `DELETE /api/images` (admin) limpia URLs específicas de R2 (usado para cancelar uploads pendientes).
  - Render debe tener las env vars `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET/R2_PUBLIC_URL` (nunca en el repo); sin ellas la ruta responde 500 con "Configuración de R2 incompleta".
  - La subida multiplica requests del admin: por imagen se hacen 3 `PutObject` (uno por variante). Al volumen actual del negocio es irrelevante para el límite free (10M Class B/mes).
