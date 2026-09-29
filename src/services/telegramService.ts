import '../config/loadEnv';
import { telegramSendMessage } from './telegramBotApi';

export async function sendTelegramMessage(input: { text: string }): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.warn('Telegram no esta configurado. Omitiendo envio.');
    return;
  }
  await telegramSendMessage({ chatId, text: input.text });
}
