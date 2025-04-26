const cron = require("node-cron");
const rtspService = require("./rtspService");
const { Client } = require("discord.js");

class Scheduler {
  constructor(client) {
    this.client = client;
    this.setupSchedules();
  }

  setupSchedules() {
    // Screenshot alle 5 Minuten
    cron.schedule(
      "*/5 * * * *",
      async () => {
        try {
          const { filepath } = await rtspService.takeScreenshot();
          console.log(`Screenshot erstellt: ${filepath}`);
        } catch (error) {
          console.error("Fehler beim Erstellen des Screenshots:", error);
        }
      },
      {
        timezone: "Europe/Berlin",
      }
    );

    // Screenshot-Posting um 8 und 20 Uhr
    cron.schedule(
      "0 8,20 * * *",
      async () => {
        try {
          const channel = await this.client.channels.fetch(process.env.SCREENSHOT_CHANNEL_ID);
          const { filepath } = await rtspService.takeScreenshot();

          // Bild verkleinern
          const resizedPath = filepath.replace(".jpg", "_resized.jpg");
          await rtspService.resizeImage(filepath, resizedPath);

          const berlinTime = new Date().toLocaleTimeString("de-DE", {
            timeZone: "Europe/Berlin",
            hour: "2-digit",
            minute: "2-digit",
          });

          await channel.send({
            content: `Täglicher Screenshot (${berlinTime})`,
            files: [resizedPath],
          });
        } catch (error) {
          console.error("Fehler beim Posten des Screenshots:", error);
        }
      },
      {
        timezone: "Europe/Berlin",
      }
    );

    // Timelapse-Erstellung um Mitternacht
    cron.schedule(
      "0 0 * * *",
      async () => {
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const dayString = yesterday
            .toLocaleDateString("de-DE", {
              timeZone: "Europe/Berlin",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .replace(/\./g, "-");

          const timelapsePath = await rtspService.createTimelapse(dayString);
          const channel = await this.client.channels.fetch(process.env.SCREENSHOT_CHANNEL_ID);

          await channel.send({
            content: `Timelapse für ${dayString}`,
            files: [timelapsePath],
          });
        } catch (error) {
          console.error("Fehler beim Erstellen der Timelapse:", error);
        }
      },
      {
        timezone: "Europe/Berlin",
      }
    );
  }
}

module.exports = Scheduler;
