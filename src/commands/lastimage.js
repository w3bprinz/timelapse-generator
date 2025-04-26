const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs").promises; // <-- Promises-API benutzen
const path = require("path");
const sharp = require("sharp");

module.exports = {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Zeigt das letzte aufgenommene Bild an"),

  async execute(interaction) {
    await interaction.deferReply();

    const screenshotsPath = "/app/screenshots";

    try {
      // Prüfen, ob Screenshot-Ordner existiert
      await fs.access(screenshotsPath).catch(() => {
        throw new Error("Kein Screenshot-Ordner gefunden!");
      });

      // Dateien lesen und nach Änderungsdatum sortieren
      const allFiles = await fs.readdir(screenshotsPath);
      const pngFiles = [];

      for (const file of allFiles) {
        if (file.endsWith(".png")) {
          const filePath = path.join(screenshotsPath, file);
          const stats = await fs.stat(filePath);
          pngFiles.push({
            name: file,
            path: filePath,
            time: stats.mtime.getTime(),
          });
        }
      }

      if (pngFiles.length === 0) {
        await interaction.editReply({
          content: "Keine Screenshots gefunden!",
        });
        return;
      }

      // Neueste Datei bestimmen
      pngFiles.sort((a, b) => b.time - a.time);
      const latestFile = pngFiles[0];
      const resizedPath = path.join(screenshotsPath, `resized_${latestFile.name}`);

      // Bild verkleinern
      await sharp(latestFile.path)
        .resize(1920, 1080, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(resizedPath);

      // Antwort mit Bild schicken
      await interaction.editReply({
        content: "Hier ist das letzte aufgenommene Bild:",
        files: [resizedPath],
      });

      // Aufräumen
      await fs.unlink(resizedPath);
    } catch (error) {
      console.error("Fehler:", error.message || error);
      try {
        await interaction.editReply({
          content: `Fehler: ${error.message || "Unbekannter Fehler"}`,
        });
      } catch (editError) {
        console.error("Konnte Fehler nicht an Interaction senden:", editError);
        // Hier nichts mehr tun, Interaction ist dann halt tot
      }
    }
  },
};
