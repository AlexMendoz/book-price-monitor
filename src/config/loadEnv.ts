import { config } from 'dotenv';

// Prioridad de variables:
// 1) Variables del shell (npm scripts / export)
// 2) .env.local
// 3) .env
// dotenv no sobrescribe variables ya definidas por defecto.
config({ path: '.env.local' });
config({ path: '.env' });

const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0);

if (!Number.isFinite(nodeMajor) || nodeMajor < 20) {
  throw new Error(
    `Node.js ${process.versions.node} no soportado. Usa Node.js 20.x (nvm use).`
  );
}
