const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Postet das letzte aufgenommene Bild"),
  async execute(interaction) {
    try {
      const screenshotsPath = "/app/screenshots";

      // Prüfe ob der Screenshot-Ordner existiert
      if (!fs.existsSync(screenshotsPath)) {
        return await interaction.reply({
          content: "Keine Screenshots gefunden!",
          flags: MessageFlags.Ephemeral,
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
        return await interaction.reply({
          content: "Keine Screenshots gefunden!",
          flags: MessageFlags.Ephemeral,
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

      // Lese die Datei in einen Buffer
      const fileBuffer = fs.readFileSync(outputPath);

      // Sende das Bild mit dem Buffer
      await interaction.reply({
        content: `Letztes Bild (${latestFile}):`,
        files: [
          {
            attachment: fileBuffer,
            name: latestFile,
          },
        ],
      });

      // Lösche das temporäre Bild nach dem Senden
      fs.unlinkSync(outputPath);
    } catch (error) {
      console.error("Fehler beim Verarbeiten des letzten Bildes:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "Es gab einen Fehler beim Verarbeiten des Bildes!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
