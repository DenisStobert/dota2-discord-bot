import { Message } from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger";

export async function handleCreateTeam(message: Message, args: string[]) {
  try {
    const db = getDb();
    const teamName = args.join(" ").trim();

    if (!teamName) {
      await message.reply("❌ Укажи название команды. Пример: `!create_team Gladiators`");
      return;
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT,
        captain_id TEXT,
        players_json TEXT
      )
    `);

    // Проверяем, есть ли команда с таким капитаном
    const result = db.exec("SELECT * FROM teams WHERE captain_id = ?", [message.author.id]);
    const existing = result.length > 0 && result[0].values.length > 0;
    
    if (existing) {
      await message.reply("⚠️ У тебя уже есть команда. Используй `!invite_player @ник`, чтобы пригласить участников.");
      return;
    }

    const teamId = uuidv4();
    const initialPlayers = [
      { discord_id: message.author.id, name: message.author.username }
    ];

    db.run(
      "INSERT INTO teams (id, name, captain_id, players_json) VALUES (?, ?, ?, ?)",
      [teamId, teamName, message.author.id, JSON.stringify(initialPlayers)]
    );

    saveDatabase();

    await message.reply(`✅ Команда **${teamName}** создана! Используй \`!invite_player @ник\`, чтобы пригласить игроков.`);
    logger.info(`🧱 Team created: ${teamName} (captain ${message.author.tag})`);
  } catch (error) {
    logger.error("Error in handleCreateTeam:", error);
    await message.reply("❌ Ошибка при создании команды.");
  }
}
