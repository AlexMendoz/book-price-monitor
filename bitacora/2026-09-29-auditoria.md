# Auditoria y resolucion - 2026-09-29

Objetivo: conservar visible todo el historico de precios, corregir inconsistencias
y reducir operaciones manuales. Un commit por punto; sin push automatico.

## Hallazgos y seguimiento

| ID | Hallazgo | Estado |
| --- | --- | --- |
| 01 | Configuracion JSON esencial excluida de Git | Resuelto: manifiesto, lockfile, tsconfig y CI versionados |
| 02 | Scrapeo parcial puede desactivar libros | Resuelto: validar todas las listas antes de persistir; vacias o tarjetas incompletas abortan |
| 03 | Historial repartido entre SQLite y HTML; fusion no idempotente | Resuelto: importar a SQLite, respaldo JSON portable y fechas con precision explicita |
| 04 | Relaciones wishlist obsoletas y ofertas inactivas | Resuelto: membresia por lista, lastSeenAt y consultas activas; historico conservado |
| 05 | Snapshots duplicados por libro compartido entre listas | Resuelto: clave unica libro-ejecucion sin deduplicar registros historicos |
| 06 | Reglas contradictorias de minimo historico | Resuelto: calculo puro comun; minimo vigente distinto de nuevo record |
| 07 | Importacion duplicada y publicacion fragmentada | Resuelto: sync transaccional compartido; job genera reportes, menu y recursos; preview local |
| 08 | Clientes Telegram y formateadores duplicados | Resuelto: transporte, presentacion de ofertas y formateadores compartidos |
| 09 | Dos implementaciones para vincular libros | Resuelto: un upsert atomico para vincular y reactivar |
| 10 | Ranking consulta historiales libro por libro | Resuelto: consultas por lotes e indice; prueba cuenta consultas |
| 11 | Portadas descargadas en cada generacion sin limite | Resuelto: cache persistente, maximo cuatro descargas, timeout y recuperacion de portadas embebidas |
| 12 | Esquema mantenido en bootstrap y migraciones | Resuelto: migraciones Drizzle al iniciar y por CLI; prueba de adopcion sin perdida |
| 13 | README desactualizado | Resuelto: comandos reales, flujo automatico, historico, filtros y publicacion documentados |
| 14 | Filtros ambiguos o aparentemente redundantes | Resuelto: un selector de precio, minimo contextual y orden por precio; pruebas desktop y movil |

## Proteccion del historico

- Copia inicial local: `/tmp/book-monitor-before-20260929/` (reportes y base).
- No borrar snapshots ni libros al salir de una wishlist.
- Validar que cada serie previa siga representada tras regenerar reportes.
- Probar importaciones repetidas, bases vacias, precios iguales y listas parciales.
- Ejecutar pruebas aisladas sin scrapeos reales ni notificaciones Telegram.

## Revision inicial

TypeScript pasa con Node 22.12.0. Una base temporal confirma que el ranking incluye
libros inactivos y que igualar un minimo produce resultados distintos entre
analizador y ranking. El arbol de trabajo estaba limpio al iniciar.

## Validacion de recuperacion (03)

En copia temporal de la base y los reportes originales: 4,568 puntos del reporte
principal y 917 del compartible quedan representados en 5,485 observaciones de
175 libros. El HTML regenerado conserva las 5,485. Comparacion por URL, dia y
precios con multiplicidad; no se borraron repeticiones historicas. Las fechas
legadas sin hora se etiquetan con precision de dia. SQLite es la fuente de las
consultas; `reports/history.json` es su respaldo portable para reconstruccion.

## Flujo unificado (07)

`run-job-manual`, `run-job-headless` y `run-job` ejecutan sincronizacion validada,
transaccion SQLite, reportes global/compartible/ranking, actualizacion de graficas
individuales existentes, menu y recursos, y finalmente Telegram. `dev` reutiliza
la sincronizacion sin publicar. `build-reports` reconstruye sin scrapeo ni envio.
`prepare-site` comparte el armado de menu/recursos con Pages; `preview` sirve
`reports/` desde una ruta fija. El bloqueo local evita jobs simultaneos.
Pruebas: rollback ante error de persistencia, lista parcial, libro compartido,
actualizacion de grafica individual y consistencia entre reportes globales.

## Filtros y graficas (14)

