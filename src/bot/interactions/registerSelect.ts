import {
  StringSelectMenuInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { getDb } from "../../database/db";

export async function handleSelectExistingTeam(interaction: StringSelectMenuInteraction) {
  if (interaction.customId !== "select_existing_team") return;

  const teamId = interaction.values[0];
  const db = getDb();

  const res = db.exec("SELECT * FROM teams WHERE id = ?", [teamId]);
  if (!res.length || !res[0].values.length) {
    await interaction.reply({ content: "❌ Команда не найдена.", ephemeral: true });
    return;
  }

  const row = res[0];
  const columns = row.columns;
  const values = row.values[0];
  const team = Object.fromEntries(columns.map((c, i) => [c, String(values[i] ?? "")]));
  const players = JSON.parse(team.players_json || "[]");

  const embed = new EmbedBuilder()
    .setColor(0x00b0f4)
    .setTitle(`✅ Регистрация команды`)
    .setDescription(
      `Ты выбрал команду **${team.name}** для участия.\n\n👥 **Состав:**\n${players
        .map((p: any, i: number) => `${i + 1}. ${p.name}`)
        .join("\n")}`
    );

  const confirmBtn = new ButtonBuilder()
    .setCustomId(`confirm_team_${team.id}`)
    .setLabel("✅ Подтвердить участие")
    .setStyle(ButtonStyle.Success);

  const cancelBtn = new ButtonBuilder()
    .setCustomId("cancel_register")
    .setLabel("❌ Отмена")
    .setStyle(ButtonStyle.Secondary);

  const rowBtns = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

  await interaction.reply({
    embeds: [embed],
    components: [rowBtns],
    ephemeral: true,
  });
}
