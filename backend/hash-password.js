const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run hash -- "tu clave"');
  process.exit(1);
}

if (password.length < 8) {
  console.error('La clave debe tener al menos 8 caracteres.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nCopia este valor en ADMIN_PASSWORD_HASH (Render y/o .env local):\n');
console.log(hash);
console.log('');
