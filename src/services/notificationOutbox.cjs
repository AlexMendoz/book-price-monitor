const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function directory(env) {
  return path.resolve(env.NOTIFICATION_OUTBOX || path.join(path.dirname(env.DATABASE_URL || './data/prices.db'), 'notifications'));
}

function enqueue(env, text, html = false) {
  const folder = directory(env);
  fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
  const file = path.join(folder, `${Date.now()}-${randomUUID()}.json`);
  fs.writeFileSync(file + '.tmp', JSON.stringify({ text, html }), { mode: 0o600 });
  fs.renameSync(file + '.tmp', file);
}

async function flush(env, request = fetch) {
  const folder = directory(env);
  if (!fs.existsSync(folder)) return;
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn('Telegram no configurado; avisos pendientes en la cola local.');
    return;
  }
  // The runner and a manual job may drain the same queue; never send concurrently.
  let lock;
  try { lock = fs.openSync(path.join(folder, 'send.lock'), 'wx', 0o600); }
  catch { console.warn('Cola de avisos ocupada o bloqueo pendiente.'); return; }
  try {
    fs.writeFileSync(lock, String(process.pid));
    for (const file of fs.readdirSync(folder).filter(name => name.endsWith('.json')).sort()) {
      const message = JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8'));
      const response = await request(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message.text, ...(message.html ? { parse_mode: 'HTML' } : {}) }),
      });
      if (!response.ok || !(await response.json()).ok) throw new Error('Telegram no confirmo el aviso.');
      fs.unlinkSync(path.join(folder, file));
    }
  } catch { console.warn('Avisos pendientes; Telegram se reintentara en la proxima ejecucion.'); }
  finally { fs.closeSync(lock); fs.unlinkSync(path.join(folder, 'send.lock')); }
}

async function notify(env, text, html = false) {
  try { enqueue(env, text, html); await flush(env); }
  catch { console.error('No se pudo guardar o enviar el aviso. Revisa el almacenamiento local.'); }
}

module.exports = { enqueue, flush, notify };
