const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const os = require("os");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder().setName("status").setDescription("Zeigt den aktuellen Status des Bots an"),
  async execute(interaction) {
    // Berechne die Latenz
    const sent = await interaction.reply({ content: "Berechne Status...", fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    // Hole Systeminformationen
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = ((usedMemory / totalMemory) * 100).toFixed(2);

    // Hole Screenshot-Informationen
    const screenshotsPath = "/app/screenshots";
    const timelapsePath = "/app/timelapse";

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
        { name: "API Latenz", value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
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

    // Aktualisiere die Antwort mit dem Embed
    await interaction.editReply({ content: "", embeds: [embed] });
  },

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  },
};
