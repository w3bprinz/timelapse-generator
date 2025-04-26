const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Löscht eine bestimmte Anzahl von Nachrichten oder alle Nachrichten")
    .addIntegerOption((option) =>
      option
        .setName("anzahl")
        .setDescription(
          "Anzahl der zu löschenden Nachrichten (1-100). Wenn nicht angegeben, werden alle Nachrichten gelöscht."
        )
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    // Prüfe ob der Benutzer der Bot-Owner ist
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({
        content: "Du hast keine Berechtigung, diesen Befehl zu verwenden!",
        ephemeral: true,
      });
    }

    const amount = interaction.options.getInteger("anzahl");
    let deletedCount = 0;
    let lastMessageId = null;

    try {
      // Sende initiale Antwort
      await interaction.reply({
        content: "Starte das Löschen der Nachrichten...",
        ephemeral: true,
      });

      // Funktion zum Löschen von Nachrichten mit Rate Limit
      const deleteMessages = async (limit) => {
        const messages = await interaction.channel.messages.fetch({
          limit: limit,
          before: lastMessageId,
        });

        if (messages.size === 0) return false;

        await interaction.channel.bulkDelete(messages, true);
        deletedCount += messages.size;
        lastMessageId = messages.last().id;

        // Warte 1 Sekunde zwischen den Löschvorgängen wegen Rate Limit
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return true;
      };

      if (amount) {
        // Wenn eine bestimmte Anzahl angegeben wurde
        await deleteMessages(amount);
      } else {
        // Wenn keine Anzahl angegeben wurde, lösche alle Nachrichten
        while (await deleteMessages(100)) {
          // Fortsetzen bis keine Nachrichten mehr gefunden werden
        }
      }

      // Aktualisiere die Antwort
      await interaction.editReply({
        content: `Erfolgreich ${deletedCount} Nachrichten gelöscht!`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Fehler beim Löschen der Nachrichten:", error);
      await interaction.editReply({
        content: `Es gab einen Fehler beim Löschen der Nachrichten! ${
          deletedCount > 0 ? `Es wurden ${deletedCount} Nachrichten gelöscht.` : ""
        }`,
        ephemeral: true,
      });
    }
  },
};
