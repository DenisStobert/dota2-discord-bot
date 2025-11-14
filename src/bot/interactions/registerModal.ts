import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { getDb } from "../../database/db";

export async function handleRegisterButton(interaction: ButtonInteraction) {
  if (interaction.customId !== "register_team") return;

  const db = getDb();
  const res = db.exec("SELECT * FROM teams");
  const userTeams: any[] = [];

  if (res.length > 0) {
    const columns = res[0].columns;
    for (const values of res[0].values) {
      const obj = Object.fromEntries(columns.map((c, i) => [c, String(values[i] ?? "")]));
      try {
        const players = JSON.parse(obj.players_json || "[]");
        if (players.some((p: any) => p.discord_id === interaction.user.id)) {
          userTeams.push({ id: obj.id, name: obj.name });
        }
      } catch {}
    }
  }

  // Если юзер уже в команде → dropdown + кнопка
  if (userTeams.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId("select_existing_team")
      .setPlaceholder("Выбери свою команду для регистрации")
      .addOptions(
        userTeams.map((t) => ({
          label: t.name,
          value: t.id,
        }))
      );

    const createButton = new ButtonBuilder()
      .setCustomId("create_new_team")
      .setLabel("➕ Создать новую команду")
      .setStyle(ButtonStyle.Success);

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle("🎮 Регистрация на турнир")
      .setDescription("Ты уже состоишь в одной или нескольких командах.\n\nВыбери команду для регистрации или создай новую.");

    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(createButton);

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2],
      ephemeral: true,
    });
    return;
  }

  // Если нет команд — показываем модалку
  await showCreateTeamModal(interaction);
}

export async function showCreateTeamModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("register_team_modal")
    .setTitle("Регистрация команды");

  const teamName = new TextInputBuilder()
    .setCustomId("team_name")
    .setLabel("Название команды")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const player1 = new TextInputBuilder()
    .setCustomId("player_1")
    .setLabel("Игрок 1 (Имя - MMR)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const player2 = new TextInputBuilder()
    .setCustomId("player_2")
    .setLabel("Игрок 2 (Имя - MMR)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const player3 = new TextInputBuilder()
    .setCustomId("player_3")
    .setLabel("Игрок 3 (Имя - MMR)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const others = new TextInputBuilder()
    .setCustomId("players_extra")
    .setLabel("Игроки 4–5 (по желанию)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(teamName),
    new ActionRowBuilder<TextInputBuilder>().addComponents(player1),
    new ActionRowBuilder<TextInputBuilder>().addComponents(player2),
    new ActionRowBuilder<TextInputBuilder>().addComponents(player3),
    new ActionRowBuilder<TextInputBuilder>().addComponents(others)
  );

  await interaction.showModal(modal);
}
