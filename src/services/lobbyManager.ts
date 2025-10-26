import { LobbyModel } from "../database/models";
import { generatePassword, getRegionName, getGameModeName } from "../utils/validation";
import { logger } from "../utils/logger";
import { getDb, saveDatabase } from "../database/db";
import { steamPool } from "./SteamPoolService";

export interface CreateLobbyRequest {
  region: number;
  gameMode: number;
  ownerId: string;
  channelId: string;
}

export interface LobbyInfo {
  id: string;
  password: string;
  region: number;
  gameMode: number;
  regionName: string;
  gameModeName: string;
  lobbyId?: string;
}

export class LobbyManager {
  static async createLobby(request: CreateLobbyRequest & { matchId?: number }): Promise<LobbyInfo | null> {
    const freeClient = steamPool.getFreeClient();
    if (!freeClient) {
      logger.error("❌ No free Steam clients available in pool!");
      return null;
    }

    try {
      const existingLobby = LobbyModel.findActiveByOwnerId(request.ownerId);
      if (existingLobby) {
        logger.warn(`User ${request.ownerId} already has an active lobby`);
        return null;
      }

      const password = generatePassword(8);
      const regionName = getRegionName(request.region);
      const gameModeName = getGameModeName(request.gameMode);

      if (!freeClient.isClientReady()) {
        logger.info(`[${freeClient}] Client not ready — reconnecting...`);
        await freeClient.connect();
      }

      logger.info(`🎯 Creating lobby for user ${request.ownerId} using ${freeClient["accountTag"]}...`);

      // 1️⃣ Создаём лобби через GC
      const gcLobby = await freeClient.createLobby({
        game_name: `Match #${request.matchId ?? "?"}`,
        pass_key: password,
        server_region: request.region,
        game_mode: request.gameMode,
        visibility: 1,
        fill_with_bots: false,
        allow_spectating: true,
      });

      logger.info(`✅ GC lobby created: ${gcLobby.lobby_id}`);

      // 3️⃣ Сохраняем в БД
      const dbLobby = LobbyModel.create({
        lobby_id: gcLobby.lobby_id,
        pass_key: gcLobby.pass_key,
        password,
        region: request.region,
        game_mode: request.gameMode,
        owner_id: request.ownerId,
        channel_id: request.channelId,
      });

      if (request.matchId) {
        const db = getDb();
        db.run("UPDATE matches SET lobby_id = ? WHERE id = ?", [gcLobby.lobby_id, request.matchId]);
        saveDatabase();
      }

      return {
        id: dbLobby.id,
        password,
        region: request.region,
        gameMode: request.gameMode,
        regionName,
        gameModeName,
        lobbyId: gcLobby.lobby_id,
      };
    } catch (error) {
      logger.error("❌ Error creating lobby", error);
      return null;
    } finally {
      steamPool.releaseClient(freeClient);
    }
  }

  static closeLobby(ownerId: string): boolean {
    try {
      const lobby = LobbyModel.findActiveByOwnerId(ownerId);
      if (!lobby) {
        logger.warn(`No active lobby found for user ${ownerId}`);
        return false;
      }

      LobbyModel.updateStatus(lobby.id, "closed");
      logger.info(`Lobby ${lobby.id} closed by user ${ownerId}`);
      return true;
    } catch (error) {
      logger.error("Error in closeLobby", error);
      return false;
    }
  }
}
