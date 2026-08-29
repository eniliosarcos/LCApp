'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadOrdersRouter, callRoute } = require('./helpers');

function orderDoc(overrides = {}) {
  return {
    _id: 'o1',
    code: 'FIA-AB12C',
    customerName: 'María',
    customerPhone: '12345678',
    items: [{ productId: 'p1', productName: 'Rosa', quantity: 2, price: 50 }],
    status: 'confirmed',
    source: 'fiado',
    total: 100,
    paymentStatus: 'unpaid',
    amountPaid: 0,
    confirmedAt: new Date(),
    payments: [],
    ...overrides,
  };
}

const activeProduct = {
  _id: 'p1',
  name: 'Rosa',
  isActive: true,
  stock: 10,
  price: 50,
  discountPrice: null,
};

test('POST /credit registra un fiado, descuenta stock y marca unpaid', async () => {
  const decrements = [];
  const Product = {
    findById: async (id) => (id === 'p1' ? { ...activeProduct } : null),
    findByIdAndUpdate: async (id, update) => {
      decrements.push({ id, update });
      return {};
    },
  };
  let saved;
  const Order = {
    async create(doc) {
      saved = doc;
      return { ...doc, _id: 'o1', code: 'FIA-AB12C' };
    },
  };

  const router = loadOrdersRouter({ Order, Product });
  const res = await callRoute(router, 'POST', '/credit', {
    body: { customerName: '  María ', customerPhone: ' 12345678 ', items: [{ productId: 'p1', quantity: 3, price: 45 }] },
  });

  assert.equal(res.status, 201);
  assert.equal(saved.source, 'fiado');
  assert.equal(saved.status, 'confirmed');
  assert.equal(saved.paymentStatus, 'unpaid');
  assert.equal(saved.amountPaid, 0);
  assert.equal(saved.total, 135);
  assert.equal(saved.customerName, 'María');
  assert.equal(saved.customerPhone, '12345678');
  // stock decrementado por item
  assert.deepEqual(decrements, [{ id: 'p1', update: { $inc: { stock: -3 } } }]);
  assert.equal(res.body.code, 'FIA-AB12C');
});

