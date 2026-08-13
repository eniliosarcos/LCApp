require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');
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

  await mongoose.disconnect();
  console.log('Desconectado. Seed completado.');
}

seed().catch(err => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});
