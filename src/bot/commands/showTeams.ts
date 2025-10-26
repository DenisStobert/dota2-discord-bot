import { Message } from "discord.js";
import { getDb } from "../../database/db";

export async function handleShowTeams(message: Message) {
  const db = getDb();

  const result = db.exec("SELECT name, avg_mmr, eliminated FROM teams ORDER BY name ASC");

  if (!result.length || !result[0].values.length) {
    await message.reply("❌ Пока нет зарегистрированных команд.");
    return;
  }

  // Преобразуем строки в массив объектов
  const rows = result[0].values.map((row) => {
    const [name, avg_mmr, eliminated] = row;
    return { name, avg_mmr, eliminated };
  });

  const list = rows
    .map(
      (t, i) =>
        `**${i + 1}. ${t.name}** (${t.avg_mmr}) — ${
          Number(t.eliminated) ? "❌ выбыла" : "🟢 активна"
        }`
    )
    .join("\n");

  await message.reply(`**📋 Зарегистрированные команды:**\n${list}\n\nВсего: **${rows.length}**`);
}
