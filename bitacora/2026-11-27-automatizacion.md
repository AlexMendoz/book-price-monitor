# Automatizacion simple con systemd

- Timer diario a las 09:15 de Ciudad de Mexico, con recuperacion de una ejecucion
  pendiente al activarse; instalador que fija la ruta de Node usada.
- Copia aislada en .automation/checkout, ignorada por Git. No modifica cambios
  locales del usuario ni publica productos privados.
- Comparte SQLite y perfil originales; conserva el historico y el bloqueo del job.
- Publicacion limitada a HTML de reportes, index e history.json; commit solo
  con cambios, push sin force, sin merges automaticos de divergencias.
- Fallos detienen la publicacion y avisan por Telegram con timeout del aviso.
- Comando manual para recuperar scraping y reportes pendientes con navegador.
- Pruebas con remoto Git local: publicacion correcta, conservacion del reporte
  original sin commit, fallo sin push y bloqueo ante salida parcial pendiente.
- No se modificaron los cuatro reportes que ya estaban cambiados al iniciar.

Instalacion y limites operativos: docs/automatizacion.md.

## Validacion e instalacion

- Typecheck y los 14 archivos de pruebas pasan con Node 24.22.3. Node 22 no
  coincide con el ABI del better-sqlite3 ya instalado; no se reinstalaron ni
  alteraron las dependencias de la carpeta de desarrollo.
- Unidades verificadas por systemd-analyze. Timer instalado y activo; siguiente
  ejecucion al verificar: 2026-11-28 09:15 America/Mexico_City.
- Acceso de lectura a origin/master probado desde un servicio de usuario
  systemd con SSH BatchMode. No se comprobo permiso de escritura con un push.
- No se ejecuto el scraper real ni se publicaron commits durante la instalacion.
  Las pruebas del flujo usan un remoto Git temporal y simulan el job.

## Ventana aleatoria

Por solicitud posterior, se cambia la programacion de 09:15 a una ventana
diaria 09:00-11:00 America/Mexico_City: RandomizedDelaySec=2h,
FixedRandomDelay=false y AccuracySec=1us. Se conserva Persistent=true;
la recuperacion tras inactividad puede ocurrir fuera de la ventana.

## Recuperacion y confirmacion de Pages

- Estado atomico local por etapas: prepare, collect, commit, push, deploy, done.
- Reanuda commits y despliegues pendientes sin repetir scraping. Recupera tambien
  una interrupcion entre crear el commit y guardar su SHA, validando padre y mensaje.
- Tres intentos como maximo ante errores de red reconocidos, con esperas 10/30 s.
  No reintenta extracciones, CAPTCHA, conflictos ni problemas de permisos.
- Comprueba deploy-pages.yml por SHA y rama; no anuncia exito por un mero push.
- Cola local de Telegram; fallos de transporte no bloquean publicacion.
- Respaldo mediante API SQLite backup, quick_check y rotacion de siete copias.
- automation:status expone etapa, commit, respaldo, error y fecha sin secretos.
- Pruebas con Git temporal para push fallido y Pages pendiente sin nueva recoleccion;
  tests de reintentos, permisos, cola Telegram y respaldo de SQLite con WAL activo.
- Typecheck y los 15 archivos de pruebas pasan con Node 24.22.3. Sin scraping,
  push o mensajes reales durante estas validaciones. Timer y reportes previos intactos.
- La copia aislada necesita los cambios del job publicados en master para usar
  la cola de oportunidades; el nuevo runner local no requiere reinstalar el timer.

Referencias: https://docs.github.com/en/rest/actions/workflow-runs y
https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md.
