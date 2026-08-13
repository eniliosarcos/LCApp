const mongoose = require('mongoose');

const DEFAULT_CONTACT = {
  key: 'site',
  whatsapp: '521234567890',
  whatsappDisplay: '+52 123 456 7890',
  instagram: '@tu_usuario',
  telegram: '@tu_usuario',
};

// Configuración del sitio: documento único (clave fija) con los datos de contacto.
// Se edita desde el panel admin (PUT /api/config) y se consume de forma pública (GET /api/config).
const configSchema = new mongoose.Schema({
  key: { type: String, default: 'site', unique: true },
  whatsapp: { type: String, default: '' },
  whatsappDisplay: { type: String, default: '' },
  instagram: { type: String, default: '' },
  telegram: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Config', configSchema);
module.exports.DEFAULT_CONTACT = DEFAULT_CONTACT;

