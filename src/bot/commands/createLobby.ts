import { Message, EmbedBuilder } from 'discord.js';
import { LobbyManager } from '../../services/lobbyManager';
import { parseRegion, parseGameMode } from '../../utils/validation';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// ⬇️ добавь export здесь
export async function handleCreateLobby(message: Message, args: string[]) {
  try {
    // Проверка прав (опционально)
    if (config.discord.allowedRoleName) {
      const hasRole = message.member?.roles.cache.some(
        (role) => role.name === config.discord.allowedRoleName
      );
      if (!hasRole) {
        await message.reply(
          '❌ У вас нет прав для создания лобби. Нужна роль: ' +
            config.discord.allowedRoleName
        );
        return;
      }
    }

    // Проверка канала (опционально)
    if (
      config.discord.lobbyChannelId &&
      message.channel.id !== config.discord.lobbyChannelId
    ) {
      await message.reply(
        `❌ Эту команду можно использовать только в <#${config.discord.lobbyChannelId}>`
      );
      return;
    }

    // Парсинг аргументов
    let region = config.lobby.defaultRegion;
    let gameMode = config.lobby.defaultGameMode;

    if (args.length >= 1) {
      const parsedRegion = parseRegion(args[0]);
      if (parsedRegion !== null) region = parsedRegion;
    }

    if (args.length >= 2) {
      const parsedMode = parseGameMode(args[1]);
      if (parsedMode !== null) gameMode = parsedMode;
    }

    // ⚙️ Создаём лобби через LobbyManager
    const lobby = await LobbyManager.createLobby({
      region,
      gameMode,
      ownerId: message.author.id,
      channelId: message.channel.id,
    });

    if (!lobby) {
      await message.reply(
        '❌ Не удалось создать лобби. Возможно, у вас уже есть активное лобби.'
      );
      return;
    }

    // 🟢 Отправляем результат
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎮 Лобби успешно создано!')
      .setDescription(`ID: ${lobby.lobbyId || 'Неизвестно'}`)
      .addFields(
        { name: '🌍 Регион', value: lobby.regionName, inline: true },
        { name: '🎯 Режим', value: lobby.gameModeName, inline: true },
        { name: '🔑 Пароль', value: `\`${lobby.password}\``, inline: true }
      )
      .setFooter({ text: `Lobby ID: ${lobby.id}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    logger.info(`✅ Lobby created via Discord by ${message.author.tag}`);
  } catch (error) {
    logger.error('Error in handleCreateLobby', error);
    await message.reply('❌ Произошла ошибка при создании лобби.');
  }
}
