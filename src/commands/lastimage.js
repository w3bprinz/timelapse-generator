import { SlashCommandBuilder } from "discord.js";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

export default {
  data: new SlashCommandBuilder().setName("lastimage").setDescription("Zeigt das letzte aufgenommene Bild an"),

  async execute(interaction) {
    await interaction.deferReply();

    const screenshotsPath = "/app/screenshots";

    try {
      await fs.access(screenshotsPath).catch(() => {
        throw new Error("Kein Screenshot-Ordner gefunden!");
      });

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

      pngFiles.sort((a, b) => b.time - a.time);
      const latestFile = pngFiles[0];
      const resizedPath = path.join(screenshotsPath, `resized_${latestFile.name}`);

      await sharp(latestFile.path)
        .resize(1920, 1080, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(resizedPath);

      const buffer = await fs.readFile(resizedPath);

      await interaction.editReply({
        content: `🖼️ Letzter Screenshot: \`${latestFile.name}\``,
        files: [{ attachment: buffer, name: latestFile.name }],
      });

      await fs.unlink(resizedPath);
    } catch (error) {
      console.error("Fehler:", error.message || error);
      try {
        await interaction.editReply({
          content: `Fehler: ${error.message || "Unbekannter Fehler"}`,
        });
      } catch (editError) {
        console.error("Konnte Fehler nicht an Interaction senden:", editError);
      }
    }
  },
};
