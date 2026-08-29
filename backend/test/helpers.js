'use strict';
const path = require('path');
const http = require('http');

function stubModule(absPath, exports) {
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports,
  };
}

// Carga routes/orders.js reemplazando sus dependencias por mocks.
function loadOrdersRouter({ Order, Product, auth, logger }) {
  const modelsDir = path.resolve(__dirname, '../models');
  stubModule(path.join(modelsDir, 'Order.js'), Order);
  stubModule(path.join(modelsDir, 'Product.js'), Product);

  stubModule(path.resolve(__dirname, '../middleware/auth.js'), auth || ((req, res, next) => next()));

  stubModule(
    path.resolve(__dirname, '../lib/logger.js'),
    logger || { info() {}, warn() {}, error() {} }
  );

  delete require.cache[path.resolve(__dirname, '../routes/orders.js')];
  return require('../routes/orders');
}

function request(app, method, url, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const data = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: url,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
            ...headers,
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            server.close();
            let json = null;
            try {
              json = JSON.parse(raw);
            } catch {
              /* no-op */
            }
            resolve({ status: res.statusCode, body: json });
          });
        }
      );
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (data) req.write(data);
      req.end();
    });
  });
}

// Monta el router en una app express y ejecuta la request.
async function callRoute(router, method, url, args = {}) {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/orders', router);
  return request(app, method, `/api/orders${url}`, args);
}

// Product.findById con chainable sort/skip/limit (para GET listados).
function fakerFind(...items) {
  return {
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    then(resolve) {
      resolve(items);
    },
  };
}

module.exports = { loadOrdersRouter, callRoute, stubModule, fakerFind };
