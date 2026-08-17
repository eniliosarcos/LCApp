const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const authenticate = require('../middleware/auth');
const { authenticateOptional } = require('../middleware/auth');
const { slugify, uniqueSlug } = require('../utils/slugify');
const { deleteImageUrls, extractR2Urls } = require('../lib/r2');

function normalizeVariants(variants) {
  if (!Array.isArray(variants)) {
    return [];
  }
  return variants
    .filter(v => v && Number.isFinite(Number(v.width)) && typeof v.url === 'string' && v.url.trim() !== '')
    .map(v => ({ width: Number(v.width), url: v.url.trim() }));
}

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }
  const normalized = images
    .filter(img => img && typeof img.url === 'string' && img.url.trim() !== '')
    .map((img, index) => ({
      url: img.url.trim(),
      alt: img.alt || '',
      isPrimary: Boolean(img.isPrimary),
      order: typeof img.order === 'number' ? img.order : index,
      variants: normalizeVariants(img.variants),
    }));
  const hasPrimary = normalized.some(img => img.isPrimary);
  if (!hasPrimary && normalized.length) {
    normalized[0].isPrimary = true;
  }
  if (normalized.filter(img => img.isPrimary).length > 1) {
    let foundPrimary = false;
    for (const img of normalized) {
      if (img.isPrimary) {
        if (foundPrimary) {
          img.isPrimary = false;
        }
        foundPrimary = true;
      }
    }
  }
  return normalized;
}

// GET /api/products — público: solo activos. Con ?all=true y token válido: todos (para admin).
router.get('/', authenticateOptional, async (req, res) => {
  try {
    const { categoryId, all } = req.query;
    const filter = {};
    if (!(req.admin && all === 'true')) {
      filter.isActive = true;
    }
    if (categoryId) {
      filter.categoryId = categoryId;
    }
    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — solo admin: registra un producto.
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, categoryId, price, discountPrice, stock, sku, description, tags, images, isActive, slug } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'La categoría es obligatoria' });
    }
    if (price === undefined || Number(price) <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor que 0' });
    }
    if (discountPrice !== undefined && Number(discountPrice) >= Number(price)) {
      return res.status(400).json({ error: 'El precio de oferta debe ser menor que el precio' });
    }
    if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      return res.status(400).json({ error: 'El stock debe ser un número entero mayor o igual a 0' });
    }

    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({ error: 'La categoría no existe' });
    }

    const baseSlug = slug ? slugify(slug) : slugify(name);
    if (!baseSlug) {
      return res.status(400).json({ error: 'No se pudo generar un slug válido' });
    }
    const finalSlug = await uniqueSlug(Product, baseSlug);

    if (sku && sku.trim()) {
      const existingSku = await Product.findOne({ sku: sku.trim() });
      if (existingSku) {
        return res.status(400).json({ error: 'El SKU ya existe' });
      }
    }

    const product = new Product({
      name: name.trim(),
      categoryId,
      slug: finalSlug,
      description: description ?? '',
      price: Number(price),
      discountPrice: discountPrice === undefined ? undefined : Number(discountPrice),
      stock: stock === undefined ? 0 : Number(stock),
      sku: sku && sku.trim() ? sku.trim() : undefined,
      tags: Array.isArray(tags) ? tags : [],
      images: normalizeImages(images),
      isActive: isActive === undefined ? true : Boolean(isActive),
    });

    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'El slug o el SKU ya existen' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id — solo admin: actualización parcial.
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const { name, categoryId, price, discountPrice, stock, sku, description, tags, images, isActive, slug } = req.body;

    const nextPrice = price !== undefined ? Number(price) : product.price;
    if (price !== undefined && nextPrice <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor que 0' });
    }
    const nextDiscount = discountPrice !== undefined ? Number(discountPrice) : product.discountPrice;
    if (discountPrice !== undefined && nextDiscount >= nextPrice) {
      return res.status(400).json({ error: 'El precio de oferta debe ser menor que el precio' });
    }
    if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      return res.status(400).json({ error: 'El stock debe ser un número entero mayor o igual a 0' });
    }

    if (categoryId !== undefined) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(400).json({ error: 'La categoría no existe' });
      }
    }

    if (sku !== undefined && sku.trim()) {
      const existingSku = await Product.findOne({ sku: sku.trim(), _id: { $ne: product._id } });
      if (existingSku) {
        return res.status(400).json({ error: 'El SKU ya existe' });
      }
    }

    const nextName = name !== undefined ? name.trim() : product.name;
    const requestedSlug = slug !== undefined ? slugify(slug) : null;
    if (name !== undefined && (!requestedSlug || requestedSlug === '')) {
      product.slug = await uniqueSlug(Product, slugify(nextName), product._id);
    } else if (requestedSlug && requestedSlug !== product.slug) {
      product.slug = await uniqueSlug(Product, requestedSlug, product._id);
    }
    if (!product.slug) {
      return res.status(400).json({ error: 'No se pudo generar un slug válido' });
    }

    product.name = nextName;
    if (categoryId !== undefined) {
      product.categoryId = categoryId;
    }
    if (price !== undefined) {
      product.price = nextPrice;
    }
    if (discountPrice !== undefined) {
      product.discountPrice = nextDiscount;
    }
    if (stock !== undefined) {
      product.stock = Number(stock);
    }
    if (sku !== undefined) {
      product.sku = sku.trim() || undefined;
    }
    if (description !== undefined) {
      product.description = description;
    }
    if (tags !== undefined) {
      product.tags = Array.isArray(tags) ? tags : [];
    }
    if (images !== undefined) {
      const oldUrls = extractR2Urls(product.images);
      const newNormalized = normalizeImages(images);
      const newUrls = extractR2Urls(newNormalized);
      const orphanUrls = oldUrls.filter(url => !newUrls.includes(url));
      if (orphanUrls.length) {
        deleteImageUrls(orphanUrls);
      }
      product.images = newNormalized;
    }
    if (isActive !== undefined) {
      product.isActive = Boolean(isActive);
    }

    const updated = await product.save();
    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'El slug o el SKU ya existen' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id — solo admin: elimina producto y sus imágenes de R2.
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const r2Urls = extractR2Urls(product.images);
    await product.deleteOne();
    if (r2Urls.length) {
      deleteImageUrls(r2Urls);
    }
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
