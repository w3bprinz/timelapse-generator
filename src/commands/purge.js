import { SlashCommandBuilder } from "discord.js";
import { MessageFlags, PermissionFlagsBits } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Löscht Nachrichten im aktuellen Kanal")
    .addIntegerOption((option) =>
      option
        .setName("anzahl")
        .setDescription("Anzahl der zu löschenden Nachrichten (1–100)")
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "❌ Du hast keine Berechtigung, Nachrichten zu löschen!",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const amount = interaction.options.getInteger("anzahl") || 100;

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      await interaction.channel.bulkDelete(messages);
      await interaction.reply({
        content: `✅ ${messages.size} Nachrichten wurden gelöscht.`,
        flags: [MessageFlags.Ephemeral],
      });
    } catch (error) {
      console.error("Fehler beim Löschen von Nachrichten:", error);
      await interaction.reply({
        content: "❌ Es gab einen Fehler beim Löschen der Nachrichten!",
        flags: [MessageFlags.Ephemeral],
      });
    }
  },
};
