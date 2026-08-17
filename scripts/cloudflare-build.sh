#!/bin/bash
set -e

mkdir -p src/environments

cat > src/environments/environment.ts << EOF
import { Environment } from '../app/core/models/environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
EOF

cat > src/environments/environment.prod.ts << EOF
import { Environment } from '../app/core/models/environment.model';

export const environment: Environment = {
  production: true,
  apiUrl: '${API_URL}'
};
EOF

npx ng build --configuration production --base-href /
cp public/_redirects dist/catalog/_redirects
