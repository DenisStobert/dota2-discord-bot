import { Message, TextChannel } from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";
import { getTournamentPhase, setTournamentPhase, TournamentPhase } from "../state/tournamentState";
import { steamPool } from "../../services/SteamPoolService";

export async function handleCloseTournament(message: Message) {
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply("❌ Только администраторы могут закрыть турнир.");
  }

  const phase = getTournamentPhase();

  if (phase !== TournamentPhase.Running) {
    return message.reply("⚠️ Сейчас нет активного турнира, который можно закрыть.");
  }

  const db = getDb();

  try {
    // 🧹 1. Завершаем все активные лобби у ботов
    const clients = (steamPool as any).clients || [];
    if (clients.length > 0) {
      logger.info(`🧹 Закрываем лобби у ${clients.length} Steam-ботов...`);
      for (const client of clients) {
        try {
          const current = client.getCurrentLobby?.();
          if (current) {
            logger.info(`🧹 [${client["accountTag"]}] Destroying lobby ${current.lobby_id}...`);
            await client.destroyLobby();
            await new Promise((r) => setTimeout(r, 2000));
          }
        } catch (err) {
          logger.warn(`⚠️ Не удалось закрыть лобби у [${client["accountTag"]}]:`, err);
        }
      }
    }

    // 💾 2. Удаляем данные турнира из базы
    db.run("DELETE FROM matches");
    db.run("DELETE FROM teams");
    saveDatabase();

    // 🔁 3. Сбрасываем фазу
    setTournamentPhase(TournamentPhase.Idle);

    // 💬 4. Сообщаем в канал
    if (message.channel && message.channel.isTextBased()) {
      await (message.channel as TextChannel).send({
        content: "🏁 Турнир завершён! Все данные и лобби очищены, можно начинать новый турнир.",
      });
    }

    logger.info("✅ Tournament closed — data cleared and all lobbies destroyed.");
  } catch (err) {
    logger.error("❌ Ошибка при закрытии турнира:", err);
    await message.reply("❌ Произошла ошибка при завершении турнира. Проверь логи.");
  }
}
