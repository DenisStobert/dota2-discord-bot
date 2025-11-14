import { ButtonInteraction } from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";

export async function handleConfirmTeamRegistration(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith("confirm_team_")) return;

  const teamId = interaction.customId.replace("confirm_team_", "");
  const db = getDb();

  const res = db.exec("SELECT * FROM teams WHERE id = ?", [teamId]);
  if (!res.length || !res[0].values.length) {
    await interaction.reply({ content: "❌ Команда не найдена.", ephemeral: true });
    return;
  }

  // создаём таблицу, если нет
  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id TEXT,
      captain_id TEXT,
      created_at TEXT
    )
  `);

  // Проверяем, не зарегистрирована ли команда
  const check = db.exec("SELECT * FROM registrations WHERE team_id = ?", [teamId]);
  if (check.length && check[0].values.length > 0) {
    await interaction.reply({ content: "⚠️ Эта команда уже зарегистрирована.", ephemeral: true });
    return;
  }

  const row = res[0];
  const columns = row.columns;
  const values = row.values[0];
  const team = Object.fromEntries(columns.map((c, i) => [c, String(values[i] ?? "")]));

  db.run("INSERT INTO registrations (team_id, captain_id, created_at) VALUES (?, ?, ?)", [
    teamId,
    team.captain_id,
    new Date().toISOString(),
  ]);
  saveDatabase();

  // Отключаем кнопки после подтверждения
  await interaction.update({
    content: `🎉 Команда **${team.name}** успешно зарегистрирована на турнир!`,
    embeds: [],
    components: [],
  });

  logger.info(`✅ Team registered for tournament: ${team.name}`);
}
