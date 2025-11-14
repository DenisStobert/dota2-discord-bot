import {
  Message,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
  User,
} from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";
import { sendTeamInvite } from "../interactions/teamInvite";

// ======== Основная команда !my_team ========

export async function handleMyTeam(message: Message) {
  const db = getDb();

  // Проверяем, состоит ли пользователь в какой-либо команде
  const res = db.exec("SELECT * FROM teams");
  if (res.length === 0) {
    await message.reply("❌ Пока нет созданных команд.");
    return;
  }

  let teamRow: any = null;
  const columns = res[0].columns;
  for (const values of res[0].values) {
    // Преобразуем все значения в строки
    const obj = Object.fromEntries(
      res[0].columns.map((c, i) => [c, String(values[i] ?? "")])
    );
  
    // Если ты капитан — сразу считаем, что это твоя команда
    if (obj.captain_id === message.author.id) {
      teamRow = obj;
      break;
    }
  
    // Проверяем, есть ли ты в players_json
    let players: any[] = [];
    try {
      players = JSON.parse(obj.players_json || "[]");
    } catch {
      players = [];
    }
  
    if (players.some((p: any) => p.discord_id === message.author.id)) {
      teamRow = obj;
      break;
    }
  }

  if (!teamRow) {
    await message.reply("⚠️ Ты не состоишь ни в одной команде.");
    return;
  }

  const players = JSON.parse(teamRow.players_json || "[]");

  const embed = new EmbedBuilder()
    .setColor(0x00aaff)
    .setTitle(`🧱 Команда: ${teamRow.name}`)
    .setDescription(
      players
        .map(
          (p: any, i: number) =>
            `${i + 1}. ${p.name} ${p.discord_id === teamRow.captain_id ? "👑" : ""}`
        )
        .join("\n") || "— Пока нет игроков —"
    )
    .setFooter({ text: `Капитан: ${players.find((p: any) => p.discord_id === teamRow.captain_id)?.name || "Неизвестно"}` })
    .setTimestamp();

  // Только капитану показываем кнопки управления
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (message.author.id === teamRow.captain_id) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`add_player_${teamRow.id}`)
        .setLabel("➕ Добавить игрока")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`remove_player_${teamRow.id}`)
        .setLabel("➖ Удалить игрока")
        .setStyle(ButtonStyle.Danger)
    );
  }

  await message.reply({
    embeds: [embed],
    components: row.components.length > 0 ? [row] : [],
  });
}

// ======== Обработка нажатий кнопок ========

export async function handleMyTeamInteraction(interaction: Interaction) {
  if (!interaction.isButton()) return;
  const { customId } = interaction;
  if (!customId.startsWith("add_player_") && !customId.startsWith("remove_player_")) return;

  const teamId = customId.split("_")[2];
  const db = getDb();

  const teamRes = db.exec("SELECT * FROM teams WHERE id = ?", [teamId]);
  if (teamRes.length === 0 || teamRes[0].values.length === 0) {
    await interaction.reply({ content: "❌ Команда не найдена.", ephemeral: true });
    return;
  }

  const row = teamRes[0];
  const columns = row.columns;
  const values = row.values[0];
  const team = Object.fromEntries(
    columns.map((c, i) => [c, String(values[i] ?? "")])
  );
  const players = JSON.parse(team.players_json || "[]");

  // Только капитан может редактировать
  if (interaction.user.id !== team.captain_id) {
    await interaction.reply({ content: "⚠️ Только капитан может управлять составом.", ephemeral: true });
    return;
  }

  if (customId.startsWith("add_player_")) {
    await interaction.reply({
      content: "✏️ Упомяни игрока, которого хочешь пригласить (через @). У тебя есть 20 секунд.",
      ephemeral: false,
    });
  
    const channel = interaction.channel;
    if (!channel || !(channel instanceof TextChannel)) {
      await interaction.followUp({
        content: "⚠️ Добавление доступно только из текстового канала сервера.",
        ephemeral: true,
      });
      return;
    }
  
    const collector = channel.createMessageCollector({
      time: 20000,
      max: 1,
      filter: (m: Message) => m.author.id === interaction.user.id,
    });
  
    collector.on("collect", async (m: Message) => {
      const mention = m.mentions.users.first();
      if (!mention) {
        await m.reply("⚠️ Укажи игрока через @упоминание (пример: `@Eclipse`).");
        return;
      }
  
      if (mention.id === interaction.user.id) {
        await m.reply("⚠️ Нельзя пригласить самого себя.");
        return;
      }
  
      // Проверяем, не в команде ли уже
      const players = JSON.parse(team.players_json || "[]");
      if (players.some((p: any) => p.discord_id === mention.id)) {
        await m.reply("⚠️ Этот игрок уже находится в команде.");
        return;
      }
  
      // 🚀 Отправляем приглашение через teamInvite.ts
      await sendTeamInvite(interaction.user, mention, team);
  
      await m.reply(`✅ Приглашение отправлено игроку **${mention.username}**!`);
    });
  
    collector.on("end", (collected: any) => {
      if (collected.size === 0) {
        interaction.followUp({
          content: "⌛ Время ожидания истекло. Добавление отменено.",
          ephemeral: true,
        });
      }
    });
  
    return;
  }

  if (customId.startsWith("remove_player_")) {
    if (players.length <= 1) {
      await interaction.reply({ content: "❌ Нельзя удалить последнего игрока.", ephemeral: true });
      return;
    }
  
    const options = players
      .filter((p: any) => p.discord_id !== team.captain_id)
      .map((p: any, i: number) => `\`${i + 1}\` — ${p.name}`)
      .join("\n");
  
    await interaction.reply({
      content: "📨 Проверь личные сообщения — я отправил туда список игроков.",
      ephemeral: true,
    });
  
    // ⚙️ Открываем личку с пользователем
    const dm = await interaction.user.createDM();
    await dm.send(
      `Выбери номер игрока для удаления из команды **${team.name}**:\n${options}\n\nНапиши номер в ответ.`
    );
  
    const collector = dm.createMessageCollector({
      time: 20000,
      max: 1,
      filter: (m) => m.author.id === interaction.user.id,
    });
  
    collector.on("collect", (msg) => {
      const num = parseInt(msg.content.trim());
      if (isNaN(num) || num < 1 || num > players.length - 1) {
        msg.reply("⚠️ Неверный номер.");
        return;
      }
  
      const target = players.filter((p: any) => p.discord_id !== team.captain_id)[num - 1];
      const newPlayers = players.filter((p: any) => p.discord_id !== target.discord_id);
  
      db.run("UPDATE teams SET players_json = ? WHERE id = ?", [
        JSON.stringify(newPlayers),
        team.id,
      ]);
      saveDatabase();
  
      msg.reply(`✅ Игрок **${target.name}** удалён из команды **${team.name}**.`);
      logger.info(`🗑️ Removed ${target.name} from team ${team.name}`);
    });
  
    collector.on("end", (collected) => {
      if (collected.size === 0) dm.send("⌛ Время ожидания истекло. Удаление отменено.");
    });
  }
}
