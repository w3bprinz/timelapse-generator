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
      console.error("Unbehandelter Fehler im Command:", error);
      // Keine Antwort mehr hier, da der Command selbst für die Fehlerbehandlung zuständig ist
    }
  },
};
