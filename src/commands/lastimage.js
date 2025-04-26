const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Zeigt das letzte aufgenommene Bild an"),

  async execute(interaction) {
    try {
      // Sende zuerst eine "Wird verarbeitet..." Nachricht
      await interaction.reply({
        content: "Verarbeite das letzte Bild...",
      });

      const screenshotsPath = "/app/screenshots";

      // Prüfe, ob der Screenshot-Ordner existiert
      if (!fs.existsSync(screenshotsPath)) {
        await interaction.editReply({
          content: "Keine Screenshots gefunden!",
        });
        return;
      }

      // Lese alle PNG-Dateien und sortiere sie nach Änderungsdatum
      const files = fs
        .readdirSync(screenshotsPath)
        .filter((file) => file.endsWith(".png"))
        .map((file) => ({
          name: file,
          path: path.join(screenshotsPath, file),
          time: fs.statSync(path.join(screenshotsPath, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length === 0) {
        await interaction.editReply({
          content: "Keine Screenshots gefunden!",
        });
        return;
      }

      const latestFile = files[0];
      const resizedPath = path.join(screenshotsPath, `resized_${latestFile.name}`);

      // Verkleinere das Bild
      await sharp(latestFile.path)
        .resize(1920, 1080, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(resizedPath);

      // Sende das verkleinerte Bild
      await interaction.editReply({
        content: "Hier ist das letzte aufgenommene Bild:",
        files: [resizedPath],
      });

      // Lösche das temporäre verkleinerte Bild
      fs.unlinkSync(resizedPath);
    } catch (error) {
      console.error("Fehler beim Verarbeiten des letzten Bildes:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "Es gab einen Fehler beim Verarbeiten des Bildes!",
        });
      } else {
        await interaction.editReply({
          content: "Es gab einen Fehler beim Verarbeiten des Bildes!",
        });
      }
    }
  },
};
