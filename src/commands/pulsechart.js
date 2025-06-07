import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import pulseService from "../services/pulseService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pulsechart")
    .setDescription("Zeigt einen Chart der Klimadaten von Pulse")
    .addStringOption((option) =>
      option
        .setName("zeitraum")
        .setDescription("Zeitraum für den Chart")
        .setRequired(true)
        .addChoices({ name: "Tag", value: "1" }, { name: "Woche", value: "7" }, { name: "Monat", value: "30" })
    ),

  async execute(interaction) {
    const days = parseInt(interaction.options.getString("zeitraum"));
    await interaction.deferReply();

    try {
      const imageBuffer = await pulseService.createChart(days);

      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        throw new Error("Kein gültiges Chart-Image erstellt");
      }

      const nameMap = { 1: "tag", 7: "woche", 30: "monat" };
      const filename = `pulse_chart_${nameMap[days] || days}.png`;
      const attachment = new AttachmentBuilder(imageBuffer, { name: filename });

      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("❌ Fehler beim Senden des Charts:", error);
      await interaction.editReply("Fehler beim Erstellen des Charts.");
    }
  },
};
