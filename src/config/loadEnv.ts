import { config } from 'dotenv';

config({ path: '.env' });
config({ path: '.env.local', override: true });

const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0);

if (!Number.isFinite(nodeMajor) || nodeMajor < 20) {
  throw new Error(
    `Node.js ${process.versions.node} no soportado. Usa Node.js 20.x (nvm use).`
  );
}
