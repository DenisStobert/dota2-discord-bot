// testDestroy.ts
import { steamPool } from "./services/SteamPoolService";
import { logger } from "./utils/logger";

(async () => {
  try {
    logger.info("🧹 Force-destroy: инициализируем пул...");
    await steamPool.initPool(); // подключаем всех ботов

    const clients = (steamPool as any).clients || [];
    if (!clients.length) {
      logger.warn("⚠️ Нет активных Steam-клиентов!");
      return;
    }

    for (const c of clients) {
      const lobby = c.getCurrentLobby?.();
      if (lobby) {
        logger.info(`💣 Уничтожаем лобби у [${c["accountTag"]}] (${lobby.lobby_id})...`);
        await c.destroyLobby();
      } else {
        logger.info(`ℹ️ У [${c["accountTag"]}] нет активного лобби.`);
      }
    }

    logger.info("✅ Все доступные лобби уничтожены.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Ошибка:", err);
    process.exit(1);
  }
})();
