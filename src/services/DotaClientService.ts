// src/services/DotaClientService.ts
import SteamUser from "steam-user";
import Dota2 from "dota2-fork";
import { logger } from "../utils/logger";
import { TournamentManager } from "./TournamentManager";
import { discordBot } from "../bot/instance";
import { TextChannel } from "discord.js";
import { config } from "../config";

export interface CreateLobbyOptions {
  game_name: string;
  pass_key: string;
  server_region: number;
  game_mode: number;
  dota_tv_delay?: number;
  visibility?: number;
  fill_with_bots?: boolean;
  allow_spectating?: boolean;
}

export interface LobbyDetails {
  lobby_id: string;
  pass_key: string;
  members?: any[];
  coinFlipped?: boolean;
}

interface SteamCredentials {
  username: string;
  password: string;
  guardCode?: string;
}

interface DotaClientOptions {
  credentials?: SteamCredentials;               // если не передать — возьмём из config.steam
  attachTournamentHandler?: boolean;            // можно отключить автосабскрайб на matchDetailsData
  accountTagOverride?: string;                  // метка для логов
}

export class DotaClientService {
  private steamClient: SteamUser;
  private dotaClient: import("dota2-fork").Dota2Client;
  private isReady = false;
  private currentLobby: LobbyDetails | null = null;
  private lastLobbySnapshot: any | null = null;
  private coinAlreadyHandled = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  private credentials: SteamCredentials;
  private accountTag: string;
  private attachTournamentHandler: boolean;

