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

// GET /api/orders — Listar órdenes (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/stats — Resumen de ventas (admin)
router.get('/stats', authenticate, async (req, res) => {
  try {
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
