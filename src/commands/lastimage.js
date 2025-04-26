const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Zeigt das letzte aufgenommene Bild an"),

  async execute(interaction) {
    // Da die Verarbeitung länger als 3 Sekunden dauern kann, verwenden wir deferReply
    await interaction.deferReply();

    try {
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

      // Aktualisiere die Nachricht
      await interaction.editReply({
        content: "Verarbeite das Bild...",
      });

      // Verarbeite das Bild
      const latestFile = files[0];
      const resizedPath = path.join(screenshotsPath, `resized_${latestFile.name}`);

      try {
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
      } catch (processError) {
        console.error("Fehler bei der Bildverarbeitung:", processError);
        await interaction.editReply({
          content: "Es gab einen Fehler bei der Bildverarbeitung!",
        });
      }
    } catch (error) {
      console.error("Fehler beim Verarbeiten des letzten Bildes:", error);
      await interaction.editReply({
        content: "Es gab einen Fehler beim Verarbeiten des Bildes!",
      });
    }
  },
};
