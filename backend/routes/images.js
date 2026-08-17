const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { uploadVariants } = require('../lib/r2');

const SIZES = [400, 800, 1200];
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

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

    const result = await uploadVariants(variants);
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

module.exports = router;
