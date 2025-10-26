import { Interaction } from "discord.js";
import { v4 as uuidv4 } from "uuid";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";
import { getTournamentPhase, TournamentPhase } from "../state/tournamentState";

export async function handleRegisterSubmit(interaction: Interaction) {
  if (!interaction.isModalSubmit() || interaction.customId !== "register_team_modal") return;

  if (getTournamentPhase() !== TournamentPhase.Registration) {
    await interaction.reply({ content: "⚠️ Регистрация закрыта!", ephemeral: true });
    return;
  }

  const db = getDb();

  // ✅ создаём таблицу заранее
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT,
      captain_id TEXT,
      players_json TEXT,
      avg_mmr INTEGER,
      eliminated INTEGER DEFAULT 0
    )
  `);

  // 🧱 (временно отключено ограничение "1 капитан = 1 команда")
  /*
  const check = db.exec("SELECT name FROM teams WHERE captain_id = ?", [interaction.user.id]);
  if (check.length && check[0].values.length > 0) {
    await interaction.reply({
      content: "⚠️ Вы уже зарегистрировали команду! Один капитан — одна заявка.",
      ephemeral: true,
    });
    return;
  }
  */

  // 🏷️ Читаем поля
  const teamName = interaction.fields.getTextInputValue("team_name");
  const player1 = interaction.fields.getTextInputValue("player_1");
  const player2 = interaction.fields.getTextInputValue("player_2");
  const player3 = interaction.fields.getTextInputValue("player_3");
  const playersExtra = interaction.fields.getTextInputValue("players_extra");

  const playerEntries = [player1, player2, player3, playersExtra]
    .filter(Boolean)
    .join(", ")
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, mmr] = entry.split("-").map((s) => s.trim());
      return { name, mmr: parseInt(mmr) || 0 };
    });

  const avgMMR =
    playerEntries.reduce((acc, p) => acc + p.mmr, 0) / playerEntries.length;

  // 💾 Запись в БД
  const stmt = db.prepare(`
    INSERT INTO teams (id, name, captain_id, players_json, avg_mmr)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run([
    uuidv4(),
    teamName,
    interaction.user.id,
    JSON.stringify(playerEntries),
    Math.round(avgMMR),
  ]);
  stmt.free();

  saveDatabase();

  await interaction.reply({
    content: `✅ Команда **${teamName}** зарегистрирована! Средний MMR: **${Math.round(avgMMR)}**`,
    ephemeral: true,
  });

  logger.info(`Team registered: ${teamName} (${avgMMR} avg MMR)`);
}