Se elimina el selector separado de estado de precio y se integra su opcion
"En su minimo historico" en Precio. "Mas barato entre los resultados" calcula el
minimo despues de buscar y seleccionar estado de wishlist; conserva empates.
Se agrega orden ascendente de precio. Ambos conceptos son distintos, no se
elimina ninguno. El historico completo permanece en la vista por defecto.

Chromium: escritorio 1280 px y movil 390 px, reporte compartible y fallback sin Chart.js,
combinaciones de filtros, busqueda sin acentos y series de un solo punto. Tambien
se verificaron los HTML reales y las graficas de Amarillo de oro y gloria.
Sin errores JavaScript ni desbordamiento horizontal. Generacion offline sin
scrapeo ni mensajes Telegram; 5,485 observaciones en ambos reportes globales.

## Hallazgo adicional: URLs equivalentes

La prueba visual encontro dos tarjetas de Amarillo de oro y gloria: URLs con
slugs distintos pero el mismo `/p/64595701`. Se identifica el producto por host
e identificador estable de Buscalibre. Las observaciones y membresias de alias
se reasignan al libro canonico; se conservan los registros originales de libros
como inactivos y no se elimina ningun snapshot. Regeneracion: 5,485 observaciones,
169 productos unicos. Prueba de colision de runId y de importacion repetida incluida.

## Cierre de migraciones (12)

Se versiona el snapshot del esquema actual para que `npm run generate` no intente
crear otra vez las tablas iniciales. La configuracion Drizzle usa la misma
prioridad de entorno que la aplicacion. Validacion: `npm run generate` no detecta
diferencias ni produce migraciones redundantes.

## Indice de commits

| Punto | Commit |
| --- | --- |
| Bitacora inicial | `3f13052` |
| 01 Configuracion reproducible | `751de3d` |
| 02 Extracciones incompletas | `7b4114d` |
| 03 Historico portable y recuperacion | `2feefef` |
| 04 Membresias e inactividad | `3abc09a` |
| 05 Una observacion por ejecucion | `5871e54` |
| 06 Reglas de ofertas | `1835e49` |
| 07 Flujo automatico | `f74e796` |
| 08 Telegram y formatos | `18f3238` |
| 09 Vinculos atomicos | `5207d28` |
| 10 Ranking por lotes | `e5bf732` |
| 11 Cache de portadas | `253d2f6` |
| 12 Migraciones | `6719cad`, cierre `4a14310` |
| 13 Documentacion | `7a2b1cf` |
| 14 Filtros y graficas | `39eafa5` |
| Adicional: identidades de producto | `451a32f` |

## Limites operativos documentados

No se ejecuto scrapeo real ni se enviaron notificaciones reales durante esta
refactorizacion. Las pruebas usan datos y transporte simulados. La publicacion
requiere un push posterior; los commits de esta tarea son locales. Una lista
vacia se considera no verificable y no causa bajas masivas. Un fallo de Telegram
no revierte precios ya guardados. Las fechas historicas sin hora no se presentan
como horas recuperadas en el respaldo portable.

## Validacion final - 2026-09-30

- `npm run typecheck`: correcto.
- `npm test`: 16 pruebas correctas, incluyendo rollback, expiracion, aliases,
  reconstruccion desde respaldo portable y bloqueo de ejecuciones simultaneas.
- `npm run test:browser`: correcto en 1280 px y 390 px; filtros, empates,
  series de un punto y renderizado de respaldo sin CDN.
- `npm ci` en checkout temporal limpio: instalacion correcta. TypeScript,
  pruebas, `build-reports` y `merge-chart-all` funcionan sin `.env` ni base local.
- Fusion repetida en el checkout limpio: cero observaciones agregadas; permanecen
  5,485 observaciones y 169 productos unicos.
- Comparacion con la copia de reportes anterior a los cambios: las 5,485
  observaciones originales siguen representadas, contando repeticiones.
- Preview HTTP: los siete enlaces del menu y los recursos de rosas responden
  200; 169 graficas y una unica tarjeta de Amarillo de oro y gloria.
- `npm run generate`: sin diferencias de esquema ni migraciones nuevas.
- `git diff --check`: correcto.

Las pruebas de navegador quedan disponibles como script NPM e incluidas en CI.
El servidor temporal usado para verificar enlaces se detuvo al terminar.
No se hizo push ni se modificaron credenciales.
