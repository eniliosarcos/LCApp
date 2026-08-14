const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const authenticate = require('../middleware/auth');
const { slugify, uniqueSlug } = require('../utils/slugify');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/:id
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories — solo admin: registra una categoría.
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, imageUrl, slug } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const baseSlug = slug ? slugify(slug) : slugify(name);
    if (!baseSlug) {
      return res.status(400).json({ error: 'No se pudo generar un slug válido' });
    }
    const finalSlug = await uniqueSlug(Category, baseSlug);

    const category = new Category({
      name: name.trim(),
      slug: finalSlug,
      description: description ?? '',
      imageUrl: imageUrl ?? '',
    });

    const saved = await category.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'El slug ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id — solo admin: actualización parcial.
router.put('/:id', authenticate, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const { name, description, imageUrl, slug } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    if (name !== undefined || slug !== undefined) {
      const requestedSlug = slug !== undefined ? slugify(slug) : null;
      if (slug !== undefined && !requestedSlug) {
        return res.status(400).json({ error: 'No se pudo generar un slug válido' });
      }
      if (name !== undefined && (!requestedSlug || requestedSlug === '')) {
        category.slug = await uniqueSlug(Category, slugify(name.trim()), category._id);
      } else if (requestedSlug && requestedSlug !== category.slug) {
        category.slug = await uniqueSlug(Category, requestedSlug, category._id);
      }
      if (!category.slug) {
        return res.status(400).json({ error: 'No se pudo generar un slug válido' });
      }
    }

    if (name !== undefined) {
      category.name = name.trim();
    }
    if (description !== undefined) {
      category.description = description;
    }
    if (imageUrl !== undefined) {
      category.imageUrl = imageUrl;
    }

    const updated = await category.save();
    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'El slug ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