test('POST /credit rechaza si falta el nombre del cliente', async () => {
  const Product = { findById: async () => activeProduct, findByIdAndUpdate: async () => ({}) };
  const router = loadOrdersRouter({ Order: { create: async (d) => d }, Product });
  const res = await callRoute(router, 'POST', '/credit', {
    body: { customerName: '   ', customerPhone: '123', items: [{ productId: 'p1', quantity: 1 }] },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /nombre del cliente/i);
});

test('POST /credit rechaza si falta el teléfono del cliente', async () => {
  const Product = { findById: async () => activeProduct, findByIdAndUpdate: async () => ({}) };
  const router = loadOrdersRouter({ Order: { create: async (d) => d }, Product });
  const res = await callRoute(router, 'POST', '/credit', {
    body: { customerName: 'María', customerPhone: '  ', items: [{ productId: 'p1', quantity: 1 }] },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /teléfono del cliente/i);
});

test('POST /credit rechaza si items está vacío o no es array', async () => {
  const Product = { findById: async () => activeProduct, findByIdAndUpdate: async () => ({}) };
  const router = loadOrdersRouter({ Order: { create: async (d) => d }, Product });
  const noArray = await callRoute(router, 'POST', '/credit', {
    body: { customerName: 'María', customerPhone: '123', items: null },
  });
  assert.equal(noArray.status, 400);
  assert.match(noArray.body.error, /items/i);
});

test('POST /credit rechaza si el producto no está activo o no existe', async () => {
  const Product = {
    findById: async () => ({ ...activeProduct, isActive: false }),
    findByIdAndUpdate: async () => ({}),
  };
  const router = loadOrdersRouter({ Order: { create: async (d) => d }, Product });
  const res = await callRoute(router, 'POST', '/credit', {
    body: { customerName: 'María', customerPhone: '123', items: [{ productId: 'p1', quantity: 1 }] },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Producto no disponible/i);
});

test('POST /credit rechaza cantidad inválida (0, negativo o no numérica)', async () => {
  const Product = { findById: async () => activeProduct, findByIdAndUpdate: async () => ({}) };
  const router = loadOrdersRouter({ Order: { create: async (d) => d }, Product });
  const res = await callRoute(router, 'POST', '/credit', {
    body: { customerName: 'María', customerPhone: '123', items: [{ productId: 'p1', quantity: 0 }] },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Cantidad inválida/i);
});

test('POST /credit rechaza stock insuficiente al sumar producto duplicado en varias líneas', async () => {
  const Product = {
    findById: async () => ({ ...activeProduct, stock: 3 }),
    findByIdAndUpdate: async () => ({}),
  };
  const router = loadOrdersRouter({ Order: { create: async (d) => d }, Product });
  // 2 unidades en la línea 1 + 2 en la línea 2 = 4 > 3
  const res = await callRoute(router, 'POST', '/credit', {
    body: {
      customerName: 'María',
      customerPhone: '123',
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p1', quantity: 2 },
      ],
    },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Stock insuficiente/i);
  assert.match(res.body.error, /disponible 3/);
});

test('POST /credit rechaza precio inválido (negativo)', async () => {
  const Product = { findById: async () => activeProduct, findByIdAndUpdate: async () => ({}) };
  const router = loadOrdersRouter({ Order: { create: async (d) => d }, Product });
  const res = await callRoute(router, 'POST', '/credit', {
    body: { customerName: 'María', customerPhone: '123', items: [{ productId: 'p1', quantity: 1, price: -5 }] },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Precio inválido/i);
});

test('GET /credit lista paginado y calcula totalPending solo de unpaid+partial', async () => {
  const orders = [orderDoc({ paymentStatus: 'partial', amountPaid: 30 }), orderDoc({ code: 'FIA-2', paymentStatus: 'unpaid' })];
  let appliedFilter;
  let pageParam;
  const Order = {
    countDocuments: async (filter) => {
      appliedFilter = filter;
      return 2;
    },
    find(filter) {
      return {
        sort() {
          return {
            skip(skip) {
              pageParam = skip;
              return { limit: async () => orders };
            },
          };
        },
      };
    },
    aggregate: async () => [{ total: 170 }],
  };

  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'GET', '/credit?paymentStatus=partial&page=2&limit=5', {});

  assert.equal(res.status, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.page, 2);
  assert.equal(res.body.limit, 5);
  assert.equal(res.body.totalPages, 1);
  assert.equal(res.body.totalPending, 170);
  assert.equal(pageParam, 5);
  assert.deepEqual(appliedFilter, { source: 'fiado', paymentStatus: 'partial' });
  assert.equal(res.body.orders.length, 2);
});

test('GET /credit aplica filtro de búsqueda q con regex escapado sobre nombre o código', async () => {
  let appliedFilter;
  const Order = {
    countDocuments: async (filter) => {
      appliedFilter = filter;
      return 0;
    },
    find() {
      return { sort: () => ({ skip: () => ({ limit: async () => [] }) }) };
    },
    aggregate: async () => [],
  };
  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'GET', '/credit?q=maria', {});

  assert.equal(res.status, 200);
  assert.equal(appliedFilter.source, 'fiado');
  assert.ok(appliedFilter.$or);
  assert.equal(appliedFilter.$or.length, 2);
  assert.equal(appliedFilter.$or[0].customerName.$options, 'i');
});

test('POST /:id/payments registra abono y pasa a partial', async () => {
  const order = orderDoc();
  order.save = async function () {
    return this;
  };
  const Order = {
    findById: async () => order,
  };
  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'POST', '/o1/payments', { body: { amount: 30, note: 'Abono' } });

  assert.equal(res.status, 200);
  assert.equal(order.amountPaid, 30);
  assert.equal(order.paymentStatus, 'partial');
  assert.equal(order.payments.length, 1);
  assert.equal(order.payments[0].amount, 30);
  assert.equal(order.payments[0].note, 'Abono');
});

test('POST /:id/payments pasa a paid cuando el abono cubre el saldo total', async () => {
  const order = orderDoc({ amountPaid: 90, paymentStatus: 'partial', total: 100 });
  order.save = async function () {
    return this;
  };
  const Order = { findById: async () => order };
  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'POST', '/o1/payments', { body: { amount: 10 } });

  assert.equal(res.status, 200);
  assert.equal(order.amountPaid, 100);
  assert.equal(order.paymentStatus, 'paid');
});

test('POST /:id/payments rechaza si la orden no es fiado', async () => {
  const order = { ...orderDoc(), source: 'web' };
  order.save = async function () {
    return this;
  };
  const Order = { findById: async () => order };
  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'POST', '/o1/payments', { body: { amount: 10 } });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /no es un fiado/i);
});

test('POST /:id/payments rechaza una orden inexistente con 404', async () => {
  const Order = { findById: async () => null };
  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'POST', '/o999/payments', { body: { amount: 10 } });

  assert.equal(res.status, 404);
  assert.match(res.body.error, /no encontrada/i);
});

test('POST /:id/payments rechaza monto que excede el saldo pendiente', async () => {
  const order = orderDoc(); // total 100, amountPaid 0
  order.save = async function () {
    return this;
  };
  const Order = { findById: async () => order };
  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'POST', '/o1/payments', { body: { amount: 150 } });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /excede el saldo/i);
});

test('POST /:id/payments rechaza monto <= 0', async () => {
  const order = orderDoc();
  order.save = async function () {
    return this;
  };
  const Order = { findById: async () => order };
  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'POST', '/o1/payments', { body: { amount: 0 } });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /mayor a 0/i);
});

test('POST /:id/payments rechaza un fiado ya pagado', async () => {
  const order = orderDoc({ paymentStatus: 'paid', amountPaid: 100 });
  order.save = async function () {
    return this;
  };
  const Order = { findById: async () => order };
  const router = loadOrdersRouter({ Order, Product: {} });
  const res = await callRoute(router, 'POST', '/o1/payments', { body: { amount: 10 } });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /ya está completamente pagado/i);
});
