const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const authenticate = require('../middleware/auth');
const logger = require('../lib/logger');

// Genera código con prefijo (CAR- para web, MAN- para ventas manuales)
function generateCode(prefix = 'CAR-') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// Escapa caracteres de regex para usarlos literalmente en una búsqueda
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TTL_DEFAULT_HOURS = 48;

// TTL lazy: horas de vida de una orden pending antes de considerarse abandonada (env ORDER_TTL_HOURS)
function ttlMs() {
  const hours = parseInt(process.env.ORDER_TTL_HOURS, 10);
  return (Number.isFinite(hours) && hours > 0 ? hours : TTL_DEFAULT_HOURS) * 60 * 60 * 1000;
}

// Barrido bajo demanda: las pending más viejas que el TTL pasan a cancelled (no se borran)
async function expireStalePendingOrders() {
  const cutoff = new Date(Date.now() - ttlMs());
  await Order.updateMany(
    { status: 'pending', createdAt: { $lt: cutoff } },
    { $set: { status: 'cancelled' } }
  );
}

// Verifica que cada item exista, esté activo y tenga stock suficiente
async function validateStockAvailability(items) {
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      return { ok: false, error: `Producto no disponible: "${item.productName || item.productId}"` };
    }
    if (product.stock < item.quantity) {
      return {
        ok: false,
        error: `Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${item.quantity}`,
      };
    }
  }
  return { ok: true };
}

// POST /api/orders — Crear orden desde el carrito
router.post('/', async (req, res) => {
  try {
    const { customerName, customerPhone, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Faltan datos: items son requeridos' });
    }

    const stockCheck = await validateStockAvailability(items);
    if (!stockCheck.ok) {
      logger.warn({ items: items.map(i => i.productId), error: stockCheck.error }, 'Stock validation failed (order creation)');
      return res.status(400).json({ error: stockCheck.error });
    }

    // Calcular total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const order = await Order.create({
      code: generateCode(),
      customerName: customerName || 'Cliente web',
      customerPhone,
      items,
      total,
      status: 'pending',
    });

    logger.info({ code: order.code, itemCount: items.length, total }, 'Order created');
    res.status(201).json(order);
  } catch (err) {
    logger.error({ err, route: 'POST /api/orders' }, 'Failed to create order');
    res.status(500).json({ error: 'Error al crear la orden' });
  }
});

