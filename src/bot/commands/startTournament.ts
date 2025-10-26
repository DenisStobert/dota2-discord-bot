import {
  Message,
  TextChannel,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { drawBracket } from "../../utils/drawBracket";
import { logger } from "../../utils/logger";
import { getTournamentPhase, setTournamentPhase, TournamentPhase } from "../state/tournamentState";
import { steamPool } from "../../services/SteamPoolService";

export async function handleStartTournament(message: Message) {
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply("❌ Только администраторы могут запускать турнир.");
  }

  const phase = getTournamentPhase();
  if (phase === TournamentPhase.Running)
    return message.reply("⚠️ Турнир уже запущен!");
  if (phase === TournamentPhase.Registration)
    return message.reply("⚠️ Сначала закрой регистрацию перед стартом турнира.");

  setTournamentPhase(TournamentPhase.Running);

  const db = getDb();
  const result = db.exec("SELECT id, name, avg_mmr, captain_id FROM teams ORDER BY avg_mmr DESC");
  if (!result.length || !result[0].values.length) {
    setTournamentPhase(TournamentPhase.Idle);
    await message.reply("❌ Нет зарегистрированных команд для старта турнира.");
    return;
  }

  const teams = result[0].values.map(([id, name, avg_mmr, captain_id]) => ({
    id: String(id ?? ""),
    name: String(name ?? "Unknown"),
    avg_mmr: Number(avg_mmr ?? 0),
    captain_id: String(captain_id ?? ""),
  }));

  const shuffled = teams.sort(() => Math.random() - 0.5);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round INTEGER,
      team1 TEXT,
      team2 TEXT,
      winner TEXT,
      lobby_id TEXT,
      team1_captain TEXT,
      team2_captain TEXT
    )
  `);

  // 🎮 Создаём пары
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const t1 = shuffled[i];
    const t2 = shuffled[i + 1];
    matches.push([1, t1.name, t2 ? t2.name : "BYE", null, null, t1.captain_id, t2 ? t2.captain_id : null]);
    db.run(
      "INSERT INTO matches (round, team1, team2, winner, lobby_id, team1_captain, team2_captain) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, t1.name, t2 ? t2.name : "BYE", null, null, t1.captain_id, t2 ? t2.captain_id : null]
    );
  }
  saveDatabase();

  // ==========================
  // ⚙️ Создание лобби через пул
  // ==========================
  const matchRows = db.exec("SELECT id, team1, team2, team1_captain, team2_captain FROM matches WHERE round = 1")[0].values;

  for (const [matchId, team1, team2, cap1, cap2] of matchRows) {
    if (team2 === "BYE") continue;

    const freeClient = steamPool.getFreeClient();
    if (!freeClient) {
      logger.warn(`⚠️ Нет свободных Steam-клиентов для матча #${matchId}`);
      continue;
    }

    try {
      const pass = `cup${Math.floor(1000 + Math.random() * 9000)}`;
      logger.info(`🎯 Создаём лобби для ${team1} vs ${team2}`);

      // ✅ создаём лобби без добавления ботов
      const lobby = await freeClient.createLobby({
        game_name: `${team1} vs ${team2}`,
        pass_key: pass,
        server_region: 3,
        game_mode: 2,
      });

      // 💾 сохраняем лобби в БД
      db.run("UPDATE matches SET lobby_id = ? WHERE id = ?", [lobby.lobby_id, matchId]);
      saveDatabase();

      // 📩 отправляем капитанам личные сообщения
      for (const rawCap of [cap1, cap2]) {
        const cap = String(rawCap || "").trim();
        if (!cap) continue;

        try {
          const user = await message.client.users.fetch(cap as string);
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor("#00b0f4")
                .setTitle(`🎮 ${team1} vs ${team2}`)
                .setDescription(
                  `**Lobby ID:** ${lobby.lobby_id}\n**Пароль:** \`${pass}\`\n🌍 Регион: Europe West (3)\n🎯 Режим: Captains Mode`
                )
                .setFooter({ text: "Dota 2 Tournament" })
                .setTimestamp(),
            ],
          });
          logger.info(`📨 Отправлены данные лобби капитану ${cap}`);
        } catch (err) {
          logger.warn(`⚠️ Не удалось отправить DM капитану ${cap}:`, err);
        }
      }
    } catch (err) {
      logger.error(`❌ Ошибка при создании лобби для ${team1} vs ${team2}`, err);
    } finally {
      steamPool.releaseClient(freeClient);
    }
  }

  // ==========================
  // 🖼️ Отправляем embed-сетку
  // ==========================
  const allRows = db.exec(
    "SELECT id, round, team1, team2, winner, lobby_id FROM matches ORDER BY id"
  );
  
  const rows = allRows[0]?.values || [];
  
  const buffer = drawBracket(
    rows.map(([id, round, team1, team2, winner, lobby_id]) => ({
      id: Number(id ?? 0),
      round: Number(round ?? 0),
      team1: String(team1 ?? ""),
      team2: String(team2 ?? ""),
      winner: winner ? String(winner) : "",
      lobby_id: lobby_id ? String(lobby_id) : "",
    }))
  );

  const attachment = new AttachmentBuilder(buffer, { name: "bracket.png" });

  const embed = new EmbedBuilder()
    .setColor("#00b0f4")
    .setTitle("🏆 Турнир стартовал!")
    .setDescription("Капитаны получили в личку данные своих лобби.")
    .setFooter({ text: "Раунд 1" })
    .setTimestamp();

  await (message.channel as TextChannel).send({
    embeds: [embed],
    files: [attachment],
  });

  logger.info("✅ Турнир стартовал — лобби созданы, капитаны уведомлены.");
}
