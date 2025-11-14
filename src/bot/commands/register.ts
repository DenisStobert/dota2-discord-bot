import {
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export async function handleRegister(message: Message) {
  const discordId = message.author.id;

  // 👇 персональная ссылка с параметром discord_id
  const steamAuthUrl = `http://localhost:3080/auth/steam?discord_id=${discordId}`;

  const embed = new EmbedBuilder()
    .setColor("#00b0f4")
    .setTitle("🎮 Регистрация через Steam")
    .setDescription(
      "Чтобы участвовать в турнире, авторизуйся через Steam.\n\nПосле входа окно можно закрыть — я всё увижу 😉"
    )
    .setFooter({ text: "Dota 2 Tournament" })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setLabel("Войти через Steam")
    .setStyle(ButtonStyle.Link)
    .setURL(steamAuthUrl); // 👈 вот тут указываем ссылку с discord_id

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await message.reply({
    embeds: [embed],
    components: [row],
  });
}
