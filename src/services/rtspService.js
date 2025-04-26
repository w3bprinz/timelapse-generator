const Stream = require("node-rtsp-stream");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

class RTSPStreamService {
  constructor() {
    this.stream = null;
    this.screenshotsPath = path.join(__dirname, "../../screenshots");
    this.timelapsePath = path.join(__dirname, "../../timelapse");
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

  startStream(rtspUrl) {
    if (this.stream) {
      this.stream.stop();
    }

    this.stream = new Stream({
      name: "timelapse",
      streamUrl: rtspUrl,
      wsPort: 9999,
      ffmpegOptions: {
        "-stats": "",
        "-r": 30,
        "-q:v": "2",
        "-preset": "ultrafast",
        "-tune": "zerolatency",
        "-c:v": "libx264",
        "-pix_fmt": "yuv420p",
        "-b:v": "5000k",
        "-maxrate": "5000k",
        "-bufsize": "10000k",
      },
    });

    return this.stream;
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
      .replace(/[.,]/g, "-")
      .replace(/\s+/g, "_");
  }

  async takeScreenshot() {
    if (!this.stream) {
      throw new Error("Stream nicht initialisiert");
    }

    const timestamp = this.getBerlinTimestamp();
    const filename = `screenshot_${timestamp}.jpg`;
    const tempPath = path.join(this.screenshotsPath, `temp_${filename}`);
    const finalPath = path.join(this.screenshotsPath, filename);

    try {
      // Erstelle Screenshot mit FFmpeg
      await execPromise(`ffmpeg -i ${process.env.RTSP_URL} -vframes 1 -q:v 2 -y ${tempPath}`);

      // Verarbeite das Bild mit Sharp und speichere es in einer neuen Datei
      await sharp(tempPath).jpeg({ quality: 100 }).toFile(finalPath);

      // Lösche die temporäre Datei
      fs.unlinkSync(tempPath);

      return {
        filename,
        filepath: finalPath,
      };
    } catch (error) {
      console.error("Fehler beim Erstellen des Screenshots:", error);
      // Stelle sicher, dass die temporäre Datei gelöscht wird
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  async resizeImage(inputPath, outputPath, width = 800) {
    await sharp(inputPath)
      .resize(width, null, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 100 })
      .toFile(outputPath);
  }

  async createTimelapse(day) {
    const files = fs
      .readdirSync(this.screenshotsPath)
      .filter((file) => file.endsWith(".jpg"))
      .sort();

    if (files.length === 0) {
      throw new Error("Keine Screenshots gefunden");
    }

    const timelapseOutput = path.join(this.timelapsePath, `timelapse_${day}.mp4`);

    const fileListPath = path.join(this.screenshotsPath, "filelist.txt");
    const fileList = files.map((file) => `file '${path.join(this.screenshotsPath, file)}'`).join("\n");
    fs.writeFileSync(fileListPath, fileList);

    try {
      await execPromise(
        `ffmpeg -f concat -safe 0 -i ${fileListPath} -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -y ${timelapseOutput}`
      );

      files.forEach((file) => {
        fs.unlinkSync(path.join(this.screenshotsPath, file));
      });
      fs.unlinkSync(fileListPath);

      return timelapseOutput;
    } catch (error) {
      console.error("Fehler beim Erstellen der Timelapse:", error);
      throw error;
    }
  }
}

module.exports = new RTSPStreamService();
