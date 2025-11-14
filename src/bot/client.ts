// src/bot/client.ts
import { Client, GatewayIntentBits, Message, ButtonInteraction } from "discord.js";
import { config } from "../config";
import { logger } from "../utils/logger";
import { TextChannel } from "discord.js";

// 🎮 Лобби-команды
import { handleCreateLobby } from "./commands/createLobby";
import { handleCloseLobby } from "./commands/closeLobby";

// 🏆 Турнирные команды
import { handleOpenRegistration } from "./commands/openRegistration";
import { showCreateTeamModal } from "./interactions/registerModal";
import { handleRegisterSubmit } from "./interactions/registerSubmit";
import { handleShowTeams } from "./commands/showTeams";
import { handleCloseRegistration } from "./commands/closeRegistration";
import { handleStartTournament } from "./commands/startTournament";
import { handleDeleteTeam } from "./commands/deleteTeam";
import { handleCloseTournament } from "./commands/closeTournament";
import { handleRegisterButton } from "./interactions/registerModal";
import { handleForceCloseLobbies } from "./commands/forceCloseLobbies";
import { handleRegister } from "./commands/register";
import { handleCreateTeam } from "./commands/createTeam";
import { handleInvitePlayer } from "./commands/invitePlayer";
import { handleMyTeam, handleMyTeamInteraction } from "./commands/myTeam";
import { handleDebugTeams } from "./commands/debugTeams";
import { handleResetTeam } from "./commands/resetTeam";
import { handleInviteInteraction } from "./interactions/teamInvite";
import { handleSelectExistingTeam } from "./interactions/registerSelect";
import { handleConfirmTeamRegistration } from "./interactions/registerConfirm";

export class DiscordBot {
  client: Client;
  private prefix: string;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });
    this.prefix = config.discord.commandPrefix;
    this.setupEventHandlers();
  }

  // ======================================================
  // 🔔 Основные обработчики событий
  // ======================================================
  private setupEventHandlers() {
    this.client.once("ready", () => {
      logger.info(`✅ Discord bot logged in as ${this.client.user?.tag}`);
    });

    // 📩 Обработка обычных сообщений
    this.client.on("messageCreate", async (message: Message) => {
      await this.handleMessage(message);
    });

    // ⚙️ Обработка взаимодействий (кнопки / модалки)
    this.client.on("interactionCreate", async (interaction) => {
      try {
        // 🔘 Кнопка "Зарегистрироваться"
        if (interaction.isButton() && interaction.customId === "register_team") {
          await handleRegisterButton(interaction);
          return;
        }

        if (interaction.isSelectMenu() && interaction.customId === "select_existing_team") {
          await handleSelectExistingTeam(interaction);
          return;
        }

        if (interaction.isButton() && interaction.customId.startsWith("confirm_team_")) {
          await handleConfirmTeamRegistration(interaction);
          return;
        }

        if (interaction.isButton() && interaction.customId === "cancel_register") {
          await interaction.reply({ content: "❌ Регистрация отменена.", ephemeral: true });
          return;
        }
        if (interaction.isButton() && interaction.customId === "create_new_team") {
          await showCreateTeamModal(interaction as ButtonInteraction);
          return;
        }

        // 📝 Сабмит модалки
        if (interaction.isModalSubmit() && interaction.customId === "register_team_modal") {
          await handleRegisterSubmit(interaction);
          return;
        }

        await handleMyTeamInteraction(interaction);
        await handleInviteInteraction(interaction);
      } catch (err) {
        logger.error("❌ Error handling interaction:", err);
        if (interaction.isRepliable() && !interaction.replied) {
          await interaction.reply({
            content: "⚠️ Произошла ошибка при обработке взаимодействия.",
            ephemeral: true,
          });
        }
      }
    });

    // 🚨 Ошибки клиента
    this.client.on("error", (error) => {
      logger.error("Discord client error", error);
    });
  }

  // ======================================================
  // 💬 Обработка текстовых команд
  // ======================================================
  private async handleMessage(message: Message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(this.prefix)) return;

    const args = message.content.slice(this.prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;

    try {
      switch (command) {
        // 🎮 Команды лобби
        case "register":
          await handleRegister(message);
          break;

        case "create_team":
        case "team_create":
          await handleCreateTeam(message, args);
          break;
              
        case "invite_player":
        case "team_invite":
          await handleInvitePlayer(message);
          break;

        case "my_team":
        case "team":
          await handleMyTeam(message);
          break;
        
        case "debug_teams":
          await handleDebugTeams(message);
          break;
        
        case "reset_team":
          await handleResetTeam(message);
          break;
        
        case "create_lobby":
        case "create":
          await handleCreateLobby(message, args);
          break;

        case "close_lobby":
        case "close":
          await handleCloseLobby(message);
          break;

        // 🏆 Турнир
        case "open_registration":
        case "open_reg":
          await handleOpenRegistration(message);
          break;

        case "show_teams":
        case "teams":
          await handleShowTeams(message);
          break;

        case "close_registration":
        case "close_reg":
          await handleCloseRegistration(message);
          break;

        case "start_tournament":
        case "start":
          await handleStartTournament(message);
          break;

        case "close_tournament":
        case "close_tour":
          await handleCloseTournament(message);
          break;

        case "delete_team":
        case "team_delete":
          await handleDeleteTeam(message);
          break;
        
        case "close_lobbies":
          await handleForceCloseLobbies(message);
          break;

        // ℹ️ Помощь
        case "help":
          await this.handleHelp(message);
          break;

        default:
          break;
      }
    } catch (error) {
      logger.error(`Error handling command: ${command}`, error);
      await message.reply("❌ Произошла ошибка при выполнении команды.");
    }
  }

  // ======================================================
  // 📘 Помощь
  // ======================================================
  private async handleHelp(message: Message) {
    const helpText = `
**🎮 Dota 2 Lobby Bot — Команды**

\`${this.prefix}create_lobby [region] [mode]\` — создать лобби
\`${this.prefix}close_lobby\` — закрыть лобби

**🏆 Турнир:**
\`${this.prefix}open_registration\` — открыть регистрацию
(позже добавим: \`${this.prefix}show_teams\`, \`${this.prefix}close_registration\`, \`${this.prefix}start_tournament\`)

\`${this.prefix}help\` — показать это сообщение
    `.trim();

    await message.reply(helpText);
  }

  // ======================================================
  // 🚀 Управление запуском
  // ======================================================
  public async start() {
    try {
      await this.client.login(config.discord.token);
      logger.info("Discord bot starting...");
    } catch (error) {
      logger.error("Failed to start Discord bot", error);
      throw error;
    }
  }

  public async stop() {
    this.client.destroy();
    logger.info("Discord bot stopped");
  }

  public getMainChannel(): TextChannel | null {
    const channelId = config.discord.mainChannelId;
    if (!channelId) return null;
    const channel = this.client.channels.cache.get(channelId);
    if (!channel || !(channel instanceof TextChannel)) return null;
    return channel;
  }
}
