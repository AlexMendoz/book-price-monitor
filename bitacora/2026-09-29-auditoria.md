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
| 06 | Reglas contradictorias de minimo historico | Pendiente |
| 07 | Importacion duplicada y publicacion fragmentada | Pendiente |
| 08 | Clientes Telegram y formateadores duplicados | Pendiente |
| 09 | Dos implementaciones para vincular libros | Pendiente |
| 10 | Ranking consulta historiales libro por libro | Pendiente |
| 11 | Portadas descargadas en cada generacion sin limite | Pendiente |
| 12 | Esquema mantenido en bootstrap y migraciones | Resuelto: migraciones Drizzle al iniciar y por CLI; prueba de adopcion sin perdida |
| 13 | README desactualizado | Pendiente |
| 14 | Filtros ambiguos o aparentemente redundantes | Pendiente |

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
