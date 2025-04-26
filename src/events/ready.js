const Scheduler = require("../services/scheduler");

// Status-Nachrichten für den Rotator
const statusMessages = [
  { type: "WATCHING", text: "🌱 Pflanzenwachstum überwachen" },
  { type: "PLAYING", text: "📸 Screenshots aufnehmen" },
  { type: "PLAYING", text: "⏱️ Timelapse erstellen" },
  { type: "WATCHING", text: "🌿 Daily Weed Pictures" },
  { type: "WATCHING", text: "📊 Wachstumsstatistiken" },
];

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);

    // Initialisiere den Scheduler
    new Scheduler(client);

    // Status-Rotator
    let statusIndex = 0;
    setInterval(() => {
      const status = statusMessages[statusIndex];
      client.user.setActivity(status.text, { type: status.type });
      statusIndex = (statusIndex + 1) % statusMessages.length;
    }, 30000); // Ändere Status alle 30 Sekunden

    // Setze initialen Status
    const initialStatus = statusMessages[0];
    client.user.setActivity(initialStatus.text, { type: initialStatus.type });
  },
};
