import { Message } from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";

export async function handleDeleteTeam(message: Message) {
  try {
    const db = getDb();

    // Проверяем, есть ли у пользователя команда
    const res = db.exec("SELECT * FROM teams WHERE captain_id = ?", [message.author.id]);
    if (!res.length || !res[0].values.length) {
      await message.reply("⚠️ У тебя нет команды для удаления.");
      return;
    }

    const row = res[0];
    const columns = row.columns;
    const values = row.values[0];
    const team = Object.fromEntries(columns.map((c, i) => [c, String(values[i] ?? "")]));

    // Удаляем команду
    db.run("DELETE FROM teams WHERE id = ?", [team.id]);
    saveDatabase();

    await message.reply(`🗑️ Команда **${team.name}** успешно удалена.`);
    logger.info(`🗑️ Team deleted: ${team.name} (captain ${message.author.tag})`);
  } catch (error) {
    logger.error("Error in handleDeleteTeam:", error);
    await message.reply("❌ Ошибка при удалении команды.");
  }
}
