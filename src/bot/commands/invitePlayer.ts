import { Message } from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";

export async function handleInvitePlayer(message: Message) {
  try {
    const db = getDb();

    // Проверяем команду капитана
    const res = db.exec("SELECT * FROM teams WHERE captain_id = ?", [message.author.id]);
    if (res.length === 0 || res[0].values.length === 0) {
      await message.reply("❌ У тебя нет команды. Создай её командой `!create_team <название>`.");
      return;
    }

    const row = res[0];
    const columns = row.columns;
    const values = row.values[0]; // первая строка
    const team: Record<string, any> = Object.fromEntries(
      columns.map((col, i) => [col, values[i]])
    );

    const mention = message.mentions.users.first();
    if (!mention) {
      await message.reply("⚠️ Укажи игрока для приглашения. Пример: `!invite_player @nickname`");
      return;
    }

    const players = JSON.parse(team.players_json || "[]");
    if (players.some((p: any) => p.discord_id === mention.id)) {
      await message.reply("⚠️ Этот игрок уже в твоей команде.");
      return;
    }

    players.push({ discord_id: mention.id, name: mention.username });
    db.run("UPDATE teams SET players_json = ? WHERE id = ?", [JSON.stringify(players), team.id]);
    saveDatabase();

    await message.reply(`✅ Игрок **${mention.username}** добавлен в команду **${team.name}**.`);
    logger.info(`👥 Player ${mention.tag} invited to team ${team.name}`);

    try {
      await mention.send(`📨 Вас пригласили в команду **${team.name}** (капитан: ${message.author.username})!`);
    } catch {
      logger.warn(`Не удалось отправить DM ${mention.tag}`);
    }
  } catch (error) {
    logger.error("Error in handleInvitePlayer:", error);
    await message.reply("❌ Ошибка при приглашении игрока.");
  }
}
