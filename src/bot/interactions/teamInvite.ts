import {
  Interaction,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  User,
  EmbedBuilder,
} from "discord.js";
import { getDb, saveDatabase } from "../../database/db";
import { logger } from "../../utils/logger";

// ==========================
// 📩 Отправка инвайта игроку
// ==========================
export async function sendTeamInvite(inviter: User, target: User, team: any) {
  try {
    const acceptButton = new ButtonBuilder()
      .setCustomId(`invite_accept_${team.id}_${inviter.id}`)
      .setLabel("✅ Принять")
      .setStyle(ButtonStyle.Success);

    const declineButton = new ButtonBuilder()
      .setCustomId(`invite_decline_${team.id}_${inviter.id}`)
      .setLabel("❌ Отклонить")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      acceptButton,
      declineButton
    );

    await target.send({
      content: `📨 Вас пригласили в команду **${team.name}** (капитан: ${inviter.username})`,
      components: [row],
    });

    await inviter.send(`✅ Приглашение отправлено игроку **${target.username}**.`);
  } catch (err) {
    await inviter.send(`⚠️ Не удалось отправить приглашение **${target.username}** (возможно, закрыты личные сообщения).`);
    logger.error("Invite send error:", err);
  }
}

// ==========================================
// 🧩 Обработка нажатий кнопок Пригласить / Отменить
// ==========================================
export async function handleInviteInteraction(interaction: Interaction) {
  if (!interaction.isButton()) return;

  if (
    !interaction.customId.startsWith("invite_accept_") &&
    !interaction.customId.startsWith("invite_decline_")
  )
    return;

  try {
    // ⚙️ Сразу подтверждаем, что взаимодействие принято (Discord ждёт ответ <3s)
    await interaction.deferReply({ ephemeral: true });

    const idParts = interaction.customId.split("_");
    const teamId = idParts[2];
    const inviterId = idParts[3];

    const db = getDb();
    const teamRes = db.exec("SELECT * FROM teams WHERE id = ?", [teamId]);
    if (teamRes.length === 0) {
      await interaction.editReply("❌ Команда не найдена.");
      return;
    }

    const row = teamRes[0];
    const columns = row.columns;
    const values = row.values[0];
    const team = Object.fromEntries(columns.map((c, i) => [c, String(values[i] ?? "")]));

    if (interaction.customId.startsWith("invite_accept_")) {
      const userCheck = db.exec("SELECT * FROM users WHERE discord_id = ?", [interaction.user.id]);
      const isRegistered = userCheck.length > 0 && userCheck[0].values.length > 0;

      if (!isRegistered) {
        const registerUrl = `http://localhost:3080/auth/steam?discord_id=${interaction.user.id}`;
      
        const button = new ButtonBuilder()
          .setLabel("🎮 Войти через Steam и присоединиться")
          .setStyle(ButtonStyle.Link)
          .setURL(registerUrl);
            
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
            
        const embed = new EmbedBuilder()
          .setColor(0x00b0f4)
          .setTitle("🎮 Авторизация Steam")
          .setDescription("Чтобы присоединиться к команде, войди через Steam. После входа бот добавит тебя автоматически.");
            
        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }

      const players = JSON.parse(team.players_json || "[]");
      if (players.some((p: any) => p.discord_id === interaction.user.id)) {
        await interaction.editReply("⚠️ Ты уже в этой команде.");
        return;
      }

      players.push({ discord_id: interaction.user.id, name: interaction.user.username });
      db.run("UPDATE teams SET players_json = ? WHERE id = ?", [
        JSON.stringify(players),
        team.id,
      ]);
      saveDatabase();

      await interaction.editReply(`✅ Ты успешно присоединился к команде **${team.name}**!`);

      try {
        const inviter = await interaction.client.users.fetch(inviterId);
        await inviter.send(`🎉 Игрок **${interaction.user.username}** присоединился к **${team.name}**.`);
      } catch {}

      logger.info(`✅ ${interaction.user.username} joined ${team.name}`);
    }

    if (interaction.customId.startsWith("invite_decline_")) {
      await interaction.editReply("❌ Приглашение отклонено.");
      try {
        const inviter = await interaction.client.users.fetch(inviterId);
        await inviter.send(`🚫 Игрок **${interaction.user.username}** отклонил приглашение в **${team.name}**.`);
      } catch {}
    }
  } catch (err) {
    logger.error("❌ Ошибка обработки инвайта:", err);
    if (!interaction.replied) {
      try {
        await interaction.reply({ content: "⚠️ Ошибка при обработке взаимодействия.", ephemeral: true });
      } catch {}
    }
  }
}