// POST /api/orders/manual — Registrar una venta externa (admin), descuenta stock
router.post('/manual', authenticate, async (req, res) => {
  try {
    const { customerName, customerPhone, saleDate, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Faltan datos: items son requeridos' });
    }

    let saleAt = new Date();
    if (saleDate) {
      saleAt = new Date(saleDate);
      if (Number.isNaN(saleAt.getTime())) {
        return res.status(400).json({ error: 'Fecha de venta inválida' });
      }
      if (saleAt.getTime() > Date.now()) {
        return res.status(400).json({ error: 'La fecha de venta no puede ser futura' });
      }
    }

    const orderItems = [];
    const quantityByProduct = new Map();
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Producto no disponible: "${item.productId}"` });
      }
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity < 1) {
        return res.status(400).json({ error: `Cantidad inválida para "${product.name}"` });
      }
      const totalQuantity = (quantityByProduct.get(product._id.toString())?.quantity || 0) + quantity;
      quantityByProduct.set(product._id.toString(), {
        name: product.name,
        stock: product.stock,
        quantity: totalQuantity,
      });
      const unitPrice = item.price !== undefined && item.price !== null
        ? Number(item.price)
        : (product.discountPrice ?? product.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ error: `Precio inválido para "${product.name}"` });
      }
      orderItems.push({ productId: product._id, productName: product.name, quantity, price: unitPrice });
    }

    // Validar stock agregado por producto: el mismo producto en varias líneas no puede sobre-vender
    for (const { name, stock, quantity } of quantityByProduct.values()) {
      if (stock < quantity) {
        return res.status(400).json({
          error: `Stock insuficiente para "${name}": disponible ${stock}, solicitado ${quantity}`,
        });
      }
    }

    const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const order = await Order.create({
      code: generateCode('MAN-'),
      customerName: customerName || 'Cliente de mostrador',
      customerPhone,
      items: orderItems,
      status: 'confirmed',
      source: 'manual',
      total,
      createdAt: saleAt,
      confirmedAt: saleAt,
    });

    // Descontar stock (mismo mecanismo que confirmar una orden web)
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
      logger.info({ code: order.code, product: item.productName, qty: item.quantity }, 'Stock decremented (manual sale)');
    }

    logger.info({ code: order.code, itemCount: orderItems.length, total }, 'Manual order created');
    res.status(201).json(order);
  } catch (err) {
    logger.error({ err, route: 'POST /api/orders/manual' }, 'Failed to create manual order');
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});

// GET /api/orders — Listar órdenes paginadas (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    await expireStalePendingOrders();
    const { status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q && q.trim()) filter.code = { $regex: escapeRegExp(q.trim()), $options: 'i' };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error({ err, route: 'GET /api/orders' }, 'Failed to list orders');
    res.status(500).json({ error: 'Error al listar órdenes' });
  }
});

// GET /api/orders/stats — Resumen de ventas (admin)
router.get('/stats', authenticate, async (req, res) => {
  try {
    await expireStalePendingOrders();
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    res.json({
      totalOrders,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    logger.error({ err, route: 'GET /api/orders/stats' }, 'Failed to get order stats');
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/orders/summary?range=day|week|month — Resumen de ventas por período calendario (admin)
router.get('/summary', authenticate, async (req, res) => {
  try {
    await expireStalePendingOrders();
    const range = ['day', 'week', 'month'].includes(req.query.range) ? req.query.range : 'week';
    const tzOffset = parseInt(req.query.offset, 10) || 0;
    const now = new Date();

    const userLocalMs = now.getTime() - tzOffset * 60000;
    const d = new Date(userLocalMs);
    const fromDayUTC = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) + tzOffset * 60000;
    const dayOfWeek = d.getDay();
    const startOfWeekUTC = fromDayUTC - ((dayOfWeek + 6) % 7) * 86400000;
    const startOfMonthUTC = Date.UTC(d.getFullYear(), d.getMonth(), 1) + tzOffset * 60000;
    const from = range === 'day' ? fromDayUTC : range === 'week' ? startOfWeekUTC : startOfMonthUTC;

    const [sales, cancelled, pending, totalOrders, totals, topProducts, byCategory] = await Promise.all([
      Order.countDocuments({ status: 'confirmed', createdAt: { $gte: from } }),
      Order.countDocuments({ status: 'cancelled', createdAt: { $gte: from } }),
      Order.countDocuments({ status: 'pending', createdAt: { $gte: from } }),
      Order.countDocuments({ createdAt: { $gte: from } }),
      Order.aggregate([
        { $match: { status: 'confirmed', createdAt: { $gte: from } } },
        { $unwind: '$items' },
        { $group: {
            _id: null,
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            units: { $sum: '$items.quantity' },
          } },
      ]),
      Order.aggregate([
        { $match: { status: 'confirmed', createdAt: { $gte: from } } },
        { $unwind: '$items' },
        { $group: {
            _id: { productId: '$items.productId', productName: '$items.productName' },
            units: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          } },
        { $sort: { units: -1, revenue: -1 } },
        { $limit: 20 },
        { $project: { _id: 0, productId: '$_id.productId', productName: '$_id.productName', units: 1, revenue: 1 } },
      ]),
      Order.aggregate([
        { $match: { status: 'confirmed', createdAt: { $gte: from } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'categories', localField: 'product.categoryId', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $group: {
            _id: { $ifNull: ['$category.name', 'Sin categoría'] },
            units: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          } },
        { $project: { _id: 0, categoryName: '$_id', units: 1, revenue: 1 } },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    res.json({
      range,
      from: from.toISOString(),
      to: now.toISOString(),
      sales,
      cancelled,
      pending,
      totalOrders,
      revenue: totals[0]?.revenue || 0,
      units: totals[0]?.units || 0,
      topProducts,
      byCategory,
    });
  } catch (err) {
    logger.error({ err, route: 'GET /api/orders/summary' }, 'Failed to get order summary');
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// GET /api/orders/:code/status — Estado de la orden por código (público)
router.get('/:code/status', async (req, res) => {
  try {
    await expireStalePendingOrders();
    const order = await Order.findOne({ code: req.params.code }, { code: 1, status: 1, confirmedAt: 1 });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json({ code: order.code, status: order.status, confirmedAt: order.confirmedAt });
  } catch (err) {
    logger.error({ err, route: 'GET /api/orders/:code/status' }, 'Failed to get order status');
    res.status(500).json({ error: 'Error al consultar estado' });
  }
});

// PATCH /api/orders/:code/items — Actualizar items de una orden pendiente (público)
router.patch('/:code/items', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Faltan datos: items son requeridos' });
    }

    const order = await Order.findOne({ code: req.params.code });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status !== 'pending') {
      logger.warn({ code: req.params.code, status: order.status }, 'Attempted to update non-pending order');
      return res.status(400).json({ error: `No se puede actualizar una orden con estado "${order.status}"` });
    }

    const stockCheck = await validateStockAvailability(items);
    if (!stockCheck.ok) {
      logger.warn({ code: req.params.code, error: stockCheck.error }, 'Stock validation failed (order items update)');
      return res.status(400).json({ error: stockCheck.error });
    }

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.items = items;
    order.total = total;
    await order.save();

    res.json(order);
  } catch (err) {
    logger.error({ err, route: 'PATCH /api/orders/:code/items' }, 'Failed to update order items');
    res.status(500).json({ error: 'Error al actualizar la orden' });
  }
});

// GET /api/orders/:code — Buscar por código
router.get('/:code', authenticate, async (req, res) => {
  try {
    const order = await Order.findOne({ code: req.params.code });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(order);
  } catch (err) {
    logger.error({ err, route: 'GET /api/orders/:code' }, 'Failed to get order');
    res.status(500).json({ error: 'Error al buscar la orden' });
  }
});

// PATCH /api/orders/:id/confirm — Confirmar orden → descuenta stock
router.patch('/:id/confirm', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status !== 'pending') {
      logger.warn({ code: order.code, status: order.status }, 'Attempted to confirm non-pending order');
      return res.status(400).json({ error: `No se puede confirmar una orden con estado "${order.status}"` });
    }

    // Verificar stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        logger.warn({ code: order.code, product: item.productName, available: product?.stock || 0, requested: item.quantity }, 'Stock insufficient at confirm time');
        return res.status(400).json({
          error: `Stock insuficiente para "${item.productName}": disponible ${product?.stock || 0}, solicitado ${item.quantity}`,
        });
      }
    }

    // Descontar stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
      logger.info({ code: order.code, product: item.productName, qty: item.quantity }, 'Stock decremented (order confirmed)');
    }

    order.status = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    logger.info({ code: order.code, total: order.total }, 'Order confirmed');
    res.json(order);
  } catch (err) {
    logger.error({ err, route: 'PATCH /api/orders/:id/confirm' }, 'Failed to confirm order');
    res.status(500).json({ error: 'Error al confirmar la orden' });
  }
});

// PATCH /api/orders/:id/cancel — Cancelar orden
router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status !== 'pending') {
      logger.warn({ code: order.code, status: order.status }, 'Attempted to cancel non-pending order');
      return res.status(400).json({ error: `No se puede cancelar una orden con estado "${order.status}"` });
    }

    order.status = 'cancelled';
    await order.save();

    logger.info({ code: order.code }, 'Order cancelled');
    res.json(order);
  } catch (err) {
    logger.error({ err, route: 'PATCH /api/orders/:id/cancel' }, 'Failed to cancel order');
    res.status(500).json({ error: 'Error al cancelar la orden' });
  }
});

module.exports = router;
