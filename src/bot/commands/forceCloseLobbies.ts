import { Message, TextChannel } from "discord.js";
import { steamPool } from "../../services/SteamPoolService";
import { logger } from "../../utils/logger";

export async function handleForceCloseLobbies(message: Message) {
  // 🔐 Только админы
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply("❌ Только администраторы могут использовать эту команду.");
  }

  const clients = (steamPool as any).clients || [];

  if (clients.length === 0) {
    return message.reply("⚠️ Нет активных Steam-клиентов для закрытия лобби.");
  }

  await message.reply(`🧹 Начинаю форс-закрытие лобби у ${clients.length} ботов...`);

  let closed = 0;
  for (const client of clients) {
    try {
      const current = client.getCurrentLobby?.();
      if (current) {
        logger.info(`🧹 [${client["accountTag"] || "unknown"}] Destroying lobby ${current.lobby_id}...`);
        await client.destroyLobby();
        closed++;
        await new Promise((r) => setTimeout(r, 1500)); // небольшая пауза между запросами
      } else {
        logger.info(`ℹ️ [${client["accountTag"] || "unknown"}] нет активного лобби.`);
      }
    } catch (err) {
      logger.warn(`⚠️ Ошибка при закрытии лобби у [${client["accountTag"]}]:`, err);
    }
  }

  const msg = `✅ Завершено: ${closed} лобби${closed === 1 ? "" : "й"} закрыто.`;
  logger.info(msg);

  if (message.channel && message.channel.isTextBased()) {
    await (message.channel as TextChannel).send(msg);
  }
}
