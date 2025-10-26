import { Message } from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";

export async function handleDeleteTeam(message: Message, args: string[]) {
  const teamName = args.join(" ").trim();
  if (!teamName) {
    await message.reply("⚠️ Укажите название команды: `!delete_team <название>`");
    return;
  }

  const db = getDb();
  const stmt = db.prepare("DELETE FROM teams WHERE name = ?");
  stmt.run([teamName]);
  stmt.free();

  saveDatabase();

  await message.reply(`🗑️ Команда **${teamName}** удалена.`);
  logger.info(`Team deleted: ${teamName}`);
}
