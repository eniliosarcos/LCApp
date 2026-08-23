const express = require('express');
const router = express.Router();
const Config = require('../models/Config');
const authenticate = require('../middleware/auth');
const logger = require('../lib/logger');

const { DEFAULT_CONTACT } = Config;
const SITE_KEY = 'site';

async function getConfig() {
  return Config.findOne({ key: SITE_KEY });
}

// GET /api/config — público: datos de contacto para footer y carrito.
// Si aún no existe configuración (p.ej. primer deploy en producción), devuelve
// los defaults de DEFAULT_CONTACT en lugar de 404; el admin los edita y el PUT crea el doc.
router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    if (!config) {
      const { key, ...contact } = DEFAULT_CONTACT;
      return res.json(contact);
    }
    res.json({
      whatsapp: config.whatsapp,
      whatsappDisplay: config.whatsappDisplay,
      instagram: config.instagram,
      telegram: config.telegram,
    });
  } catch (err) {
    logger.error({ err, route: 'GET /api/config' }, 'Failed to get config');
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
});

// PUT /api/config — solo admin: actualiza los datos de contacto
router.put('/', authenticate, async (req, res) => {
  try {
    const { whatsapp, whatsappDisplay, instagram, telegram } = req.body;
    if ([whatsapp, whatsappDisplay, instagram, telegram].every(value => value === undefined)) {
      return res.status(400).json({ error: 'Faltan datos: envía al menos un campo de contacto' });
    }

    const config = await getConfig();
    const base = config
      ? { whatsapp: config.whatsapp, whatsappDisplay: config.whatsappDisplay, instagram: config.instagram, telegram: config.telegram }
      : DEFAULT_CONTACT;
    const updated = await Config.findOneAndUpdate(
      { key: SITE_KEY },
      {
        $set: {
          whatsapp: whatsapp ?? base.whatsapp,
          whatsappDisplay: whatsappDisplay ?? base.whatsappDisplay,
          instagram: instagram ?? base.instagram,
          telegram: telegram ?? base.telegram,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    res.json({
      whatsapp: updated.whatsapp,
      whatsappDisplay: updated.whatsappDisplay,
      instagram: updated.instagram,
      telegram: updated.telegram,
    });
  } catch (err) {
    logger.error({ err, route: 'PUT /api/config' }, 'Failed to update config');
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
});

module.exports = router;
