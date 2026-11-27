const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Usa Node.js 20 o superior antes de instalar el timer.');
const root = path.resolve(__dirname, '../..');
const directory = path.join(os.homedir(), '.config/systemd/user');
const quote = value => '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%').replaceAll('$', '$$') + '"';
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'book-price-monitor.service'), `[Unit]
Description=Actualizar y publicar reportes de libros

[Service]
Type=oneshot
WorkingDirectory=${root.replaceAll('%', '%%')}
ExecStart=${quote(process.execPath)} ${quote(path.join(root, 'scripts/automation/run.cjs'))}
UMask=0077
TimeoutStartSec=infinity
`);
fs.writeFileSync(path.join(directory, 'book-price-monitor.timer'), `[Unit]
Description=Monitor diario de libros

[Timer]
OnCalendar=*-*-* 09:00:00 America/Mexico_City
RandomizedDelaySec=2h
FixedRandomDelay=false
AccuracySec=1us
Persistent=true
Unit=book-price-monitor.service

[Install]
WantedBy=timers.target
`);
execFileSync('systemd-analyze', ['--user', 'verify', path.join(directory, 'book-price-monitor.service'), path.join(directory, 'book-price-monitor.timer')], { stdio: 'inherit' });
execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'inherit' });
execFileSync('systemctl', ['--user', 'enable', '--now', 'book-price-monitor.timer'], { stdio: 'inherit' });
console.log('Timer activado: diario entre 09:00 y 11:00 America/Mexico_City (hora aleatoria). Consulta systemctl --user list-timers book-price-monitor.timer');
