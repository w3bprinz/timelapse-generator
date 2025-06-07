import cron from "node-cron";
import SnapshotService from "./snapshotService.js";
const snapshotService = new SnapshotService();
import pulseService from "./pulseService.js";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      const result = await snapshotService.takeScreenshot();
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

  async postToDiscord(filepath) {
    try {
      const channel = await this.client.channels.fetch(process.env.SCREENSHOT_CHANNEL_ID);
      const optimizedPath = await snapshotService.optimizeForDiscord(filepath);

      const berlinTime = new Date().toLocaleTimeString("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
      });

      await channel.send({
        content: `Täglicher Screenshot (${berlinTime})`,
        files: [optimizedPath],
      });

      if (fs.existsSync(optimizedPath)) {
        await fs.unlink(optimizedPath);
      }
    } catch (error) {
      console.error("Fehler beim Posten des Screenshots:", error);
    }
  }

  setupSchedules() {
    // Alle 5 Minuten Screenshot erstellen, ggf. um 08:00 und 20:00 posten
    cron.schedule(
      "*/5 * * * *",
      async () => {
        try {
          const result = await this.processScreenshot();
          if (!result) return;

          const now = new Date();
          const hour = now.getHours();
          const minute = now.getMinutes();

          if ((hour === 8 || hour === 20) && minute === 0) {
            await this.postToDiscord(result.filepath);
          }
        } catch (error) {
          console.error("Fehler beim Erstellen des Screenshots:", error);
        }
      },
      { timezone: "Europe/Berlin" }
    );

    // Tägliche Timelapse
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

          await snapshotService.createTimelapse(dayString);
          console.log(`Timelapse für ${dayString} wurde erfolgreich erstellt`);
        } catch (error) {
          console.error("Fehler beim Erstellen der Timelapse:", error);
        }
      },
      { timezone: "Europe/Berlin" }
    );

    // Stündliche Pulse-Daten sammeln
    cron.schedule(
      "0 * * * *",
      async () => {
        try {
          await pulseService.collectPulseData();
          console.log("✅ Pulse-Daten erfolgreich gesammelt.");
        } catch (err) {
          console.error("❌ Fehler beim Sammeln der Pulse-Daten:", err);
        }
      },
      { timezone: "Europe/Berlin" }
    );

    // Tägliches Archivieren
    cron.schedule(
      "0 0 * * *",
      async () => {
        try {
          await pulseService.archiveOldData();
          console.log("📦 Historische Pulse-Daten archiviert.");
        } catch (err) {
          console.error("❌ Fehler beim Archivieren der Pulse-Daten:", err);
        }
      },
      { timezone: "Europe/Berlin" }
    );

    // Charts
    cron.schedule(
      "0 9 * * *",
      async () => {
        try {
          await pulseService.sendChartToDiscord(this.client, 1);
          console.log("📈 Tages-Chart an Discord gesendet");
        } catch (err) {
          console.error("❌ Fehler beim Senden des Tages-Charts:", err);
        }
      },
      { timezone: "Europe/Berlin" }
    );

    cron.schedule(
      "0 9 * * 1",
      async () => {
        try {
          await pulseService.sendChartToDiscord(this.client, 7);
          console.log("📈 Wochen-Chart an Discord gesendet");
        } catch (err) {
          console.error("❌ Fehler beim Senden des Wochen-Charts:", err);
        }
      },
      { timezone: "Europe/Berlin" }
    );

    cron.schedule(
      "0 9 1 * *",
      async () => {
        try {
          await pulseService.sendChartToDiscord(this.client, 30);
          console.log("📈 Monats-Chart an Discord gesendet");
        } catch (err) {
          console.error("❌ Fehler beim Senden des Monats-Charts:", err);
        }
      },
      { timezone: "Europe/Berlin" }
    );
  }
}

export default Scheduler;
