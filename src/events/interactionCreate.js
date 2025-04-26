module.exports = {
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
      console.error(error);
      await interaction.reply({
        content: "Es gab einen Fehler bei der Ausführung dieses Befehls!",
        ephemeral: true,
      });
    }
  },
};
