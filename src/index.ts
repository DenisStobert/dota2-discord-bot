import { discordBot } from './bot/instance';
import { steamPool } from './services/SteamPoolService';
import { initDatabase, closeDatabase } from './database/db';
import { logger } from './utils/logger';
import { startAuthServer } from "./web/auth-server";

async function main() {
  try {
    logger.info('🚀 Starting Dota 2 Lobby Bot...');

    await initDatabase();

    // ✅ Инициализация пула Steam-ботов
    logger.info('🔌 Connecting Steam accounts...');
    await steamPool.initPool();
    logger.info(`✅ Steam pool initialized (${steamPool.getActiveCount()} bots)`);

    // 🤖 Запуск Discord бота
    await discordBot.start();

    await startAuthServer();

    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      await discordBot.stop();
      closeDatabase();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    logger.info('✅ Bot is now running with Steam pool!');
  } catch (error) {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

main();
