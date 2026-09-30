# Book Price Monitor

Monitor de precios de libros en Buscalibre con historico SQLite, reportes HTML,
GitHub Pages y notificaciones Telegram.

## Instalacion

Desde la raiz del proyecto:

```bash
nvm use
npm ci
npx playwright install chromium
```

En Linux, si faltan dependencias del navegador:

```bash
npx playwright install-deps chromium
```

Crea `.env` tomando `.env.example` como referencia. Configura las listas en
`WISHLISTS_JSON` como un arreglo de objetos `{ "name": "Mi lista", "url": "URL real" }`.
La prioridad de configuracion es: variables del shell, `.env.local`, `.env`.
Los enlaces personales y credenciales no se versionan.

## Uso habitual

```bash
npm run run-job-manual
npm run preview
```

Abre `http://127.0.0.1:4173`. El servidor usa `reports/` como raiz: no crees otra
carpeta `reports` dentro de ella ni copies archivos manualmente.

El job realiza, en orden:

1. Extrae y valida todas las wishlists.
2. Guarda libros, membresias y una observacion por libro y ejecucion en una transaccion.
3. Regenera reportes global, compartible y ranking, y actualiza las graficas individuales existentes.
4. Prepara el menu y copia los recursos de `rosas_rojas/`.
5. Notifica las ofertas por Telegram si esta configurado.

Una extraccion vacia o incompleta aborta la sincronizacion antes de persistir
precios o bajas si hay tarjetas sin titulo identificable. Un libro identificado
sin precio conserva su membresia y registra un precio no disponible (`null`),
sin borrar sus observaciones anteriores ni convertir la ausencia en cero.
Si aparece con precio en otra lista, se prioriza esa observacion en la misma ejecucion.
Una wishlist realmente vacia requiere revisar su configuracion;
no se interpreta automaticamente como una extraccion completa. Los fallos de
persistencia revierten la transaccion. Un error posterior de reportes o Telegram
no revierte los precios ya guardados: puedes regenerar sin repetir el scrapeo.

## Comandos

| Comando | Resultado |
| --- | --- |
| `npm run run-job-manual` | Flujo completo con navegador y verificacion manual |
| `npm run run-job-headless` | Flujo completo sin UI; falla si requiere verificacion humana |
| `npm run run-job` | Flujo completo con las opciones del entorno |
| `npm run dev` | Solo sincronizacion, reutilizando el mismo servicio |
| `npm run build-reports` | Todos los reportes, menu y recursos; sin scrapeo ni Telegram |
| `npm run chart-all` | Reporte global desde el historico conservado |
| `npm run chart-all-shareable` | Reporte global autocontenido |
| `npm run chart -- <bookId>` | Grafica individual; consulta los IDs con `list-books` |
| `npm run merge-chart-all -- <reporte.html>` | Recupera historia de un HTML global a SQLite y regenera |
| `npm run prepare-site` | Menu y recursos, usando el mismo armado que Pages |
| `npm run preview` | Servidor local, puerto 4173 o variable `PORT` |
| `npm run list-books` | Libros e identificadores locales |
| `npm run rank-deals` | Ranking de libros activos en consola |
| `npm run rank-deals-html` | Ranking HTML, incluso si no hay ofertas activas |
| `npm run send-telegram` | Envia el ranking global por Telegram |
| `npm run telegram-bot` | Bot interactivo por wishlist |
| `npm run migrate` | Aplica las migraciones pendientes |
| `npm run generate` | Genera una migracion al modificar `src/db/schema.ts` |
| `npm run typecheck` | Verificacion TypeScript |
| `npm test` | Pruebas con bases temporales y transporte simulado |
| `npm run test:browser` | Filtros y graficas en Chromium, escritorio y movil |

Para reconstruir sin descargar portadas:

```bash
REPORTS_OFFLINE=true npm run build-reports
```

