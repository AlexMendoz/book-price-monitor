import 'dotenv/config';

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
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Error en setMyCommands: ${response.status} ${await response.text()}`);
  }

  return response.json();
}