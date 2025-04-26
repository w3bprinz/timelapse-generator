const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Postet das letzte aufgenommene Bild"),
  async execute(interaction) {
    const screenshotsPath = path.join(__dirname, "../../screenshots");

    try {
      // Prüfe ob der Screenshot-Ordner existiert
      if (!fs.existsSync(screenshotsPath)) {
        return interaction.reply({
          content: "Keine Screenshots gefunden!",
          ephemeral: true,
        });
      }

      // Hole alle JPG-Dateien und sortiere sie nach Datum
      const files = fs
        .readdirSync(screenshotsPath)
        .filter((file) => file.endsWith(".jpg"))
        .sort((a, b) => {
          return (
            fs.statSync(path.join(screenshotsPath, b)).mtime.getTime() -
            fs.statSync(path.join(screenshotsPath, a)).mtime.getTime()
          );
        });

      if (files.length === 0) {
        return interaction.reply({
          content: "Keine Screenshots gefunden!",
          ephemeral: true,
        });
      }

      const latestFile = files[0];
      const inputPath = path.join(screenshotsPath, latestFile);
      const outputPath = path.join(screenshotsPath, `resized_${latestFile}`);

      // Verkleinere das Bild schrittweise bis es unter 10MB ist
      let quality = 100;
      let currentSize = fs.statSync(inputPath).size;

      while (currentSize > 10 * 1024 * 1024 && quality > 10) {
        quality -= 10;
        await sharp(inputPath).jpeg({ quality: quality }).toFile(outputPath);
        currentSize = fs.statSync(outputPath).size;
      }

      // Sende das Bild
      await interaction.reply({
        content: `Letztes aufgenommenes Bild (${new Date(fs.statSync(inputPath).mtime).toLocaleString("de-DE")})`,
        files: [outputPath],
      });

      // Lösche die temporäre Datei
      fs.unlinkSync(outputPath);
    } catch (error) {
      console.error("Fehler beim Verarbeiten des Bildes:", error);
      await interaction.reply({
        content: "Es gab einen Fehler beim Verarbeiten des Bildes!",
        ephemeral: true,
      });
    }
  },
};
