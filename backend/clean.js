require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');

async function clean() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI no definida en .env');
    process.exit(1);
  }

  console.log('Conectando a MongoDB...');
  await mongoose.connect(uri);
  console.log('Conectado a:', mongoose.connection.db.databaseName);

  const [cats, prods, ords] = await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
  ]);

  console.log(`\nLimpieza completada:`);
  console.log(`  Categorías eliminadas: ${cats.deletedCount}`);
  console.log(`  Productos eliminados:  ${prods.deletedCount}`);
  console.log(`  Órdenes eliminadas:    ${ords.deletedCount}`);

  await mongoose.disconnect();
  console.log('\nDesconectado.');
}

clean().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