Las portadas se recuperan de los HTML existentes y del cache local. Sin una
portada disponible se usa un marcador; esto no afecta las series de precios.

## Conservacion del historico

SQLite (`DATABASE_URL`, por defecto `data/prices.db`) es la fuente de las consultas.
Antes de generar reportes se recuperan las observaciones que falten desde
`reports/history.json` y los HTML globales presentes. Cada importacion respalda
la base en `data/backups/`; la importacion es repetible sin agregar duplicados.

`reports/history.json` es el respaldo portable versionado. Permite reconstruir
los precios en otro equipo aunque SQLite no este en Git. No contiene la
configuracion privada de las wishlists: ejecuta una sincronizacion para recuperar
sus membresias. Los IDs numericos de libros son locales a cada base.

Las fechas antiguas que solo conservan el dia mantienen esa precision; no se
recuperan horas que el HTML anterior habia descartado. No se borran observaciones
historicas repetidas. Las URLs de Buscalibre con diferente slug y el mismo
identificador `/p/` se reunen en un producto sin eliminar sus precios.

Salir de una wishlist o superar siete dias sin actualizarse desactiva el libro
para ofertas, pero su historial sigue visible en los reportes globales.
Las membresias se controlan por lista y la reaparicion reactiva el vinculo.

## Filtros

El reporte global tiene busqueda y dos selectores:

- **Orden y wishlist:** nombre, descuento, precio ascendente o solo libros dentro/fuera de lista.
- **Precio:** todos, mas barato entre los resultados, en su minimo historico o por debajo de un limite.

"Mas barato" compara los precios dentro de la busqueda y estado seleccionados,
incluyendo empates. "En su minimo historico" compara cada libro con su propio
historial. Igualar el minimo no equivale a batir un nuevo record; la primera
observacion establece una referencia y no cuenta como nuevo record.

El reporte compartible dibuja sus graficas sin dependencias externas. El global
normal usa Chart.js y dispone de un renderizador local de respaldo si no carga.

## Telegram y automatizacion

Configura `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` para notificaciones del job.
El bot interactivo ofrece `/start`, `/listas`, `/ofertas` y `/reporte_global`.
Los mensajes extensos se dividen en varios envios conservando los bloques HTML.

Ejemplo de cron cada seis horas, ajustando la ruta:

```cron
0 */6 * * * cd /ruta/book-price-monitor && /usr/bin/env bash -lc 'source ~/.nvm/nvm.sh && nvm use && npm run run-job-headless' >> scraper.log 2>&1
```

El job y `build-reports` usan un bloqueo junto a SQLite. Si el proceso termina
abruptamente y deja un archivo `.job-lock`, verifica que ya no exista el proceso
indicado dentro del archivo antes de retirarlo.

## GitHub Pages

Despues del job o `build-reports`, revisa y versiona los cambios de `reports/`,
incluido `history.json`. El push a `master` publica los HTML versionados; Pages
prepara el menu y los recursos, pero no scrapea ni consulta tu base local.
En GitHub selecciona `Settings > Pages > Source: GitHub Actions`.

La tarjeta de cumpleanos sigue deshabilitada en `src/services/reportSite.mjs`.
No es necesario modificar HTML generados para habilitarla.

## Estructura y bitacora

- `src/services/wishlistSyncService.ts`: sincronizacion compartida y transaccion.
- `src/services/historyArchiveService.ts`: recuperacion y respaldo portable.
- `src/services/dealMetrics.ts`: reglas comunes de ofertas.
- `src/services/buildReportsService.ts`: generacion completa en carpeta temporal.
- `src/services/reportSite.mjs`: menu y recursos comunes a local y Pages.
- `drizzle/`: migraciones y metadatos versionados, aplicados tambien al abrir la base.
- `tests/`: pruebas aisladas; `tests/reports.browser.cjs` valida escritorio y movil.
- [Bitacora de auditoria](bitacora/2026-09-29-auditoria.md): hallazgos, resoluciones, commits y validaciones.
