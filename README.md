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

* Node.js **22.x**
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

* Node.js **22+**
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

npm install
npm run playwright:install
```

En Linux:

```bash
npm run playwright:install-deps
```

---

## 📜 Scripts disponibles

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "scrape": "tsx src/scripts/runPriceCheck.ts",
    "bot": "tsx src/scripts/runTelegramBotPolling.ts",
    "check": "tsc --noEmit",
    "playwright:install": "playwright install",
    "playwright:install-deps": "playwright install-deps"
  }
}
```

---

## ▶️ Uso

### Ejecutar scraper

```bash
npm run scrape
```

### Ejecutar bot de Telegram

```bash
npm run bot
```

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm run build
npm run start
```

---

## 🔐 Variables de entorno

Crea un archivo `.env`:

```env
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
WISHLIST_URL=https://www.buscalibre.com.mx/v2/whilist.html
```

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
0 */6 * * * cd /ruta/a/book-price-monitor && /usr/bin/npm run scrape >> scraper.log 2>&1
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
