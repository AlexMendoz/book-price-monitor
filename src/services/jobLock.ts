import fs from 'node:fs';
import path from 'node:path';
export async function withJobLock<T>(operation: () => Promise<T>): Promise<T> {
  const lockPath = path.resolve((process.env.DATABASE_URL || './data/prices.db') + '.job-lock');
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let descriptor: number;
  try { descriptor = fs.openSync(lockPath, 'wx'); }
  catch { throw new Error(`Ya existe un job o un bloqueo pendiente: ${lockPath}. Comprueba el proceso antes de retirar el archivo.`); }
  fs.writeFileSync(descriptor, String(process.pid));
  try { return await operation(); }
  finally { fs.closeSync(descriptor); fs.unlinkSync(lockPath); }
}
