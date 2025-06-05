const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
//const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const { spawn } = require("child_process"); // NEU: spawn statt exec

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

  async takeScreenshot() {
    const timestamp = this.getBerlinTimestamp();
    const filename = `screenshot_${timestamp}.png`;
    const tempPath = path.join(this.screenshotsPath, `temp_${filename}`);
    const finalPath = path.join(this.screenshotsPath, filename);
    // prettier-ignore
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        "-rtsp_transport", "tcp",
        "-timeout", "10000000",    // max. 10 Sekunden auf Verbindungsantwort warten
        "-stimeout", "10000000",   // max. 10 Sekunden auf Verbindung selbst
        "-ss", "00:00:01",
        "-i", process.env.RTSP_URL,
        "-frames:v", "1",
        "-c:v", "png",
        "-pix_fmt", "rgb24",
        "-threads", "1",
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
  
      ffmpeg.on("close", (code) => {
        if (code === 0 && fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
          fs.renameSync(tempPath, finalPath);
          console.log(`Screenshot erfolgreich erstellt: ${finalPath}`);
          resolve({
            filename,
            filepath: finalPath,
          });
        } else {
          console.error(`Screenshot fehlgeschlagen (Exit Code ${code})`);
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
      // Optimiere das Bild für Discord
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

      // Überprüfe die Dateigröße
      const stats = fs.statSync(discordPath);
      if (stats.size > 10 * 1024 * 1024) {
        // Größer als 10MB
        // Reduziere die Qualität schrittweise
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
    try {
      const screenshotsDir = this.screenshotsPath;
      const outputPath = path.join(this.timelapsePath, `timelapse_${dayString}.mp4`);

      // Zähle die Screenshots für das Logging
      const screenshots = fs
        .readdirSync(screenshotsDir)
        .filter((file) => file.endsWith(".png") && file.startsWith("screenshot_"));

      console.log(`Gefundene Screenshots: ${screenshots.length}`);
      if (screenshots.length === 0) {
        throw new Error("Keine Screenshots im Verzeichnis gefunden");
      }

      // Erstelle Timelapse mit FFmpeg
      const ffmpegCommand = [
        "ffmpeg -y",
        "-framerate 12",
        "-pattern_type glob",
        `-i "${screenshotsDir}/screenshot_*.png"`,
        "-c:v libx264",
        "-preset slow",
        "-crf 18",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        `"${outputPath}"`,
      ].join(" ");

      await execPromise(ffmpegCommand);

      // Überprüfe die Ausgabedatei
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`Timelapse erfolgreich erstellt: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        throw new Error("Timelapse wurde nicht erstellt");
      }

      // Lösche alle Screenshots
      let deletedCount = 0;
      for (const screenshot of screenshots) {
        try {
          fs.unlinkSync(path.join(screenshotsDir, screenshot));
          deletedCount++;
        } catch (error) {
          console.error(`Fehler beim Löschen des Screenshots ${screenshot}:`, error);
        }
      }
      console.log(`Gelöschte Screenshots: ${deletedCount} von ${screenshots.length}`);

      return outputPath;
    } catch (error) {
      console.error("Fehler beim Erstellen der Timelapse:", error);
      throw error;
    }
  }
}

module.exports = new RTSPStreamService();
