require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const categories = [
  { name: 'Compactos' },
  { name: 'Correctores' },
  { name: 'Máscaras de pestañas' },
  { name: 'Polvos sueltos' },
  { name: 'Selladores' },
  { name: 'Cejas' },
  { name: 'Blush' },
  { name: 'Tintas' },
  { name: 'Skin care' },
  { name: 'Delineadores' },
  { name: 'Labiales' },
  { name: 'Herramientas de makeup' },
];

const products = [
  { name: 'Compacto Sport Dolce Bella', price: 3.5, stock: 3, category: 'Compactos', sku: 'DB-COMPACT-001' },
  { name: 'Corrector líquido hidratante Dolce Bella', price: 5, stock: 3, category: 'Correctores', sku: 'DB-CORREC-002' },
  { name: 'Máscara de pestañas Dolce Bella', price: 4, stock: 3, category: 'Máscaras de pestañas', sku: 'DB-MASCARA-003' },
  { name: 'Polvo suelto traslúcido Dolce Bella', price: 7, stock: 3, category: 'Polvos sueltos', sku: 'DB-POLVO-004' },
  { name: 'Fijadores Dolce Bella', price: 6, stock: 2, category: 'Selladores', sku: 'DB-FIJA-005' },
  { name: 'Polvo compacto Aria Cosmetics', price: 8, stock: 4, category: 'Compactos', sku: 'AC-POLVO-006' },
  { name: 'Compacto Seda Mate Aria Cosmetics', price: 8, stock: 3, category: 'Compactos', sku: 'AC-SEDA-007' },
  { name: 'Polvo suelto Aria Cosmetics Baking Skin', price: 10, stock: 3, category: 'Polvos sueltos', sku: 'AC-BAKING-008' },
  { name: 'Tinta de labios con ácido hialurónico Aria Cosmetics', price: 5, stock: 3, category: 'Tintas', sku: 'AC-TINTA-009' },
  { name: 'Lápiz Jumbo Salomé', price: 3, stock: 6, category: 'Cejas', sku: 'SL-JUMBO-010' },
  { name: 'Rubor líquido Sheglam', price: 10, stock: 2, category: 'Blush', sku: 'SH-RUBOR-011' },
  { name: 'Máscara Maxi volumen Prosa', price: 7, stock: 6, category: 'Máscaras de pestañas', sku: 'PR-MAXI-012' },
  { name: 'Máscara Profesional Silicon Café Prosa', price: 7, stock: 6, category: 'Máscaras de pestañas', sku: 'PR-SILCAF-013' },
  { name: 'Máscara Micro fibra Prosa', price: 7, stock: 6, category: 'Máscaras de pestañas', sku: 'PR-MICRO-014' },
  { name: 'Máscara Maxi volumen Silicon Prosa', price: 7, stock: 6, category: 'Máscaras de pestañas', sku: 'PR-MAXSIL-015' },
  { name: 'Papel anti grasa MaxGlow', price: 3.2, stock: 3, category: 'Skin care', sku: 'MG-PAPEL-016' },
  { name: 'Rubor individual MaxGlow', price: 4, stock: 3, category: 'Blush', sku: 'MG-RUBOR-017' },
  { name: 'Delineador Safari Trendy', price: 2, stock: 3, category: 'Delineadores', sku: 'TR-DELI-018' },
  { name: 'Gloss Aura Mocca Trendy', price: 5, stock: 3, category: 'Labiales', sku: 'TR-GLOSS-019' },
  { name: 'Beauty Blender', price: 2, stock: 6, category: 'Herramientas de makeup', sku: 'HB-BLEND-020' },
  { name: 'Portacosméticos Luxury Aria Cosmetics', price: 12.99, stock: 1, category: 'Herramientas de makeup', sku: 'AC-PORTA-021' },
  { name: 'Portacosméticos Maxglow', price: 7, stock: 1, category: 'Herramientas de makeup', sku: 'MG-PORTA-022' },
  { name: 'Lapiz Delineador De Ojos Y Labios Dolce Bella', price: 1, stock: 2, category: 'Delineadores', sku: 'DB-LAPIZ-023' },
  { name: 'Sacapuntas doble Salomé', price: 3, stock: 1, category: 'Herramientas de makeup', sku: 'SL-SACA-024' },
];

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data)}`);
  return data;
}

async function seed() {
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    console.error('ADMIN_USER y ADMIN_PASSWORD deben estar en .env');
    process.exit(1);
  }

  console.log(`API: ${API_URL}`);
  console.log('Haciendo login...');
  const { token } = await api('POST', '/auth/login', { username: ADMIN_USER, password: ADMIN_PASSWORD });
  console.log('Login OK.\n');

  console.log('--- Creando categorías ---');
  const catIds = {};
  for (const cat of categories) {
    try {
      const created = await api('POST', '/categories', cat, token);
      catIds[cat.name] = created.id;
      console.log(`  ✓ ${cat.name} → ${created.id}`);
    } catch (err) {
      console.error(`  ✗ ${cat.name}: ${err.message}`);
    }
  }

  console.log(`\n--- Creando productos (${products.length}) ---`);
  let ok = 0, fail = 0;
  for (const prod of products) {
    const categoryId = catIds[prod.category];
    if (!categoryId) {
      console.error(`  ✗ ${prod.name}: categoría "${prod.category}" no encontrada`);
      fail++;
      continue;
    }
    try {
      await api('POST', '/products', { ...prod, categoryId }, token);
      console.log(`  ✓ ${prod.name}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${prod.name}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n--- Resumen ---`);
  console.log(`  Categorías creadas: ${Object.keys(catIds).length}/${categories.length}`);
  console.log(`  Productos creados:  ${ok}/${products.length} (${fail} fallidos)`);
}

seed().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
