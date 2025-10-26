// src/services/TournamentManager.ts
import { getDb, saveDatabase } from "../database/db";
import { logger } from "../utils/logger";
import { drawBracket } from "../utils/drawBracket";
import { AttachmentBuilder, EmbedBuilder, TextChannel } from "discord.js";
import { LobbyManager } from "./lobbyManager";

// ===== Типы строк таблицы =====
interface MatchRow {
  id: number;
  round: number;
  team1: string;
  team2: string;
  winner: string | null;
  lobby_id?: string | null;
}

// ===== Утилиты для sql.js =====
function getOne<T = any>(sql: string, params: any[] = []): T | undefined {
  const db = getDb();
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    if (!stmt.step()) return undefined;
    const obj = stmt.getAsObject() as any;
    return obj as T;
  } finally {
    stmt.free();
  }
}

function getAll<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  const rows: T[] = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      const obj = stmt.getAsObject() as any;
      rows.push(obj as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

function run(sql: string, params: any[] = []) {
  const db = getDb();
  db.run(sql, params);
}

export class TournamentManager {
  static async onMatchFinished(match: any, discordChannel?: TextChannel) {
    // 1) находим матч по lobby_id
    const raw = getOne<{ id: number; team1: string; team2: string; round: number }>(
      "SELECT id, team1, team2, round FROM matches WHERE lobby_id = ?",
      [match.lobby_id]
    );

    if (!raw) {
      logger.warn(`⚠️ Match not found for lobby ${match.lobby_id}`);
      return;
    }

    const res: MatchRow = {
      id: Number(raw.id),
      round: Number(raw.round),
      team1: String(raw.team1),
      team2: String(raw.team2),
      winner: null,
      lobby_id: match.lobby_id ?? null,
    };

    const winnerTeam = match.radiant_win ? res.team1 : res.team2;

    // 2) пишем победителя
    run("UPDATE matches SET winner = ? WHERE id = ?", [winnerTeam, res.id]);
    saveDatabase();
    logger.info(`✅ Match #${res.id} finished. Winner: ${winnerTeam}`);

    // 3) проверяем, все ли матчи раунда завершены
    const remainingRow = getOne<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM matches WHERE round = ? AND winner IS NULL",
      [res.round]
    );
    const remaining = Number(remainingRow?.cnt ?? 0);

    if (remaining > 0) {
      logger.info(`⌛ Waiting for ${remaining} matches in round ${res.round}`);
      return;
    }

    // 4) собираем победителей раунда
    const winnersRows = getAll<{ winner: string | null }>(
      "SELECT winner FROM matches WHERE round = ? ORDER BY id",
      [res.round]
    );
    const winners = winnersRows.map(r => r.winner).filter(Boolean) as string[];

    // если один — турнир окончен
    if (winners.length < 2) {
      logger.info("🏁 Турнир окончен! Победитель: " + winners[0]);
      if (discordChannel) {
        const embed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("🏆 Победитель турнира!")
          .setDescription(`🥇 **${winners[0]}** одерживает победу!`)
          .setTimestamp();
        await discordChannel.send({ embeds: [embed] });
      }
      return;
    }

    // 5) создаём следующий раунд
    const nextRound = res.round + 1;
    logger.info(`🌀 Starting round ${nextRound} with ${winners.length} teams`);

    for (let i = 0; i < winners.length; i += 2) {
      const team1 = winners[i];
      const team2 = winners[i + 1] ?? "BYE";
      run("INSERT INTO matches (round, team1, team2, winner) VALUES (?, ?, ?, ?)", [
        nextRound,
        team1,
        team2,
        null,
      ]);
    }
    saveDatabase();

    // 6) создаём лобби для матчей следующего раунда
    const nextMatches = getAll<MatchRow>(
      "SELECT id, round, team1, team2, winner, lobby_id FROM matches WHERE round = ? ORDER BY id",
      [nextRound]
    );

    for (const m of nextMatches) {
      const team2IsBye = String(m.team2) === "BYE";
      if (!team2IsBye) {
        logger.info(`🎯 Creating lobby for ${m.team1} vs ${m.team2}`);
        await LobbyManager.createLobby({
          region: 3,
          gameMode: 2,
          ownerId: "system",
          channelId: discordChannel?.id || "",
          matchId: m.id,
        });
      } else {
        run("UPDATE matches SET winner = ? WHERE id = ?", [m.team1, m.id]);
      }
    }
    saveDatabase();

    // 7) обновляем картинку сетки в Discord
    if (discordChannel) {
      const allMatches = getAll<MatchRow>(
        "SELECT id, round, team1, team2, winner, lobby_id FROM matches ORDER BY round, id"
      );

      const buffer = drawBracket(allMatches);
      const attachment = new AttachmentBuilder(buffer, { name: "bracket.png" });

      const embed = new EmbedBuilder()
        .setColor("#00b0f4")
        .setTitle(`📊 Турнир — Раунд ${nextRound}`)
        .setDescription("Обновлённая турнирная сетка")
        .setTimestamp();

      await discordChannel.send({ embeds: [embed], files: [attachment] });
    }
  }
}