  constructor(opts: DotaClientOptions = {}) {
    // подхватываем креды: либо из opts, либо из config.steam
    const cfgUser = config.steam.username;
    const cfgPass = config.steam.password;
    if (!opts.credentials && (!cfgUser || !cfgPass)) {
      throw new Error("Steam credentials are missing (pass via constructor or config.steam)");
    }

    this.credentials = opts.credentials ?? {
      username: cfgUser as string,
      password: cfgPass as string,
      guardCode: config.steam.guardCode,
    };

    this.accountTag = opts.accountTagOverride ?? this.credentials.username;
    this.attachTournamentHandler = opts.attachTournamentHandler ?? true;

    this.steamClient = new SteamUser();
    this.dotaClient = new Dota2.Dota2Client(this.steamClient, false);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.steamClient.on("loggedOn", () => {
      logger.info(`✅ [${this.accountTag}] Logged into Steam`);
      this.steamClient.setPersona(SteamUser.EPersonaState.Online);
      setTimeout(() => {
        this.steamClient.gamesPlayed([570]);
        logger.info(`🎮 [${this.accountTag}] Launching Dota 2...`);
        this.dotaClient.launch();
      }, 3000);
    });

    this.steamClient.on("error", (err) => {
      logger.error(`❌ [${this.accountTag}] Steam error:`, err);
      this.tryReconnect();
    });

    this.steamClient.on("disconnected", (eresult, msg) => {
      logger.warn(`⚠️ [${this.accountTag}] Steam disconnected: ${msg || eresult}`);
      this.isReady = false;
      this.tryReconnect();
    });

    this.dotaClient.on("debug", (msg: string) =>
      logger.debug(`[${this.accountTag}] [Dota2 Debug] ${msg}`)
    );

    this.dotaClient.on("ready", () => {
      this.isReady = true;
      this.reconnectAttempts = 0;
      logger.info(`🎯 [${this.accountTag}] Dota 2 GC ready`);
    });

    this.dotaClient.on("unready", () => {
      this.isReady = false;
      logger.warn(`⚠️ [${this.accountTag}] Dota 2 GC unready`);
    });

    if (this.attachTournamentHandler) {
      this.dotaClient.on("matchDetailsData", async (match: any) => {
        const channel = discordBot.getMainChannel() as TextChannel;
        if (!channel) {
          logger.warn(`⚠️ [${this.accountTag}] mainChannelId not configured or channel not found`);
          return;
        }
        await TournamentManager.onMatchFinished(match, channel);
      });
    }

    this.dotaClient.on("practiceLobbyUpdate", (lobby) => {
      this.handleLobbyUpdate(lobby);
    });

    this.dotaClient.on("practiceLobbyListData", (lobbies: any[]) => {
      try {
        // лобби может быть много, но нас интересует то, где мы хозяин
        const mine = lobbies.find(
          (lob: any) => lob && lob.lobby_id && this.currentLobby && lob.lobby_id.toString() === this.currentLobby.lobby_id
        );
      
        if (!mine) {
          logger.debug(`[${this.accountTag}] practiceLobbyListData: no matching lobby for me`);
          return;
        }
      
        // сохраним снапшот
        this.lastLobbySnapshot = mine;
      
        const members = (mine.members || []).filter((m: any) => m.team !== undefined);
        const humans = members.filter(
          (m: any) => !m.is_bot && m.name && m.name.length > 0
        );
      
        logger.info(
          `[${this.accountTag}] Snapshot lobby ${mine.lobby_id} — total:${members.length}, humans:${humans.length}`
        );
      
        // условие "если хотя бы один человек зашёл и мы ещё не стартовали"
        if (!this.coinAlreadyHandled && humans.length >= 10) {
          this.coinAlreadyHandled = true;
        
          const result = Math.random() < 0.5 ? "Свет" : "Тьма";
          this.sendLobbyMessage(`Результаты монетки: ${result} получает first pick!`);
          logger.info(`[${this.accountTag}] Coin toss result: ${result}`);
        
          if (result === "Тьма") {
            try {
              (this.dotaClient as any).flipLobbyTeams();
              this.sendLobbyMessage("Команды поменялись местами!");
              logger.info(`[${this.accountTag}] Teams flipped (Dire wins toss)`);
            } catch (err) {
              logger.error(`❌ [${this.accountTag}] Failed to flip teams:`, err);
            }
          }
        
          setTimeout(() => {
            this.sendLobbyMessage("Игра стартанет через 10 секунд... GL HF!");
            this.launchLobbyGame();
          }, 10_000);
        }
      } catch (err) {
        logger.error(`❌ [${this.accountTag}] Error in practiceLobbyListData handler:`, err);
      }
    });
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`❌ [${this.accountTag}] Max reconnect attempts reached.`);
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(5000 * this.reconnectAttempts, 30000);
    logger.info(`🔄 [${this.accountTag}] Reconnecting in ${delay / 1000}s...`);
    setTimeout(() => this.connect(), delay);
  }

  public async connect(): Promise<void> {
    const { username, password, guardCode } = this.credentials;

    logger.info(`🔌 [${username}] Connecting to Steam...`);
    this.steamClient.logOn({
      accountName: username,
      password,
      authCode: guardCode,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject("Timeout connecting to Steam"), 40000);
      this.dotaClient.once("ready", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  public async createLobby(options: CreateLobbyOptions): Promise<LobbyDetails> {
    if (!this.isReady) {
    logger.warn(`⚠️ [${this.accountTag}] GC not ready yet — waiting...`);
    await new Promise<void>((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (this.isReady) {
          clearInterval(interval);
          const waited = ((Date.now() - start) / 1000).toFixed(1);
          logger.info(`🟢 [${this.accountTag}] GC ready after ${waited}s`);
          resolve();
        }
      }, 1000);
    });
  }

    logger.info(`🎯 [${this.accountTag}] Creating lobby ${options.game_name}...`);
    const lobbyOptions = {
      game_name: options.game_name,
      pass_key: options.pass_key,
      server_region: options.server_region,
      game_mode: options.game_mode,
      dota_tv_delay: options.dota_tv_delay ?? 2,
      visibility: options.visibility ?? 1,
      allow_cheats: false,
      fill_with_bots: false,
      allow_spectating: options.allow_spectating ?? true,
    };

    try {
      (this.dotaClient as any).leavePracticeLobby();
    } catch (e) {
      logger.debug(`[${this.accountTag}] No previous lobby to leave`);
    }

    await new Promise((r) => setTimeout(r, 3000));

    return new Promise<LobbyDetails>((resolve, reject) => {
      let timeout: NodeJS.Timeout;

      const onLobbyUpdate = (lobby: any) => {
        if (lobby && lobby.lobby_id) {
          clearTimeout(timeout);
          this.dotaClient.removeListener("practiceLobbyUpdate", onLobbyUpdate);

          this.currentLobby = {
            lobby_id: lobby.lobby_id.toString(),
            pass_key: lobby.pass_key,
            members: lobby.members || [],
          };

          this.coinAlreadyHandled = false;
          this.lastLobbySnapshot = null;

          logger.info(`✅ [${this.accountTag}] Lobby created: ${lobby.lobby_id}`);

          // Перемещаем себя в спектаторы
          setTimeout(() => {
            try {
              this.dotaClient.joinPracticeLobbyTeam(3, 4);
              logger.info(`👁️  [${this.accountTag}] Joined Spectator slot`);
            } catch (e) {
              logger.error(`⚠️ [${this.accountTag}] Failed to move to spectator:`, e);
            }
          }, 1500);

          // После создания лобби резолвим
          resolve(this.currentLobby);
          // сразу попросим snapshot
          setTimeout(() => {
            try {
              logger.info(`🔍 [${this.accountTag}] Initial lobby snapshot request...`);
              (this.dotaClient as any).requestPracticeLobbyList();
            } catch (err) {
              logger.error(`⚠️ [${this.accountTag}] Failed to request lobby list:`, err);
            }
          }, 2000);
        }
      };

      this.dotaClient.on("practiceLobbyUpdate", onLobbyUpdate);

      timeout = setTimeout(() => {
        this.dotaClient.removeListener("practiceLobbyUpdate", onLobbyUpdate);
        reject(new Error(`[${this.accountTag}] Timeout waiting for lobby creation`));
      }, 40000);

      this.dotaClient.createPracticeLobby(lobbyOptions, (err: any) => {
        if (err) {
          clearTimeout(timeout);
          this.dotaClient.removeListener("practiceLobbyUpdate", onLobbyUpdate);
          logger.error(`❌ [${this.accountTag}] Failed to create lobby:`, err);
          reject(err);
        } else {
          logger.info(`✅ [${this.accountTag}] Lobby creation request sent`);
        }
      });
    });
  }

  public async destroyLobby(): Promise<void> {
    if (!this.isReady) {
      logger.warn(`⚠️ [${this.accountTag}] destroyLobby() skipped — client not ready`);
      return;
    }
  
    try {
      if (this.currentLobby) {
        logger.info(`🧹 [${this.accountTag}] Leaving and destroying lobby ${this.currentLobby.lobby_id}...`);
      
        // Сначала выйти из лобби (иначе GC иногда игнорирует destroy)
        this.dotaClient.leavePracticeLobby();
      
        // Затем отправить команду на удаление
        this.dotaClient.destroyLobby();
      
        // Подстраховка — ждём 3 секунды и чистим состояние
        await new Promise((r) => setTimeout(r, 3000));
      
        this.currentLobby = null;
        logger.info(`✅ [${this.accountTag}] Lobby destroyed successfully`);
      } else {
        logger.info(`ℹ️ [${this.accountTag}] No active lobby to destroy`);
      }
    } catch (err) {
      logger.error(`❌ [${this.accountTag}] Failed to destroy lobby:`, err);
    }
  }

  private async handleLobbyUpdate(lobby: any) {
    logger.info(`📡 [${this.accountTag}] practiceLobbyUpdate fired`);

    // Если у нас нет currentLobby ещё (теоретически), просто игнор
    if (!this.currentLobby) {
      logger.warn(`[${this.accountTag}] practiceLobbyUpdate but no currentLobby`);
      return;
    }

    // Попросим у GC актуальный снимок, чтобы поймать реальных игроков
    try {
      (this.dotaClient as any).requestPracticeLobbyList();
      logger.debug(`[${this.accountTag}] Requested fresh lobby list from GC`);
    } catch (err) {
      logger.error(`❌ [${this.accountTag}] Couldn't request lobby list after update:`, err);
    }
  }

  public sendLobbyMessage(text: string) {
    try {
      (this.dotaClient as any).sendMessage(text, 2);
      logger.info(`💬 [${this.accountTag}] Sent to lobby: ${text}`);
    } catch (err) {
      logger.error(`❌ [${this.accountTag}] Failed to send lobby message:`, err);
    }
  }

  public async launchLobbyGame() {
    if (!this.isReady || !this.currentLobby) return;
    try {
      logger.info(`🚀 [${this.accountTag}] Launching game for lobby ${this.currentLobby.lobby_id}`);
      (this.dotaClient as any).launchPracticeLobby();
    } catch (err) {
      logger.error(`❌ [${this.accountTag}] Failed to launch game`, err);
    }
  }

  public async joinLobby(lobbyId: string, passKey: string, team: number, slot: number) {
    if (!this.isReady) throw new Error(`[${this.accountTag}] Dota2 client not ready`);
    logger.info(`🎮 [${this.accountTag}] Joining lobby ${lobbyId} (team=${team}, slot=${slot})`);

    try {
      (this.dotaClient as any).joinPracticeLobby(lobbyId, passKey);
      // дождёмся подтверждения GC
      await new Promise((resolve) => setTimeout(resolve, 2000));
      (this.dotaClient as any).joinPracticeLobbyTeam(team, slot);
      logger.info(`✅ [${this.accountTag}] Joined lobby as ${team === 0 ? "Radiant" : "Dire"} slot ${slot}`);
    } catch (err) {
      logger.error(`❌ [${this.accountTag}] Failed to join lobby`, err);
    }
  }

  public getCurrentLobby(): LobbyDetails | null {
    return this.currentLobby;
  }

  public disconnect() {
    this.steamClient.logOff();
    logger.info(`🔌 [${this.accountTag}] Disconnected from Steam`);
  }

  public isClientReady(): boolean {
    return this.isReady;
  }
}
