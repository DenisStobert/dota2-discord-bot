import { Message } from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";

export async function handleResetTeam(message: Message) {
  const db = getDb();

  db.run("DELETE FROM teams WHERE captain_id = ?", [message.author.id]);
  saveDatabase();

  logger.warn(`🗑️ ${message.author.tag} удалил все свои команды`);
  await message.reply("✅ Все твои команды были удалены. Теперь можно создать новую!");
}
