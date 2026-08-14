require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Config = require('./models/Config');

const { DEFAULT_CONTACT } = Config;

const categoriesData = [
  { name: 'Electrónica', slug: 'electronica', description: 'Gadgets y accesorios' },
  { name: 'Hogar', slug: 'hogar', description: 'Muebles y decoración' },
  { name: 'Ropa', slug: 'ropa', description: 'Indumentaria para todos' },
  { name: 'Deportes', slug: 'deportes', description: 'Equipamiento deportivo' },
];

const productsData = [
  { name: 'Teclado mecánico', slug: 'teclado-mecanico', categorySlug: 'electronica', description: 'Switch rojo, retroiluminación RGB', price: 89.99, discountPrice: 79.99, stock: 25, sku: 'KBD-RED-RGB', tags: ['teclado', 'gaming', 'rgb'] },
  { name: 'Mouse inalámbrico', slug: 'mouse-inalambrico', categorySlug: 'electronica', description: 'Batería de 12 meses de duración', price: 29.99, stock: 40, sku: 'MSE-WRL-001', tags: ['mouse', 'inalámbrico'] },
  { name: 'Auriculares', slug: 'auriculares', categorySlug: 'electronica', description: 'Cancelación de ruido activa', price: 59.99, discountPrice: 49.99, stock: 15, sku: 'AUX-ANC-002', tags: ['audio', 'noise cancelling'] },
  { name: 'Lámpara LED', slug: 'lampara-led', categorySlug: 'hogar', description: 'Luz cálida regulable', price: 24.5, stock: 0, sku: 'LMP-LED-003', tags: ['iluminación'] },
  { name: 'Silla ergonómica', slug: 'silla-ergonomica', categorySlug: 'hogar', description: 'Soporte lumbar ajustable', price: 149.0, stock: 8, sku: 'CHR-ERG-004', tags: ['oficina', 'confort'] },
  { name: 'Camiseta de algodón', slug: 'camiseta-algodon', categorySlug: 'ropa', description: 'Varios colores disponibles', price: 19.99, stock: 60, sku: 'TSH-CTG-005', tags: ['ropa', 'algodón'] },
  { name: 'Chaqueta', slug: 'chaqueta', categorySlug: 'ropa', description: 'Impermeable y abrigada', price: 79.9, discountPrice: 69.9, stock: 12, sku: 'JCK-WTR-006', tags: ['ropa', 'abrigo'] },
  { name: 'Balón de fútbol', slug: 'balon-futbol', categorySlug: 'deportes', description: 'Tamaño oficial', price: 25.0, stock: 30, sku: 'BAL-FUT-007', tags: ['fútbol', 'deporte'] },
  { name: 'Mancuernas', slug: 'mancuernas', categorySlug: 'deportes', description: 'Set de 2 unidades, 5 kg', price: 45.0, stock: 20, sku: 'DBL-5KG-008', tags: ['pesas', 'gimnasio'] },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  await Category.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
  console.log('Datos anteriores eliminados');

  const savedCategories = await Category.insertMany(categoriesData);
  console.log(`${savedCategories.length} categorías creadas`);

  const categoryMap = {};
  savedCategories.forEach(c => { categoryMap[c.slug] = c._id; });

  const productsWithCategory = productsData.map(p => ({
    name: p.name,
    slug: p.slug,
    categoryId: categoryMap[p.categorySlug],
    description: p.description,
    price: p.price,
    discountPrice: p.discountPrice,
    stock: p.stock,
    sku: p.sku,
    tags: p.tags,
    images: [{ url: '', alt: p.name, isPrimary: true, order: 0 }],
  }));

  const savedProducts = await Product.insertMany(productsWithCategory);
  console.log(`${savedProducts.length} productos creados`);

  await Config.findOneAndUpdate({ key: 'site' }, DEFAULT_CONTACT, { new: true, upsert: true });
  console.log('Configuración de contacto creada');

  // Órdenes demo repartidas en hoy / esta semana / este mes (calendario)
  const productsBySku = {};
  savedProducts.forEach(p => { productsBySku[p.sku] = p; });

  const now = new Date();
  function minutesAgo(minutes) { return new Date(now.getTime() - minutes * 60 * 1000); }
  function startOfDay(date) { const x = new Date(date); x.setHours(0, 0, 0, 0); return x; }
  function startOfWeek(date) { const x = startOfDay(date); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function startOfMonth(date) { const x = new Date(date); x.setDate(1); return startOfDay(x); }
  function atOffset(date, days, hours, minutes) {
    const x = new Date(date);
    x.setDate(x.getDate() + days);
    x.setHours(hours, minutes, 0, 0);
    return x;
  }
  function beforeNow(date) { return date < now ? date : minutesAgo(60); }
  function beforeWeekStart(date) {
    const weekStart = startOfWeek(now).getTime();
    return new Date(Math.min(date.getTime(), weekStart - 3600 * 1000));
  }
  function item(sku, quantity) {
    const p = productsBySku[sku];
    return { productId: p._id, productName: p.name, quantity, price: p.price };
  }

  const ordersData = [
    // Hoy — confirmadas, pendiente y cancelada
    { status: 'confirmed', createdAt: minutesAgo(120), items: [item('KBD-RED-RGB', 1), item('MSE-WRL-001', 2)] },
    { status: 'pending', createdAt: minutesAgo(30), items: [item('TSH-CTG-005', 2)] },
    { status: 'cancelled', createdAt: minutesAgo(180), items: [item('LMP-LED-003', 1)] },
    // Esta semana (lunes a hoy)
    { status: 'confirmed', createdAt: beforeNow(atOffset(startOfWeek(now), 1, 10, 30)), items: [item('AUX-ANC-002', 1), item('BAL-FUT-007', 2)] },
    { status: 'confirmed', createdAt: beforeNow(atOffset(startOfWeek(now), 2, 15, 0)), items: [item('CHR-ERG-004', 1), item('LMP-LED-003', 1)] },
    { status: 'cancelled', createdAt: beforeNow(atOffset(startOfWeek(now), 3, 9, 0)), items: [item('JCK-WTR-006', 1)] },
    { status: 'confirmed', createdAt: beforeNow(atOffset(startOfWeek(now), 1, 18, 0)), items: [item('MSE-WRL-001', 1)] },
    // Este mes (antes del inicio de la semana)
    { status: 'confirmed', createdAt: beforeWeekStart(atOffset(startOfMonth(now), 1, 11, 0)), items: [item('KBD-RED-RGB', 2)] },
    { status: 'confirmed', createdAt: beforeWeekStart(atOffset(startOfMonth(now), 2, 12, 30)), items: [item('DBL-5KG-008', 2)] },
    { status: 'confirmed', createdAt: beforeWeekStart(atOffset(startOfMonth(now), 3, 16, 0)), items: [item('AUX-ANC-002', 2), item('TSH-CTG-005', 3)] },
    { status: 'pending', createdAt: beforeWeekStart(atOffset(startOfMonth(now), 5, 14, 0)), items: [item('BAL-FUT-007', 1)] },
    { status: 'cancelled', createdAt: beforeWeekStart(atOffset(startOfMonth(now), 4, 17, 0)), items: [item('JCK-WTR-006', 1)] },
  ];

  const orderDocs = ordersData.map((o, i) => ({
    code: `CAR-S${String(i + 1).padStart(4, '0')}`,
    customerName: 'Cliente demo',
    customerPhone: '',
    items: o.items,
    status: o.status,
    total: o.items.reduce((sum, it) => sum + (it.price * it.quantity), 0),
    createdAt: o.createdAt,
    ...(o.status === 'confirmed' ? { confirmedAt: o.createdAt } : {}),
  }));

  const savedOrders = await Order.insertMany(orderDocs);
  console.log(`${savedOrders.length} órdenes demo creadas (hoy, semana y mes)`);

  await mongoose.disconnect();
  console.log('Desconectado. Seed completado.');
}

seed().catch(err => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});
