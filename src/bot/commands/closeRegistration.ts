import {
  TextChannel,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { logger } from "../../utils/logger";
import { getTournamentPhase, setTournamentPhase, TournamentPhase } from "../state/tournamentState";
import { getRegistrationMessageId, setRegistrationMessageId } from "../state/registrationState";

export async function handleCloseRegistration(message: any) {
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply("❌ Только администраторы могут закрыть регистрацию.");
  }

  if (getTournamentPhase() !== TournamentPhase.Registration) {
    return message.reply("⚠️ Сейчас нет активной регистрации.");
  }

  const channel = message.channel as TextChannel;
  const messageId = getRegistrationMessageId();

  if (messageId) {
    try {
      const regMessage = await channel.messages.fetch(messageId);

      const disabledButton = new ButtonBuilder()
        .setCustomId("register_team")
        .setLabel("Регистрация закрыта")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButton);

      await regMessage.edit({
        content: "🚫 Регистрация завершена.",
        components: [disabledRow],
      });
    } catch (err) {
      console.error("Не удалось найти сообщение:", err);
      await channel.send("⚠️ Не удалось найти сообщение с кнопкой регистрации.");
    }
  } else {
    await channel.send("⚠️ Не найдено активное сообщение с регистрацией.");
  }

  setTournamentPhase(TournamentPhase.Idle);
  setRegistrationMessageId(null);

  await channel.send("✅ Регистрация закрыта! Новые команды больше не принимаются.");
  logger.info("✅ Registration closed and button disabled.");
}
