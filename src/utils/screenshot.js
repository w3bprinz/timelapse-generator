const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { channelId, rtspUrl } = require("../config");

// Erstellt einen Screenshot vom RTSP-Stream
async function createScreenshot() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `screenshot_${timestamp}.jpg`;
  const filepath = path.join("/app/screenshots", filename);

  console.log("Verwende RTSP-URL:", rtspUrl);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ["-i", rtspUrl, "-vframes", "1", "-q:v", "2", filepath]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(filepath);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.stderr.on("data", (data) => {
      console.error(`FFmpeg stderr: ${data}`);
    });
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
