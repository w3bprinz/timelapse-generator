const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { spawn } = require("child_process");

class RTSPStreamService {
  constructor() {
    this.screenshotsPath = path.join(__dirname, "../../screenshots");
    this.timelapsePath = path.join(__dirname, "../../timelapses");
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

  async validateScreenshot(filepath) {
    try {
      const stats = fs.statSync(filepath);
      if (stats.size < 500000) return false;
      const metadata = await sharp(filepath).metadata();
      return metadata.width > 0 && metadata.height > 0;
    } catch (err) {
      console.error("Sharp-Fehler beim Validieren:", err.message);
      return false;
    }
  }

  async takeScreenshot() {
    const timestamp = this.getBerlinTimestamp();
    const filename = `screenshot_${timestamp}.png`;
    const tempPath = path.join(this.screenshotsPath, `temp_${filename}`);
    const finalPath = path.join(this.screenshotsPath, filename);

    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        "-rtsp_transport",
        "tcp",
        "-timeout",
        "10000000",
        "-analyzeduration",
        "50000000",
        "-probesize",
        "50000000",
        "-ss",
        "00:00:05", // 5 Sekunden überspringen
        "-i",
        process.env.RTSP_URL,
        "-frames:v",
        "1", // genau 1 Frame speichern
        "-fps_mode",
        "vfr",
        "-c:v",
        "png",
        "-pix_fmt",
        "rgb24",
        "-threads",
        "1",
        "-y",
        tempPath,
      ];

      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.stderr.on("data", (data) => {
        console.log(`[ffmpeg stderr] ${data}`);
      });

      ffmpeg.on("error", (err) => {
        console.error("FFmpeg Prozessfehler:", err);
        reject(err);
      });

      ffmpeg.on("close", async (code) => {
        if (code === 0 && fs.existsSync(tempPath)) {
          const isValid = await this.validateScreenshot(tempPath);
          if (isValid) {
            fs.renameSync(tempPath, finalPath);
            resolve({ filename, filepath: finalPath });
          } else {
            fs.unlinkSync(tempPath);
            reject(new Error("Screenshot ungültig"));
          }
        } else {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          reject(new Error("Screenshot konnte nicht erstellt werden"));
        }
      });
    });
  }

  async optimizeForDiscord(imagePath) {
    const timestamp = this.getBerlinTimestamp();
    const discordPath = path.join(this.screenshotsPath, `discord_temp_${timestamp}.png`);

    try {
      await sharp(imagePath)
        .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
        .png({ quality: 100, compressionLevel: 0 })
        .toFile(discordPath);

      let stats = fs.statSync(discordPath);
      let quality = 100;

      while (stats.size > 10 * 1024 * 1024 && quality > 50) {
        quality -= 10;
        await sharp(imagePath)
          .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
          .png({ quality, compressionLevel: 0 })
          .toFile(discordPath);
        stats = fs.statSync(discordPath);
      }

      return discordPath;
    } catch (error) {
      console.error("Fehler beim Optimieren des Bildes für Discord:", error);
      throw error;
    }
  }

  async createTimelapse(dayString) {
    const outputPath = path.join(this.timelapsePath, `timelapse_${dayString}.mp4`);
    const screenshots = fs
      .readdirSync(this.screenshotsPath)
      .filter((file) => file.startsWith("screenshot_") && file.endsWith(".png"));

    if (screenshots.length === 0) throw new Error("Keine Screenshots gefunden");

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-framerate",
      "12",
      "-pattern_type",
      "glob",
      "-i",
      `${this.screenshotsPath}/screenshot_*.png`,
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
    ]);

    return new Promise((resolve, reject) => {
      ffmpeg.stderr.on("data", (data) => console.log(`[ffmpeg stderr] ${data}`));

      ffmpeg.on("close", (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          screenshots.forEach((file) => {
            try {
              fs.unlinkSync(path.join(this.screenshotsPath, file));
            } catch (err) {
              console.warn(`Fehler beim Löschen von ${file}:`, err);
            }
          });
          resolve(outputPath);
        } else {
          reject(new Error("Timelapse konnte nicht erstellt werden"));
        }
      });
    });
  }
}

module.exports = new RTSPStreamService();
