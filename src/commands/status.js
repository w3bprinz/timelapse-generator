const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const os = require("os");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder().setName("status").setDescription("Zeigt den aktuellen Status des Bots an"),
  async execute(interaction) {
    try {
      // Berechne die Latenz
      const latency = Math.round(interaction.client.ws.ping);

      // Hole Systeminformationen
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = ((usedMemory / totalMemory) * 100).toFixed(2);

      // Hole Screenshot-Informationen
      const screenshotsPath = "/app/screenshots";
      const timelapsePath = "/app/timelapses";

      const screenshotCount = fs.existsSync(screenshotsPath)
        ? fs.readdirSync(screenshotsPath).filter((file) => file.endsWith(".png")).length
        : 0;

      const timelapseCount = fs.existsSync(timelapsePath)
        ? fs.readdirSync(timelapsePath).filter((file) => file.endsWith(".mp4")).length
        : 0;

      // Erstelle das Embed
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Bot Status")
        .setDescription("Aktuelle Informationen über den Bot")
        .addFields(
          { name: "Ping", value: `${latency}ms`, inline: true },
          { name: "API Latenz", value: `${latency}ms`, inline: true },
          { name: "Uptime", value: this.formatUptime(process.uptime()), inline: true },
          { name: "Speichernutzung", value: `${memoryUsage}%`, inline: true },
          { name: "Screenshots", value: `${screenshotCount}`, inline: true },
          { name: "Timelapses", value: `${timelapseCount}`, inline: true },
          { name: "Node.js Version", value: process.version, inline: true },
          { name: "Discord.js Version", value: require("discord.js").version, inline: true },
          { name: "Betriebssystem", value: `${os.type()} ${os.release()}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "Timelapse Generator Bot" });

      // Sende die Antwort mit dem Embed
      await interaction.reply({
        content: "",
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Fehler im Status-Befehl:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "Es gab einen Fehler beim Abrufen des Status!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  },
};
