const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { channelId, rtspUrl } = require("../config");
const ffmpeg = require("fluent-ffmpeg");
const { Client } = require("discord.js");

// Konfiguriere ffmpeg
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");

// Erstellt einen Screenshot vom RTSP-Stream
async function createScreenshot(rtspUrl) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join("/app/screenshots", `screenshot-${timestamp}.jpg`);

  return new Promise((resolve, reject) => {
    ffmpeg(rtspUrl)
      .inputOptions([
        "-rtsp_transport tcp", // Verwende TCP statt UDP
        "-stimeout 5000000", // Erhöhe Timeout auf 5 Sekunden
        "-re", // Lese Input in Echtzeit
        "-analyzeduration 100M", // Erhöhe Analyse-Dauer
        "-probesize 100M", // Erhöhe Probe-Größe
        "-fflags +genpts", // Generiere fehlende PTS
        "-flags low_delay", // Reduziere Verzögerung
        "-strict experimental", // Erlaube experimentelle Codecs
      ])
      .outputOptions([
        "-frames:v 1", // Nimm nur einen Frame
        "-q:v 2", // Hohe Qualität
        "-y", // Überschreibe existierende Dateien
      ])
      .on("end", () => {
        console.log("Screenshot erstellt:", outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Fehler beim Erstellen des Screenshots:", err);
        reject(err);
      })
      .save(outputPath);
  });
}

// Postet einen Screenshot in den Discord-Kanal
async function postScreenshot(client, filepath) {
  const channel = await client.channels.fetch(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  await channel.send({
    files: [
      {
        attachment: filepath,
        name: path.basename(filepath),
      },
    ],
  });
}

// Erstellt ein Timelapse-Video aus den Screenshots
async function createTimelapse() {
  const date = new Date().toISOString().split("T")[0];
  const outputFile = path.join("/app/timelapses", `timelapse_${date}.mp4`);
  const screenshots = fs
    .readdirSync("/app/screenshots")
    .filter((file) => file.startsWith("screenshot_"))
    .sort();

  if (screenshots.length === 0) {
    throw new Error("No screenshots found");
  }

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-framerate",
      "30",
      "-pattern_type",
      "glob",
      "-i",
      path.join("/app/screenshots", "screenshot_*.jpg"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      outputFile,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        // Lösche die Screenshots nach erfolgreicher Timelapse-Erstellung
        screenshots.forEach((file) => {
          fs.unlinkSync(path.join("/app/screenshots", file));
        });
        resolve(outputFile);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.stderr.on("data", (data) => {
      console.error(`FFmpeg stderr: ${data}`);
    });
  });
}

module.exports = {
  createScreenshot,
  postScreenshot,
  createTimelapse,
};
