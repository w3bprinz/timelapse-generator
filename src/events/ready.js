const Scheduler = require("../services/scheduler");
const { ActivityType } = require("discord.js");

// Status-Nachrichten für den Rotator
const statusMessages = [
  { type: ActivityType.Watching, text: "🌱 Pflanzenwachstum überwachen" },
  { type: ActivityType.Playing, text: "📸 Screenshots aufnehmen" },
  { type: ActivityType.Playing, text: "⏱️ Timelapse erstellen" },
  { type: ActivityType.Watching, text: "🌿 Daily Weed Pictures" },
  { type: ActivityType.Watching, text: "📊 Wachstumsstatistiken" },
];

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);

    // Initialisiere den Scheduler
    new Scheduler(client);

    let statusIndex = 0;

    // Setze initialen Status nach kurzer Verzögerung
    setTimeout(() => {
      const status = statusMessages[statusIndex];
      client.user.setActivity(status.text, { type: status.type });
    }, 1000);

    // Starte Rotator
    setInterval(() => {
      statusIndex = (statusIndex + 1) % statusMessages.length;
      const status = statusMessages[statusIndex];
      client.user.setActivity(status.text, { type: status.type });
    }, 30000);
  },
};
