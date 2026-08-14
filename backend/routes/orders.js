const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const authenticate = require('../middleware/auth');

// Genera código CAR-XXXXX
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CAR-';
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
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

// POST /api/orders — Crear orden desde el carrito
router.post('/', async (req, res) => {
  try {
    const { customerName, customerPhone, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Faltan datos: items son requeridos' });
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

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — Listar órdenes paginadas (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    await expireStalePendingOrders();
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
      return res.status(400).json({ error: `No se puede actualizar una orden con estado "${order.status}"` });
    }

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.items = items;
    order.total = total;
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:code — Buscar por código
router.get('/:code', authenticate, async (req, res) => {
  try {
    const order = await Order.findOne({ code: req.params.code });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/confirm — Confirmar orden → descuenta stock
router.patch('/:id/confirm', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `No se puede confirmar una orden con estado "${order.status}"` });
    }

    // Verificar stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuficiente para "${item.productName}": disponible ${product?.stock || 0}, solicitado ${item.quantity}`,
        });
      }
    }

    // Descontar stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }

    order.status = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/cancel — Cancelar orden
router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `No se puede cancelar una orden con estado "${order.status}"` });
    }

    order.status = 'cancelled';
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
