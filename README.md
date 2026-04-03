# Book Price Monitor

Monitor personal de precios de libros en Buscalibre con almacenamiento historico en SQLite y alertas por Telegram.

## Descripcion

El proyecto scrapea una o varias wishlists de Buscalibre, guarda snapshots de precios, calcula ranking de ofertas y permite consultar resultados por bot de Telegram.

Flujo principal:

1. Lee wishlists configuradas en `src/config/wishlists.ts`.
2. Extrae libros y precios con Playwright.
3. Hace upsert de libros/listas y guarda snapshot de precios.
4. Calcula indicadores de oferta (minimo historico, bajada vs anterior, descuento alto, posibles descuentos sospechosos).
5. Publica resultados por Telegram (job automatico o bot interactivo).

## Stack

- Node.js 20.x
- TypeScript
- Playwright
- SQLite (`better-sqlite3`)
- Drizzle ORM / Drizzle Kit
- Telegram Bot API (HTTP)

## Estructura

```text
src/
  config/
    wishlists.ts
  db/
    client.ts
    schema.ts
  scraper/
    wishlistScraper.ts
  services/
    bookService.ts
    wishlistService.ts
    priceSnapshotService.ts
    rankingService.ts
    telegramService.ts
    telegramBotApi.ts
    telegramCommandsService.ts
  scripts/
    runScheduledJob.ts
    runTelegramBotPolling.ts
    listBooks.ts
    generateBookChart.ts
    generateAllBooksChart.ts
    generateShareableAllBooksChart.ts
    rankDeals.ts
    generateDealsRankingHtml.ts
    sendDealsTelegram.ts
  index.ts
```

## Base de datos

La base se crea en `./data/prices.db` por defecto (o en `DATABASE_URL` si se define).

Tablas principales:

- `wishlists`
- `books`
- `wishlist_books`
- `price_snapshots`

Migraciones:

- SQL generado en `drizzle/`
- Config en `drizzle.config.ts`

## Instalacion

```bash
nvm use
npm install
```

Instalar navegadores de Playwright:

```bash
npx playwright install
```

En Linux, si hace falta:

```bash
npx playwright install-deps
```

## Configuracion

1. Crea `.env` basado en `.env.example`.
2. Define estas variables:

```env
DATABASE_URL=./data/prices.db
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
SCRAPER_HEADLESS=true
SCRAPER_ALLOW_MANUAL_VERIFICATION=false
SCRAPER_WAIT_AFTER_LOAD_MS=3000
```

Notas:

- `WISHLIST_URL` aparece en `.env.example`, pero el flujo actual usa `src/config/wishlists.ts`.
- Puedes configurar multiples listas en `src/config/wishlists.ts`.
- `SCRAPER_ALLOW_MANUAL_VERIFICATION=false` evita que `run-job` espere `ENTER` cuando aparece una validacion humana.

## Scripts NPM

```json
{
  "dev": "tsx src/index.ts",
  "generate": "drizzle-kit generate",
  "migrate": "drizzle-kit migrate",
  "list-books": "tsx src/scripts/listBooks.ts",
  "chart": "tsx src/scripts/generateBookChart.ts",
  "chart-all": "tsx src/scripts/generateAllBooksChart.ts",
  "chart-all-shareable": "tsx src/scripts/generateShareableAllBooksChart.ts",
  "rank-deals": "tsx src/scripts/rankDeals.ts",
  "rank-deals-html": "tsx src/scripts/generateDealsRankingHtml.ts",
  "send-telegram": "tsx src/scripts/sendDealsTelegram.ts",
  "run-job-manual": "SCRAPER_HEADLESS=false SCRAPER_ALLOW_MANUAL_VERIFICATION=true tsx src/scripts/runScheduledJob.ts",
  "run-job-headless": "SCRAPER_HEADLESS=true SCRAPER_ALLOW_MANUAL_VERIFICATION=false tsx src/scripts/runScheduledJob.ts",
  "run-job": "tsx src/scripts/runScheduledJob.ts",
  "telegram-bot": "tsx src/scripts/runTelegramBotPolling.ts"
}
```

Uso recomendado:

- `npm run run-job-headless`: scrapeo + ranking por wishlist + envio a Telegram sin UI.
- `npm run run-job-manual`: scrapeo con navegador para resolver validaciones manuales.
- `npm run telegram-bot`: bot interactivo (`/start`, `/listas`, `/ofertas`, `/reporte_global`).
- `npm run chart -- <bookId>`: generar HTML con historial de un libro.

## Bot de Telegram

El bot hace polling por `getUpdates` y ofrece:

- Seleccion de wishlist.
- Vistas por categoria:
  - Top ofertas
  - Minimos historicos
  - Sospechosos
  - Descuento alto
  - Precios historicos por libro (lista por wishlist + detalle por seleccion)
- Envio de reporte global HTML compartible.

Comandos registrados:

- `/start`
- `/listas`
- `/ofertas`
- `/reporte_global`

Si el bot no responde al correr `npm run telegram-bot`, revisa:

- `TELEGRAM_BOT_TOKEN` valido en `.env`.
- Que no haya webhook activo previo. El script de polling ejecuta `deleteWebhook` al iniciar para evitar conflicto `409 Conflict`.

## Automatizacion (cron)

Ejemplo para correr el job cada 6 horas:

```bash
0 */6 * * * cd /ruta/a/book-price-monitor && /usr/bin/env bash -lc 'source ~/.nvm/nvm.sh && nvm use && npm run run-job' >> scraper.log 2>&1
```

## Estado actual

El nucleo scraper + base + bot por wishlist esta funcionando y alineado.

Hay scripts de ranking global (`rank-deals`, `rank-deals-html`, `send-telegram`) que dependen de una funcion `getDealRanking` que no existe en el servicio actual (`rankingService` exporta `getDealRankingByWishlist`). Se recomienda ajustarlos o usar `run-job`/`telegram-bot` mientras tanto.
