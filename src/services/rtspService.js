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

  async startStream(rtspUrl) {
    if (this.stream) {
      this.stream.stop();
    }

    this.stream = new Stream({
      name: "timelapse",
      streamUrl: rtspUrl,
      wsPort: 9999,
      ffmpegOptions: {
        // RTSP-Optionen
        "-rtsp_transport": "tcp",
        "-analyzeduration": "10000000",
        "-probesize": "5000000",
        "-fflags": "+nobuffer+fastseek+igndts",
        "-flags": "low_delay",
        "-strict": "experimental",

        // H.264-Dekodierung
        "-c:v": "h264",
        "-pix_fmt": "yuv420p",
        "-preset": "veryfast",
        "-tune": "zerolatency",
        "-x264-params": [
          "keyint=30",
          "min-keyint=30",
          "scenecut=0",
          "threads=4",
          "sliced-threads=1",
          "no-cabac=1",
          "no-8x8dct=1",
          "no-weightb=1",
          "no-mbtree=1",
          "sync-lookahead=0",
          "rc-lookahead=0",
        ].join(":"),

        // Performance-Optionen
        "-threads": "4",
        "-r": "15",
        "-b:v": "4000k",
        "-maxrate": "5000k",
        "-bufsize": "8000k",
        "-max_delay": "500000",
        "-reorder_queue_size": "0",

        // Debug-Optionen
        "-stats": "",
        "-loglevel": "warning",
      },
    });

    // Warte kurz, bis der Stream stabil ist
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  stopStream() {
    if (this.stream) {
      this.stream.stop();
      this.stream = null;
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
      .replace(/[.,]/g, "-")
      .replace(/\s+/g, "_");
  }

  async takeScreenshot() {
    try {
      // Starte den Stream
      await this.startStream(process.env.RTSP_URL);

      const timestamp = this.getBerlinTimestamp();
      const filename = `screenshot_${timestamp}.jpg`;
      const tempPath = path.join(this.screenshotsPath, `temp_${filename}`);
      const finalPath = path.join(this.screenshotsPath, filename);

      // Erstelle Screenshot mit FFmpeg
      const ffmpegCommand = [
        "ffmpeg -y",
        "-rtsp_transport tcp",
        "-analyzeduration 10000000",
        "-probesize 5000000",
        `-i "${process.env.RTSP_URL}"`,
        "-frames:v 1",
        "-c:v h264",
        "-preset veryfast",
        "-tune zerolatency",
        '-x264-params "keyint=30:min-keyint=30:scenecut=0:threads=4:sliced-threads=1:no-cabac=1:no-8x8dct=1:no-weightb=1:no-mbtree=1"',
        `"${tempPath}"`,
      ].join(" ");

      await execPromise(ffmpegCommand);

      // Verarbeite das Bild mit Sharp
      await sharp(tempPath).jpeg({ quality: 100 }).toFile(finalPath);

      // Lösche die temporäre Datei
      fs.unlinkSync(tempPath);

      // Stoppe den Stream
      this.stopStream();

      return {
        filename,
        filepath: finalPath,
      };
    } catch (error) {
      // Stelle sicher, dass der Stream gestoppt wird, auch bei Fehlern
      this.stopStream();
      console.error("Fehler beim Erstellen des Screenshots:", error);
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
