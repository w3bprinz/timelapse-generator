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
  const outputPath = path.join("/app/screenshots", `screenshot-${timestamp}.png`);

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

module.exports = {
  createScreenshot,
  postScreenshot,
};
