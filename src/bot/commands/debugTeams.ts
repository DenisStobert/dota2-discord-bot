import { Message } from "discord.js";
import { getDb } from "../../database/db";

export async function handleDebugTeams(message: Message) {
  const db = getDb();
  const result = db.exec("SELECT * FROM teams");

  if (result.length === 0) {
    await message.reply("📭 Таблица teams пуста.");
    return;
  }

  const { columns, values } = result[0];
  const output = values
    .map((row) =>
      Object.fromEntries(columns.map((c, i) => [c, row[i]]))
    )
    .map(
      (team) =>
        `🧱 ${team.name} — captain_id: ${team.captain_id}, players_json: ${team.players_json}`
    )
    .join("\n");

  await message.reply("📋 Команды в БД:\n" + output);
}
