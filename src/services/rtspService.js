const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { spawn } = require("child_process");

class RTSPStreamService {
  constructor() {
    this.screenshotsPath = path.join(__dirname, "././screenshots");
    this.timelapsePath = path.join(__dirname, "././timelapses");
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.screenshotsPath)) {
      fs.mkdirSync(this.screenshotsPath, { recursive: true });
    }
    if (!fs.existsSync(this.timelapsePath)) {
      fs.mkdirSync(this.timelapsePath, { recursive: true });
    }
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

  async takeScreenshot(retries = 0) {
    const timestamp = this.getBerlinTimestamp();
    const filename = `screenshot_${timestamp}.png`;
    const tempPath = path.join(this.screenshotsPath, `temp_${filename}`);
    const finalPath = path.join(this.screenshotsPath, filename);

    const ffmpegArgs = [
      "-rtsp_transport",
      "tcp",
      "-timeout",
      "10000000",
      "-analyzeduration",
      "50000000",
      "-probesize",
      "50000000",
      "-i",
      process.env.RTSP_URL,
      "-t",
      "7", // 5 Sekunden lesen
      "-vf",
      "select='eq(pict_type\\,I)'",
      "-fps_mode",
      "vfr",
      "-frames:v",
      "1",
      "-c:v",
      "png",
      "-pix_fmt",
      "rgb24",
      "-threads",
      "1",
      "-y",
      tempPath,
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.stderr.on("data", (data) => {
        console.log(`[ffmpeg stderr] ${data}`);
      });

      ffmpeg.on("error", (err) => {
        console.error("FFmpeg Prozessfehler:", err);
        reject(err);
      });

      ffmpeg.on("close", (code) => {
        const exists = fs.existsSync(tempPath);
        const size = exists ? fs.statSync(tempPath).size : 0;

        const valid = code === 0 && exists && size > 3 * 1024 * 1024 && size < 25 * 1024 * 1024;

        if (valid) {
          fs.renameSync(tempPath, finalPath);
          console.log(`✅ Screenshot erfolgreich erstellt: ${finalPath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
          resolve({ filename, filepath: finalPath });
        } else {
          if (exists) fs.unlinkSync(tempPath);
          console.warn(`⚠️ Screenshot ungültig (Size: ${(size / 1024).toFixed(1)} KB, Retry: ${retries})`);
          if (retries < 2) {
            return this.takeScreenshot(retries + 1)
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error("❌ Screenshot konnte nach 3 Versuchen nicht erstellt werden"));
          }
        }
      });
    });
  }

  async optimizeForDiscord(imagePath) {
    const timestamp = this.getBerlinTimestamp();
    const discordPath = path.join(this.screenshotsPath, `discord_temp_${timestamp}.png`);

    try {
      await sharp(imagePath)
        .resize(1920, 1080, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({
          quality: 100,
          compressionLevel: 0,
        })
        .toFile(discordPath);

      const stats = fs.statSync(discordPath);
      if (stats.size > 10 * 1024 * 1024) {
        let quality = 100;
        while (stats.size > 10 * 1024 * 1024 && quality > 50) {
          quality -= 10;
          await sharp(imagePath)
            .resize(1920, 1080, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .png({
              quality: quality,
              compressionLevel: 0,
            })
            .toFile(discordPath);
        }
      }

      return discordPath;
    } catch (error) {
      console.error("Fehler beim Optimieren des Bildes für Discord:", error);
      throw error;
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

module.exports = new RTSPStreamService();
