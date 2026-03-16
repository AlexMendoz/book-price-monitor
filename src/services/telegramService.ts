import 'dotenv/config';

type SendTelegramMessageInput = {
  text: string;
};

export async function sendTelegramMessage(
  input: SendTelegramMessageInput
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram no está configurado. Omitiendo envío de mensaje.');
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: input.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error enviando mensaje a Telegram: ${response.status} ${body}`);
  }
}