# Auditoria y resolucion - 2026-09-29

Objetivo: conservar visible todo el historico de precios, corregir inconsistencias
y reducir operaciones manuales. Un commit por punto; sin push automatico.

## Hallazgos y seguimiento

| ID | Hallazgo | Estado |
| --- | --- | --- |
| 01 | Configuracion JSON esencial excluida de Git | Resuelto: manifiesto, lockfile, tsconfig y CI versionados |
| 02 | Scrapeo parcial puede desactivar libros | Pendiente |
| 03 | Historial repartido entre SQLite y HTML; fusion no idempotente | Pendiente |
| 04 | Relaciones wishlist obsoletas y ofertas inactivas | Pendiente |
| 05 | Snapshots duplicados por libro compartido entre listas | Pendiente |
| 06 | Reglas contradictorias de minimo historico | Pendiente |
| 07 | Importacion duplicada y publicacion fragmentada | Pendiente |
| 08 | Clientes Telegram y formateadores duplicados | Pendiente |
| 09 | Dos implementaciones para vincular libros | Pendiente |
| 10 | Ranking consulta historiales libro por libro | Pendiente |
| 11 | Portadas descargadas en cada generacion sin limite | Pendiente |
| 12 | Esquema mantenido en bootstrap y migraciones | Pendiente |
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
