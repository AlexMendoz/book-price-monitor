import '../config/loadEnv';
import fs from 'node:fs';
import path from 'node:path';

const token = process.env.TELEGRAM_BOT_TOKEN;

function getBaseUrl(): string {
  if (!token) {
    throw new Error('Falta TELEGRAM_BOT_TOKEN en .env');
  }

  return `https://api.telegram.org/bot${token}`;
}

export async function telegramGetUpdates(offset?: number) {
  const url = new URL(`${getBaseUrl()}/getUpdates`);

  if (offset !== undefined) {
    url.searchParams.set('offset', String(offset));
  }

  url.searchParams.set('timeout', '30');
  url.searchParams.set('allowed_updates', JSON.stringify(['message', 'callback_query']));

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Error en getUpdates: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function telegramSendMessage(input: {
  chatId: string | number;
  text: string;
  replyMarkup?: unknown;
}) {
  const chunks = splitTelegramMessage(input.text);
  let result;
  for (let index = 0; index < chunks.length; index++) {
    result = await sendMessageChunk({ ...input, text: chunks[index],
      replyMarkup: index === chunks.length - 1 ? input.replyMarkup : undefined });
  }
  return result;
}

export function splitTelegramMessage(text: string): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (line.length > 3500) throw new Error('Una linea del mensaje excede el limite seguro de Telegram.');
    if (current.length + line.length + 1 > 3500) { chunks.push(current); current = ''; }
    current += (current ? '\n' : '') + line;
  }
  if (current) chunks.push(current);
  return chunks;
}

async function sendMessageChunk(input: { chatId: string | number; text: string; replyMarkup?: unknown }) {
  const response = await fetch(`${getBaseUrl()}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: input.replyMarkup,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error en sendMessage: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function telegramAnswerCallbackQuery(input: {
  callbackQueryId: string;
  text?: string;
}) {
  const response = await fetch(`${getBaseUrl()}/answerCallbackQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callback_query_id: input.callbackQueryId,
      text: input.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error en answerCallbackQuery: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function telegramSendDocument(input: {
  chatId: string | number;
  filePath: string;
  caption?: string;
}) {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(input.filePath);

  formData.set('chat_id', String(input.chatId));
  formData.set(
    'document',
    new Blob([fileBuffer], { type: 'text/html' }),
    path.basename(input.filePath)
  );

  if (input.caption) {
    formData.set('caption', input.caption);
  }

  const response = await fetch(`${getBaseUrl()}/sendDocument`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error en sendDocument: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function telegramSetCommands() {
  const response = await fetch(`${getBaseUrl()}/setMyCommands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: 'Iniciar bot' },
        { command: 'listas', description: 'Ver tus wishlists' },
        { command: 'ofertas', description: 'Ver ofertas por wishlist' },
        { command: 'reporte_global', description: 'Recibir el HTML del reporte global' },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Error en setMyCommands: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function telegramDeleteWebhook(input?: {
  dropPendingUpdates?: boolean;
}) {
  const response = await fetch(`${getBaseUrl()}/deleteWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      drop_pending_updates: input?.dropPendingUpdates ?? false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error en deleteWebhook: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
