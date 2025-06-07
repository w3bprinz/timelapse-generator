import { MessageFlags } from "discord.js";

export default {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`Kein Command mit dem Namen ${interaction.commandName} gefunden.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("Unbehandelter Fehler im Command:", error);

      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: "Es ist ein Fehler aufgetreten! 🚨",
            flags: [MessageFlags.Ephemeral],
          });
        } catch (replyError) {
          console.error("Konnte nicht mehr auf Interaction antworten:", replyError);
        }
      }
    }
  },
};
