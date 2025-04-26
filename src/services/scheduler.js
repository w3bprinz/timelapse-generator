const cron = require("node-cron");
const rtspService = require("./rtspService");
const { Client } = require("discord.js");
const fs = require("fs");
const fsPromises = require("fs").promises;

class Scheduler {
  constructor(client) {
    this.client = client;
    this.isProcessing = false;
    this.setupSchedules();
  }

  async processScreenshot() {
    if (this.isProcessing) {
      console.log("Screenshot-Verarbeitung läuft bereits, überspringe...");
      return null;
    }

    this.isProcessing = true;
    try {
      const result = await rtspService.takeScreenshot();
      if (!result || !result.filepath || !fs.existsSync(result.filepath)) {
        console.error("Screenshot ist ungültig oder existiert nicht:", result);
        return null;
      }
      return result;
    } catch (error) {
      console.error("Fehler in processScreenshot:", error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  setupSchedules() {
    // Screenshot alle 6 Minuten
    cron.schedule(
      "*/6 * * * *",
      async () => {
        try {
          const result = await this.processScreenshot();
          if (!result) {
            console.log("Kein Screenshot erstellt, überspringe...");
            return;
          }
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
      "50 8,22 * * *",
      async () => {
        try {
          const result = await this.processScreenshot();
          if (!result) {
            console.log("Kein Screenshot erstellt, überspringe...");
            return;
          }

          const channel = await this.client.channels.fetch(process.env.SCREENSHOT_CHANNEL_ID);

          // Bild für Discord optimieren
          const optimizedPath = await rtspService.optimizeForDiscord(result.filepath);

          const berlinTime = new Date().toLocaleTimeString("de-DE", {
            timeZone: "Europe/Berlin",
            hour: "2-digit",
            minute: "2-digit",
          });

          await channel.send({
            content: `Täglicher Screenshot (${berlinTime})`,
            files: [optimizedPath],
          });

          // Lösche das temporäre optimierte Bild
          try {
            if (fs.existsSync(optimizedPath)) {
              await fsPromises.unlink(optimizedPath);
            }
          } catch (unlinkError) {
            console.error("Fehler beim Löschen der temporären Datei:", unlinkError);
          }
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
