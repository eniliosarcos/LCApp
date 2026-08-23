const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');

// POST /api/auth/login — Login del administrador
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const adminUser = process.env.ADMIN_USER;
    const adminHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminUser || !adminHash) {
      logger.error('Admin credentials not configured');
      return res.status(500).json({ error: 'Credenciales de administrador no configuradas' });
    }

    const passwordOk = await bcrypt.compare(password, adminHash);
    if (username !== adminUser || !passwordOk) {
      logger.warn({ username }, 'Failed login attempt');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ username: adminUser, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    });

    logger.info({ username }, 'Admin login successful');
    res.json({
      token,
      user: { username: adminUser, displayName: 'Administrador', role: 'admin' },
    });
  } catch (err) {
    logger.error({ err }, 'Login error');
    res.status(500).json({ error: 'Error al procesar el login' });
  }
});

module.exports = router;
