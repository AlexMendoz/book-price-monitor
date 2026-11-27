# Automatizacion local

Timer de usuario systemd: diario entre 09:00 y 11:00, America/Mexico_City,
con un retraso aleatorio distinto en cada iteracion (RandomizedDelaySec=2h,
FixedRandomDelay=false). AccuracySec=1us evita el margen adicional de agrupacion
de un minuto. Si la PC estuvo apagada, Persistent=true permite una ejecucion
pendiente al activarse el timer, tambien con retraso aleatorio y posiblemente
fuera de esa ventana; no recupera precios de los dias perdidos. Requiere una sesion de
usuario activa. No se configura linger ni se despierta la PC automaticamente.

## Instalar

Con Node >=20 activo y las dependencias del proyecto instaladas:

```bash
npm run automation:install
systemctl --user list-timers book-price-monitor.timer
```

El instalador fija la ruta del Node utilizado (funciona con nvm sin cargar
un shell interactivo). Si borras esa version o mueves el proyecto, reinstala.
Requiere Git con acceso de lectura/escritura a origin sin preguntas interactivas,
y las dependencias de sistema de Chromium instaladas. Si usas un agente SSH,
debe estar disponible en el entorno del servicio de usuario.

## Funcionamiento

- Crea `.automation/checkout` desde origin/master y solo actualiza por fast-forward.
- Si hay una operacion pendiente, la retoma antes de iniciar otra recoleccion.
- Para una nueva recoleccion instala dependencias con npm ci y Chromium.
- Usa la configuracion .env.local/.env del proyecto original, su base SQLite y
  su perfil de navegador. El bloqueo existente del job evita compartir la base
  entre jobs simultaneos. No ejecutes otros escritores de SQLite en paralelo.
- Antes de recolectar crea un respaldo consistente de SQLite (incluye WAL) en
  `.automation/backups/`. Conserva los siete ultimos respaldos correctos. Un
  fallo al respaldar detiene la recoleccion. No restaura respaldos automaticamente.
- Ejecuta run-job-headless: extrae, genera reportes/menu y encola oportunidades.
- Solo si termina bien, permite publicar index.html, reports/*.html (nivel
  superior) y reports/history.json. Hace commit si hay cambios y push sin force.
- El push activa el workflow existente de Pages. No modifica la carpeta de
  desarrollo ni agrega productos privados, secretos o bases de datos a Git.
- Confirma el workflow deploy-pages.yml para el SHA exacto enviado a master;
  solo entonces anuncia "Pagina actualizada". Consulta hasta 20 veces con
  intervalos de 30 segundos. Si falla o no termina, deja la verificacion pendiente.
- Reintenta operaciones de red hasta tres intentos en total, con esperas de
  10 y 30 segundos, solo ante errores transitorios reconocidos. No reintenta el
  scraper, CAPTCHA, datos incompletos, conflictos de Git o permisos incorrectos.
- Los fallos de Telegram no impiden publicar. Los avisos quedan en
  `.automation/outbox/` y se reintentan en siguientes ejecuciones. En un job
  manual independiente, la cola predeterminada esta junto a la base, en
  `notifications/`. La entrega puede duplicarse si Telegram recibio un aviso
  pero se perdio su confirmacion. Sin credenciales, los avisos quedan pendientes.

El estado se guarda atomicamente en `.automation/state.json`: etapa, estado,
fecha, commit, respaldo y ultimo error. Etapas: prepare, collect, commit, push,
deploy, done. Un fallo en push retoma el mismo commit; un fallo en deploy vuelve
a comprobar Pages sin ejecutar scraping, npm ci ni un nuevo commit. Tras resolver
una operacion pendiente, esa ejecucion termina; la proxima inicia una recoleccion.
Los reintentos no se activan automaticamente cuando vuelve la conexion: ocurren
en la ejecucion en curso o al volver a invocar el proceso.

Para repositorios publicos la comprobacion usa la API publica de GitHub. Si es
privado o se alcanza el limite sin autenticar, configura GH_TOKEN en .env.local
con permiso Actions de lectura para ese repositorio. No se guarda en el estado.

La copia aislada ejecuta el codigo publicado en origin/master, no cambios sin
commit del proyecto original. Los reportes publicados automaticamente se ven
en Pages y en `.automation/checkout/reports`; los HTML de tu carpeta de trabajo
no se sobrescriben. No borres `.automation/checkout` con cambios pendientes.
Los cambios a runScheduledJob.ts y notificationOutbox.cjs deben estar publicados
en master para que la copia aislada use la nueva cola de oportunidades. El runner
del timer se lee del proyecto original y no necesita reinstalarse por estos cambios.

## Revisar y recuperar

```bash
npm run automation:status
journalctl --user -u book-price-monitor.service -n 100 --no-pager
systemctl --user start book-price-monitor.service
```

Para retomar inmediatamente una publicacion o verificacion pendiente:

```bash
npm run automation:run
```

Si Pages termino con error o fue cancelado, revisa y reejecuta su workflow para
el commit pendiente en GitHub y vuelve a ejecutar automation:run. No se relanzan
workflows ni se descartan commits pendientes automaticamente.

Si la tienda requiere intervencion, desde una terminal con entorno grafico:

```bash
npm run automation:manual
```

Este comando usa la misma copia y base, abre el navegador y publica solo al
terminar correctamente. Permite regenerar reportes pendientes de un fallo
anterior sin descartarlos antes de ejecutar. Si hay conflictos de Git, cambios
de codigo en la copia o un push rechazado, requiere revision manual. Nunca
hace reset, stash, rebase ni push forzado. Si la operacion pendiente es push o
deploy, automation:manual tambien retoma esa etapa, sin abrir el navegador.

Ante un cierre abrupto pueden quedar `.automation/run.lock` o el `.job-lock`
adyacente a la base, o un outbox/send.lock. Comprueba el PID y que no haya procesos de scraping activos
antes de retirar un bloqueo; no lo borres automaticamente.

## Detener o cambiar horario

```bash
systemctl --user disable --now book-price-monitor.timer
```

Para cambiar la ventana, edita OnCalendar y RandomizedDelaySec en
`~/.config/systemd/user/book-price-monitor.timer`, ejecuta
`systemctl --user daemon-reload` y reinicia el timer. Desactivar el timer no
interrumpe un job que ya este corriendo.
