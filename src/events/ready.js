const { createScreenshot, postScreenshot, createTimelapse } = require("../utils/screenshot");
const { formatUptime } = require("../utils/formatUptime");
const { channelId, screenshotInterval, postTimes } = require("../config");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);

    // Starte den Screenshot-Timer
    setInterval(async () => {
      try {
        const filepath = await createScreenshot();
        await postScreenshot(client, filepath);
      } catch (error) {
        console.error("Fehler beim Erstellen/Posten des Screenshots:", error);
      }
    }, screenshotInterval);

    // Prüfe stündlich, ob es Zeit für einen Timelapse ist
    setInterval(async () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      if (postTimes.includes(currentTime)) {
        try {
          const filepath = await createTimelapse();
          const channel = await client.channels.fetch(channelId);
          await channel.send({
            content: `Tägliches Timelapse-Video für ${now.toLocaleDateString()}`,
            files: [
              {
                attachment: filepath,
                name: path.basename(filepath),
              },
            ],
          });
        } catch (error) {
          console.error("Fehler beim Erstellen/Posten des Timelapse-Videos:", error);
        }
      }
    }, 60000); // Prüfe jede Minute

    // Setze den Bot-Status
    client.user.setActivity("Timelapse Generator", { type: "PLAYING" });
  },
};
