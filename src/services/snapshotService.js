const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const fetch = require("node-fetch");
const { spawn } = require("child_process");

class SnapshotService {
  constructor() {
    this.screenshotsPath = path.join(__dirname, "../../screenshots");
    this.timelapsePath = path.join(__dirname, "../../timelapses");
  }

  getBerlinTimestamp() {
    const now = new Date();
    return now
      .toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .replace(/(\d{2}):(\d{2}):(\d{2})/, "$1-$2-$3")
      .replace(/\s+/g, "_")
      .replace(/,/g, "");
  }

  async takeScreenshot() {
    const timestamp = this.getBerlinTimestamp();
    const jpgPath = path.join(this.screenshotsPath, `screenshot_${timestamp}.jpg`);
    const pngPath = path.join(this.screenshotsPath, `screenshot_${timestamp}.png`);
    const snapshotUrl = `http://${process.env.REOLINK_HOST}/cgi-bin/api.cgi?cmd=Snap&channel=0&rs=${Date.now()}&user=${
      process.env.REOLINK_USER
    }&password=${process.env.REOLINK_PASS}`;

    try {
      const res = await fetch(snapshotUrl);
      if (!res.ok || !res.body) throw new Error(`HTTP Error: ${res.status}`);

      const fileStream = fs.createWriteStream(jpgPath);
      await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
      });

      // Convert to PNG and remove original JPG
      await sharp(jpgPath).png().toFile(pngPath);
      fs.unlinkSync(jpgPath);

      const stats = fs.statSync(pngPath);
      if (stats.size < 150 * 1024) {
        console.warn(`⚠️ Screenshot ungültig (Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
        fs.unlinkSync(pngPath);
        return null;
      }

      return pngPath;
    } catch (error) {
      console.error("❌ Fehler beim Abrufen des Snapshots:", error);
      return null;
    }
  }

  async optimizeForDiscord(imagePath) {
    const timestamp = this.getBerlinTimestamp();
    const discordPath = path.join(this.screenshotsPath, `discord_temp_${timestamp}.png`);

    try {
      let quality = 100;
      let optimized = false;

      while (!optimized && quality >= 50) {
        await sharp(imagePath)
          .resize(1920, 1080, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .png({ quality, compressionLevel: 0 })
          .toFile(discordPath);

        const stats = fs.statSync(discordPath);
        if (stats.size <= 8 * 1024 * 1024) {
          optimized = true;
        } else {
          quality -= 10;
        }
      }

      return optimized ? discordPath : null;
    } catch (error) {
      console.error("❌ Fehler bei der Discord-Optimierung:", error);
      return null;
    }
  }

  async createTimelapse(dayString) {
    const screenshotsDir = this.screenshotsPath;
    const outputPath = path.join(this.timelapsePath, `timelapse_${dayString}.mp4`);

    return new Promise((resolve, reject) => {
      const screenshots = fs
        .readdirSync(screenshotsDir)
        .filter((file) => file.endsWith(".png") && file.startsWith("screenshot_"));

      console.log(`Gefundene Screenshots: ${screenshots.length}`);
      if (screenshots.length === 0) {
        return reject(new Error("Keine Screenshots im Verzeichnis gefunden"));
      }

      const ffmpegArgs = [
        "-y",
        "-framerate",
        "12",
        "-pattern_type",
        "glob",
        "-i",
        `${screenshotsDir}/screenshot_*.png`,
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        outputPath,
      ];

      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.stderr.on("data", (data) => {
        console.log(`[ffmpeg stderr] ${data}`);
      });

      ffmpeg.on("error", (err) => {
        console.error("FFmpeg Prozessfehler:", err);
        reject(err);
      });

      ffmpeg.on("close", (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`🎞️ Timelapse erstellt: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

          for (const screenshot of screenshots) {
            try {
              fs.unlinkSync(path.join(screenshotsDir, screenshot));
            } catch (error) {
              console.error(`❌ Fehler beim Löschen von ${screenshot}:`, error);
            }
          }

          resolve(outputPath);
        } else {
          console.error(`🚫 Timelapse fehlgeschlagen (Exit Code ${code})`);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          reject(new Error("Timelapse konnte nicht erstellt werden"));
        }
      });
    });
  }
}

module.exports = SnapshotService;
