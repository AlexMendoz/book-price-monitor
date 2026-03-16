import 'dotenv/config';
import { telegramGetUpdates, telegramSetCommands } from '../services/telegramBotApi';
import {
  handleTelegramCallbackQuery,
  handleTelegramMessage,
} from '../services/telegramCommandsService';

async function main() {
  await telegramSetCommands();
  console.log('Comandos configurados.');

  let offset: number | undefined = undefined;

  while (true) {
    try {
      const response = await telegramGetUpdates(offset);
      const updates = response.result ?? [];

      for (const update of updates) {
        offset = update.update_id + 1;

        if (update.message) {
          await handleTelegramMessage(update.message);
        }

        if (update.callback_query) {
          await handleTelegramCallbackQuery(update.callback_query);
        }
      }
    } catch (error) {
      console.error('Error en polling de Telegram:', error);
      await delay(3000);
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error('Error fatal en bot Telegram:', error);
  process.exit(1);
});