require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const Scheduler = require("./services/scheduler");
const rtspService = require("./services/rtspService");
const { token, channelId, screenshotInterval, postTimes } = require("./config");
const { createScreenshot, postScreenshot, createTimelapse } = require("./utils/screenshot");
const { formatUptime } = require("./utils/formatUptime");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Command Handler
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  }
}

// Event Handler
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Interaktion Handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "Es gab einen Fehler bei der Ausführung dieses Befehls!",
      ephemeral: true,
    });
  }
});

// Bot ist bereit
client.once("ready", () => {
  console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);
  console.log("Bot ist online!");

  // Initialisiere den Scheduler
  new Scheduler(client);
});

client.login(process.env.DISCORD_TOKEN);
