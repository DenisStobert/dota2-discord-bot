import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Interaction,
} from "discord.js";

export async function handleRegisterButton(interaction: Interaction) {
  if (!interaction.isButton() || interaction.customId !== "register_team") return;

  const modal = new ModalBuilder()
    .setCustomId("register_team_modal")
    .setTitle("Регистрация команды");

  // 🏷️ 1. Название команды
  const teamName = new TextInputBuilder()
    .setCustomId("team_name")
    .setLabel("Название команды")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Пример: Gladiators")
    .setRequired(true);

  // 🎮 2–4. Игроки 1–3 (обязательные)
  const player1 = new TextInputBuilder()
    .setCustomId("player_1")
    .setLabel("Игрок 1 (Имя - MMR)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Пример: Wispy - 9500")
    .setRequired(true);

  const player2 = new TextInputBuilder()
    .setCustomId("player_2")
    .setLabel("Игрок 2 (Имя - MMR)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Пример: m3h - 8800")
    .setRequired(true);

  const player3 = new TextInputBuilder()
    .setCustomId("player_3")
    .setLabel("Игрок 3 (Имя - MMR)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Пример: Eclipse - 7000")
    .setRequired(true);

  // 🧩 5. Остальные игроки в одном поле
  const others = new TextInputBuilder()
    .setCustomId("players_extra")
    .setLabel("Игроки 4–5 (по желанию)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Пример: Kirryto - 6400, Yatoro - 5100")
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
