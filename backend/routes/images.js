const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { uploadVariants, deleteImageUrls } = require('../lib/r2');

const SIZES = [400, 800, 1200];
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

function buildFolder(slug) {
  if (slug && typeof slug === 'string') {
    const sanitized = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (sanitized) {
      return `products/${sanitized}`;
    }
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(null, true);
    }
    const error = new Error('Solo se permiten imágenes (JPEG, PNG, WebP, AVIF o GIF)');
    error.mime = true;
    cb(error);
  },
});

// POST /api/images — solo admin: sube una imagen, genera variantes WebP y las guarda en R2.
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debes adjuntar una imagen' });
    }

    const variants = [];
    for (const width of SIZES) {
      const buffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      variants.push({ width, buffer });
    }

    const result = await uploadVariants(variants, buildFolder(req.body.slug));
    res.status(201).json({ variants: result.variants, primaryUrl: result.primaryUrl });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar los 5 MB' : err.message;
      return res.status(400).json({ error: message });
    }
    if (err && err.mime) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error al procesar la imagen:', err);
    res.status(400).json({ error: 'No se pudo procesar la imagen. Verifica que sea un archivo de imagen válido.' });
  }
});

// DELETE /api/images — admin: borra imágenes de R2 por URL (cleanup de huérfanas).
router.delete('/', authenticate, async (req, res) => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || !urls.length) {
      return res.status(400).json({ error: 'Se requiere un array de URLs' });
    }
    await deleteImageUrls(urls);
    res.json({ deleted: urls.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
