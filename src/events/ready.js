import Scheduler from "../services/scheduler.js";
import { ActivityType } from "discord.js";

const statusMessages = [
  { type: ActivityType.Watching, text: "👀 {GROWER_COUNT} Growern zu" },
  { type: ActivityType.Watching, text: "🌱 Pflanzenwachstum überwachen" },
  { type: ActivityType.Playing, text: "📸 Screenshots aufnehmen" },
  { type: ActivityType.Playing, text: "⏱️ Timelapse erstellen" },
  { type: ActivityType.Watching, text: "🌿 Daily Weed Pictures" },
  { type: ActivityType.Watching, text: "📊 Wachstumsstatistiken" },
  ...(process.env.STREAM_URL
    ? [
        {
          type: ActivityType.Streaming,
          text: "🌿 Pflanzenwachstum",
          url: process.env.STREAM_URL,
        },
      ]
    : []),
];

export default {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);

    new Scheduler(client);

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
      console.error("Guild nicht gefunden. Bitte GUILD_ID prüfen.");
      return;
    }

    let statusIndex = 0;

    const updateStatus = async () => {
      try {
        const memberCount = guild.memberCount;
        const statusTemplate = statusMessages[statusIndex];
        let statusText = statusTemplate.text.replace("{GROWER_COUNT}", memberCount);

        if (statusTemplate.type === ActivityType.Streaming) {
          client.user.setActivity(statusText, {
            type: statusTemplate.type,
            url: statusTemplate.url,
          });
        } else {
          client.user.setActivity(statusText, { type: statusTemplate.type });
        }

        statusIndex = (statusIndex + 1) % statusMessages.length;
      } catch (error) {
        console.error("Fehler beim Aktualisieren des Status:", error);
      }
    };

    setTimeout(updateStatus, 1000);
    setInterval(updateStatus, 30000);
  },
};
