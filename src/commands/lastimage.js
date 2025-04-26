const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Postet das letzte aufgenommene Bild"),
  async execute(interaction) {
    // Sofortige Antwort, dass wir arbeiten
    await interaction.reply({
      content: "Verarbeite das letzte Bild...",
      ephemeral: true,
    });

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

      // Verkleinere das Bild direkt auf eine kleinere Größe
      await sharp(inputPath)
        .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
        .png({ quality: 100 })
        .toFile(outputPath);

      // Sende das Bild
      await interaction.editReply({
        content: `Letztes Bild (${latestFile}):`,
        files: [outputPath],
      });

      // Lösche das temporäre Bild nach dem Senden
      fs.unlinkSync(outputPath);
    } catch (error) {
      console.error("Fehler beim Verarbeiten des letzten Bildes:", error);
      await interaction.editReply({
        content: "Es gab einen Fehler beim Verarbeiten des Bildes!",
      });
    }
  },
};
