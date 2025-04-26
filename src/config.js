require("dotenv").config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  channelId: process.env.CHANNEL_ID,
  screenshotInterval: parseInt(process.env.SCREENSHOT_INTERVAL) || 300000, // 5 Minuten Standard
  postTimes: process.env.POST_TIMES ? process.env.POST_TIMES.split(",") : ["08:00", "20:00"],
  rtspUrl: process.env.RTSP_URL,
};
