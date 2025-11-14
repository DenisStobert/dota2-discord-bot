// src/services/SteamPoolService.ts
import { DotaClientService } from "./DotaClientService";
import { logger } from "../utils/logger";

export class SteamPoolService {
  private clients: DotaClientService[] = [];
  private busyClients: Set<DotaClientService> = new Set();
  private lastUsedIndex = -1; // 👈 добавили для round-robin

  async initPool() {
    const accountNames = (process.env.STEAM_ACCOUNTS || "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    if (accountNames.length === 0) {
      throw new Error("No STEAM_ACCOUNTS configured in .env");
    }

    logger.info(`🎮 Initializing Steam pool with ${accountNames.length} accounts...`);
  
    const connectPromises = accountNames.map(async (acc) => {
      const user = process.env[`${acc.toUpperCase()}_USERNAME`];
      const pass = process.env[`${acc.toUpperCase()}_PASSWORD`];

      if (!user || !pass) {
        logger.warn(`⚠️ Skipping ${acc}: missing username or password`);
        return null;
      }

      const client = new DotaClientService({
        credentials: { username: user, password: pass },
        attachTournamentHandler: false,
        accountTagOverride: acc,
      });

      try {
        await client.connect();
        logger.info(`✅ ${acc} connected to Steam and GC`);
        return client;
      } catch (err) {
        logger.error(`❌ Failed to connect ${acc}:`, err);
        return null;
      }
    });

    // 🚀 ждём все подключения параллельно
    const results = await Promise.all(connectPromises);
    this.clients = results.filter((c): c is DotaClientService => c !== null);
  
    logger.info(`✅ Steam pool ready (${this.clients.length} bots connected)`);
  }

  getFreeClient(): DotaClientService | null {
    if (this.clients.length === 0) return null;

    // 👇 пытаемся найти следующий готовый бот по кругу
    for (let i = 0; i < this.clients.length; i++) {
      this.lastUsedIndex = (this.lastUsedIndex + 1) % this.clients.length;
      const client = this.clients[this.lastUsedIndex];

      if (!this.busyClients.has(client) && client.isClientReady()) {
        this.busyClients.add(client);
        logger.info(`🤖 Selected bot: ${client["accountTag"]}`);
        return client;
      }
    }

    logger.warn("⚠️ No free bots available!");
    return null;
  }

  releaseClient(client: DotaClientService) {
    this.busyClients.delete(client);
  }

  getActiveCount() {
    return this.clients.length;
  }

  // 👇 Дополнительно: закрыть все лобби у всех клиентов
  async destroyAllLobbies() {
    logger.info(`🧹 Закрываем лобби у ${this.clients.length} Steam-ботов...`);
    for (const client of this.clients) {
      try {
        await client.destroyLobby();
      } catch (err) {
        logger.error(`❌ Ошибка при закрытии лобби у ${client["accountTag"]}:`, err);
      }
    }
  }
}

export const steamPool = new SteamPoolService();
