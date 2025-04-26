const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Zeigt das letzte aufgenommene Bild an"),

  async execute(interaction) {
    // Sende sofort eine Antwort
    const reply = await interaction.reply({
      content: "Suche nach dem letzten Bild...",
      fetchReply: true,
    });

    try {
      const screenshotsPath = "/app/screenshots";

      // Prüfe, ob der Screenshot-Ordner existiert
      if (!fs.existsSync(screenshotsPath)) {
        await reply.edit({
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
        await reply.edit({
          content: "Keine Screenshots gefunden!",
        });
        return;
      }

      const latestFile = files[0];
      const resizedPath = path.join(screenshotsPath, `resized_${latestFile.name}`);

      // Aktualisiere die Nachricht
      await reply.edit({
        content: "Verarbeite das Bild...",
      });

      // Verkleinere das Bild
      await sharp(latestFile.path)
        .resize(1920, 1080, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(resizedPath);

      // Sende das verkleinerte Bild
      await reply.edit({
        content: "Hier ist das letzte aufgenommene Bild:",
        files: [resizedPath],
      });

      // Lösche das temporäre verkleinerte Bild
      fs.unlinkSync(resizedPath);
    } catch (error) {
      console.error("Fehler beim Verarbeiten des letzten Bildes:", error);
      try {
        await reply.edit({
          content: "Es gab einen Fehler beim Verarbeiten des Bildes!",
        });
      } catch (editError) {
        console.error("Fehler beim Aktualisieren der Nachricht:", editError);
      }
    }
  },
};
