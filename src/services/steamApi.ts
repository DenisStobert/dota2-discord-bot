import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

const STEAM_API_BASE = 'https://api.steampowered.com';
const OPENDOTA_API_BASE = 'https://api.opendota.com/api';

export interface LobbyInstructions {
  region: string;
  gameMode: string;
  password: string;
  instructions: string[];
}

export interface MatchDetails {
  match_id: string;
  radiant_win: boolean;
  duration: number;
  radiant_team: string[];
  dire_team: string[];
  players: any[];
}

export class SteamApiService {
  /**
   * Генерация инструкций для создания лобби вручную
   */
  static generateLobbyInstructions(region: string, gameMode: string, password: string): LobbyInstructions {
    const instructions = [
      '1. Откройте Dota 2',
      '2. Нажмите "PLAY DOTA" → "Create Lobby"',
      `3. Настройки лобби:`,
      `   • Region: ${region}`,
      `   • Game Mode: ${gameMode}`,
      `   • Lobby Password: ${password}`,
      '4. Нажмите "Create Lobby"',
      '5. Пригласите игроков или дайте им пароль',
      '6. После матча используйте команду !report_match <match_id>',
    ];

    return {
      region,
      gameMode,
      password,
      instructions,
    };
  }

  /**
   * Получение информации о матче через OpenDota API
   */
  static async getMatchDetails(matchId: string): Promise<MatchDetails | null> {
    try {
      // Попробуем сначала OpenDota (бесплатно, без ключа)
      const response = await axios.get(`${OPENDOTA_API_BASE}/matches/${matchId}`, {
        timeout: 10000,
      });

      if (response.data && response.data.match_id) {
        return {
          match_id: response.data.match_id.toString(),
          radiant_win: response.data.radiant_win,
          duration: response.data.duration,
          radiant_team: response.data.players
            .filter((p: any) => p.player_slot < 128)
            .map((p: any) => p.personaname || 'Unknown'),
          dire_team: response.data.players
            .filter((p: any) => p.player_slot >= 128)
            .map((p: any) => p.personaname || 'Unknown'),
          players: response.data.players,
        };
      }

      // Если OpenDota не нашёл, попробуем Steam API
      if (config.steam.apiKey) {
        const steamResponse = await axios.get(
          `${STEAM_API_BASE}/IDOTA2Match_570/GetMatchDetails/v1/`,
          {
            params: {
              key: config.steam.apiKey,
              match_id: matchId,
            },
            timeout: 10000,
          }
        );

        if (steamResponse.data?.result) {
          const result = steamResponse.data.result;
          return {
            match_id: result.match_id.toString(),
            radiant_win: result.radiant_win,
            duration: result.duration,
            radiant_team: result.players
              .filter((p: any) => p.player_slot < 128)
              .map((p: any) => p.persona || 'Unknown'),
            dire_team: result.players
              .filter((p: any) => p.player_slot >= 128)
              .map((p: any) => p.persona || 'Unknown'),
            players: result.players,
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch match details', error);
      return null;
    }
  }

  /**
   * Проверка существования матча
   */
  static async matchExists(matchId: string): Promise<boolean> {
    try {
      const match = await this.getMatchDetails(matchId);
      return match !== null;
    } catch (error) {
      return false;
    }
  }
}