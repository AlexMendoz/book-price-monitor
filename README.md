# 📚 Book Price Monitor

Sistema de monitoreo de precios de libros en Buscalibre con alertas automáticas vía Telegram.

---

## 🚀 Descripción

Este proyecto es un **web scraper** desarrollado con **TypeScript + Playwright** que permite monitorear precios de libros desde una wishlist de Buscalibre.

### Objetivo principal

* Extraer libros desde una wishlist
* Consultar precios periódicamente
* Detectar cambios y ofertas
* Guardar historial de precios
* Enviar alertas vía Telegram

---

## 🧠 Arquitectura

```text
Playwright Scraper
        ↓
Extracción de wishlist
        ↓
Scraping de productos
        ↓
Persistencia de datos
        ↓
Comparación de precios
        ↓
Alertas (Telegram)
```

---

## 🛠️ Stack tecnológico

* Node.js **20.x**
* TypeScript **5.8.3**
* Playwright **1.51.1**
* dotenv **16.4.7**
* tsx **4.19.3**
* @types/node **22.13.14**

---

## 📦 Dependencias

### Producción

```json
{
  "dotenv": "16.4.7",
  "playwright": "1.51.1"
}
```

### Desarrollo

```json
{
  "@types/node": "22.13.14",
  "tsx": "4.19.3",
  "typescript": "5.8.3"
}
```

---

## 📁 Estructura del proyecto

```bash
src/
│
├── index.ts
│
├── scraper/
│   ├── wishlist.ts
│   └── product.ts
│
├── services/
│   ├── telegramBotApi.ts
│   └── telegramCommandsService.ts
│
├── scripts/
│   ├── runTelegramBotPolling.ts
│   └── runPriceCheck.ts
│
├── utils/
│   └── logger.ts
```

---

## ⚙️ Requisitos

* Node.js **20.x**
* npm **10+**

```bash
node -v
npm -v
```

---

## 📥 Instalación

```bash
git clone <repo-url>
cd book-price-monitor

nvm use
npm install
```

Si no usas `nvm`, instala Node 20.x manualmente antes de ejecutar `npm install`.

---

## 📜 Scripts disponibles

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
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
}
```

---

## ▶️ Uso

### Desarrollo

```bash
npm run dev
```

### Job programado no interactivo

```bash
npm run run-job-headless
```

### Job manual con navegador

```bash
npm run run-job-manual
```

### Bot de Telegram

```bash
npm run telegram-bot
```

---

## 🔐 Variables de entorno

Crea un archivo `.env`:

```env
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
DATABASE_URL=./data/prices.db
SCRAPER_HEADLESS=true
SCRAPER_ALLOW_MANUAL_VERIFICATION=false
SCRAPER_WAIT_AFTER_LOAD_MS=3000
```

`SCRAPER_ALLOW_MANUAL_VERIFICATION=false` evita que `run-job` espere `ENTER` cuando aparece una validación humana.

---

## 🤖 Telegram Bot

El bot permite:

* Consultar precios
* Ejecutar scraping manual
* Recibir alertas
* Usar botones interactivos

⚠️ Importante:

Debes responder los `callback_query` inmediatamente:

```ts
await telegramAnswerCallbackQuery(callbackQuery.id);
```

Error común:

```text
Bad Request: query is too old and response timeout expired
```

---

## 📊 Funcionalidad

### ✔ Extracción

* Wishlist pública
* Links de productos

### ✔ Monitoreo

* Precio actual
* Precio anterior
* Descuentos

### ✔ Análisis

* Cambios de precio
* Ofertas detectadas
* Histórico

### ✔ Alertas

* Telegram automático
* Acciones manuales

---

## ⏱️ Automatización (cron)

Ejecutar cada 6 horas:

```bash
0 */6 * * * cd /ruta/a/book-price-monitor && /usr/bin/env bash -lc 'source ~/.nvm/nvm.sh && nvm use && npm run run-job' >> scraper.log 2>&1
```

---

## ⚠️ Consideraciones

* Uso educativo
* Respetar términos del sitio
* Evitar scraping excesivo

---

## 🚧 Roadmap

* [ ] Base de datos (SQLite / PostgreSQL)
* [ ] Dashboard web
* [ ] Múltiples wishlists
* [ ] Alertas avanzadas
* [ ] Docker
* [ ] Retry strategy
* [ ] Logging estructurado

---

## 🧑‍💻 Autor



---

## 📝 Licencia

MIT
