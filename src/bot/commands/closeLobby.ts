// src/bot/commands/closeLobby.ts
import { Message } from "discord.js";
import { LobbyManager } from "../../services/lobbyManager";
import { logger } from "../../utils/logger";

export async function handleCloseLobby(message: Message) {
  try {
    const success = LobbyManager.closeLobby(message.author.id);

    if (success) {
      await message.reply("🧹 Ваше лобби было успешно закрыто!");
      logger.info(`Lobby closed by ${message.author.tag} (${message.author.id})`);
    } else {
      await message.reply("❌ У вас нет активного лобби для закрытия.");
    }
  } catch (error) {
    logger.error("Error in handleCloseLobby", error);
    await message.reply("❌ Произошла ошибка при закрытии лобби.");
  }
}