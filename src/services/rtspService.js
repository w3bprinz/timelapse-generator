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
        "-stimeout": "5000000",
        "-reorder_queue_size": "0",
        "-max_delay": "2000000",
        "-analyzeduration": "10000000",
        "-probesize": "5000000",
        "-fflags": "+nobuffer+fastseek+igndts",
        "-flags": "low_delay",
        "-strict": "experimental",

        // HEVC-Dekodierung
        "-c:v": "hevc",
        "-pix_fmt": "yuv420p",
        "-preset": "ultrafast",
        "-tune": "zerolatency",
        "-x265-params": "keyint=30:min-keyint=30:scenecut=0:no-open-gop=1:no-sao=1:no-strong-intra-smoothing=1",

        // Performance-Optionen
        "-threads": "1",
        "-r": "15",
        "-b:v": "4000k",
        "-maxrate": "5000k",
        "-bufsize": "8000k",

        // Debug-Optionen
        "-stats": "",
        "-loglevel": "warning",
      },
    });

    // Warte länger, bis der Stream stabil ist
    await new Promise((resolve) => setTimeout(resolve, 5000));
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
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .replace(/(\d{2}):(\d{2}):(\d{2})/, "$1-$2-$3")
      .replace(/\s+/g, "_");
  }

  async takeScreenshot() {
    const timestamp = this.getBerlinTimestamp();
    const filename = `screenshot_${timestamp}.png`;
    const tempPath = path.join(this.screenshotsPath, `temp_${filename}`);
    const finalPath = path.join(this.screenshotsPath, filename);

    // Versuche bis zu 3 Mal, ein gutes Bild zu bekommen
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Versuch ${attempt}: Erstelle Screenshot...`);

      try {
        // Warte 2 Sekunden, um den Stream zu stabilisieren
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Erstelle Screenshot mit verbesserten Parametern
        const ffmpegCommand = [
          "ffmpeg -y",
          "-rtsp_transport tcp",
          "-stimeout 5000000",
          "-reorder_queue_size 0",
          "-max_delay 2000000",
          "-analyzeduration 10000000",
          "-probesize 5000000",
          `-i "${process.env.RTSP_URL}"`,
          "-frames:v 1",
          "-c:v hevc",
          "-preset ultrafast",
          "-tune zerolatency",
          "-pix_fmt yuv420p",
          '-x265-params "keyint=30:min-keyint=30:scenecut=0:no-open-gop=1:no-sao=1:no-strong-intra-smoothing=1"',
          "-threads 1",
          `"${tempPath}"`,
        ].join(" ");

        await execPromise(ffmpegCommand);

        // Überprüfe, ob das Bild gültig ist
        if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 0) {
          // Überprüfe die Bildqualität mit ffprobe
          const ffprobeCommand = [
            "ffprobe",
            "-v error",
            "-select_streams v:0",
            "-show_entries stream=width,height",
            "-of csv=p=0",
            `"${tempPath}"`,
          ].join(" ");

          const { stdout } = await execPromise(ffprobeCommand);

          if (stdout.trim()) {
            // Bild ist gültig, verschiebe es an den endgültigen Ort
            fs.renameSync(tempPath, finalPath);
            console.log(`Screenshot erfolgreich erstellt: ${finalPath}`);

            return {
              filename,
              filepath: finalPath,
            };
          }
        }

        // Warte 2 Sekunden vor dem nächsten Versuch
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Fehler bei Versuch ${attempt}:`, error);
        // Warte 2 Sekunden vor dem nächsten Versuch
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Lösche temporäre Datei, falls vorhanden
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    throw new Error("Konnte keinen gültigen Screenshot erstellen");
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
