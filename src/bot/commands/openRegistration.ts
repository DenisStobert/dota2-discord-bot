import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  TextChannel,
} from "discord.js";
import { setRegistrationMessageId } from "../state/registrationState";
import { setTournamentPhase, TournamentPhase } from "../state/tournamentState";

export async function handleOpenRegistration(message: Message) {
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply("❌ Только администраторы могут открыть регистрацию.");
  }

  const embed = new EmbedBuilder()
    .setColor(0x00aeff)
    .setTitle("🎯 Регистрация на турнир Dota 2 открыта!")
    .setDescription(
      "Нажмите **'Зарегистрироваться'**, чтобы подать заявку. После нажатия появится форма, где нужно указать название команды и MMR игроков.\nРегистрация закроется после 32 команд или вручную."
    );

  const button = new ButtonBuilder()
    .setCustomId("register_team")
    .setLabel("Зарегистрироваться")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  const channel = message.channel as TextChannel;

  // 📩 Отправляем сообщение с кнопкой
  const sent = await channel.send({
    embeds: [embed],
    components: [row],
  });

  // 💾 Сохраняем ID этого сообщения
  setRegistrationMessageId(sent.id);

  // 🔄 Обновляем фазу
  setTournamentPhase(TournamentPhase.Registration);

  await message.reply("✅ Регистрация успешно открыта!");
}
