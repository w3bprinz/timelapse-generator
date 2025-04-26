const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Postet das letzte aufgenommene Bild"),
  async execute(interaction) {
    // Defer die Antwort, da die Bildverarbeitung Zeit braucht
    await interaction.deferReply();

    const screenshotsPath = path.join(__dirname, "../../screenshots");

    try {
      // Prüfe ob der Screenshot-Ordner existiert
      if (!fs.existsSync(screenshotsPath)) {
        return await interaction.editReply({
          content: "Keine Screenshots gefunden!",
        });
      }

      // Hole alle PNG-Dateien und sortiere sie nach Datum
      const files = fs
        .readdirSync(screenshotsPath)
        .filter((file) => file.endsWith(".png") && !file.startsWith("resized_"))
        .sort((a, b) => {
          return (
            fs.statSync(path.join(screenshotsPath, b)).mtime.getTime() -
            fs.statSync(path.join(screenshotsPath, a)).mtime.getTime()
          );
        });

      if (files.length === 0) {
        return await interaction.editReply({
          content: "Keine Screenshots gefunden!",
        });
      }

      const latestFile = files[0];
      const inputPath = path.join(screenshotsPath, latestFile);
      const outputPath = path.join(screenshotsPath, `resized_${latestFile}`);

      try {
        // Verkleinere das Bild schrittweise bis es unter 10MB ist
        let quality = 100;
        let currentSize = fs.statSync(inputPath).size;

        while (currentSize > 10 * 1024 * 1024 && quality > 10) {
          quality -= 10;
          await sharp(inputPath).png({ quality: quality }).toFile(outputPath);
          currentSize = fs.statSync(outputPath).size;
        }

        // Sende das Bild
        await interaction.editReply({
          content: `Letztes Bild (${latestFile}):`,
          files: [outputPath],
        });
      } finally {
        // Lösche das temporäre Bild, falls es existiert
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }
    } catch (error) {
      console.error("Fehler beim Verarbeiten des letzten Bildes:", error);
      await interaction.editReply({
        content: "Es gab einen Fehler beim Verarbeiten des Bildes!",
      });
    }
  },
};
