import { SlashCommandBuilder, EmbedBuilder, MessageFlags, version as discordJsVersion } from "discord.js";
import os from "os";
import fs from "fs";

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
};

export default {
  data: new SlashCommandBuilder().setName("status").setDescription("Zeigt den aktuellen Status des Bots an"),

  async execute(interaction) {
    try {
      const latency = Math.round(interaction.client.ws.ping);

      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = ((usedMemory / totalMemory) * 100).toFixed(2);

      const screenshotsPath = "/app/screenshots";
      const timelapsePath = "/app/timelapses";

      const screenshotCount = fs.existsSync(screenshotsPath)
        ? fs.readdirSync(screenshotsPath).filter((file) => file.endsWith(".png")).length
        : 0;

      const timelapseCount = fs.existsSync(timelapsePath)
        ? fs.readdirSync(timelapsePath).filter((file) => file.endsWith(".mp4")).length
        : 0;

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Bot Status")
        .setDescription("Aktuelle Informationen über den Bot")
        .addFields(
          { name: "Ping", value: `${latency}ms`, inline: true },
          { name: "API Latenz", value: `${latency}ms`, inline: true },
          { name: "Uptime", value: formatUptime(process.uptime()), inline: true },
          { name: "Speichernutzung", value: `${memoryUsage}%`, inline: true },
          { name: "Screenshots", value: `${screenshotCount}`, inline: true },
          { name: "Timelapses", value: `${timelapseCount}`, inline: true },
          { name: "Node.js Version", value: process.version, inline: true },
          { name: "Discord.js Version", value: discordJsVersion, inline: true },
          { name: "Betriebssystem", value: `${os.type()} ${os.release()}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "Timelapse Generator Bot" });

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
};
