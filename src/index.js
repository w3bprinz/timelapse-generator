require("dotenv").config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const Scheduler = require("./services/scheduler");
const rtspService = require("./services/rtspService");
const { token, clientId, guildId, channelId, screenshotInterval, postTimes } = require("./config");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Command Handler
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

// Lade Commands und bereite sie für das Deploy vor
const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
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
    console.error("Unbehandelter Fehler im Command:", error);
    // Keine Antwort mehr hier, da der Command selbst für die Fehlerbehandlung zuständig ist
  }
});

// Bot ist bereit
client.once("ready", async () => {
  console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);

  // Deploy Commands
  try {
    const rest = new REST().setToken(token);
    console.log(`Starte das Aktualisieren von ${commands.length} Application (/) Commands.`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Erfolgreich ${commands.length} Application (/) Commands geladen.`);
  } catch (error) {
    console.error("Fehler beim Deploy der Commands:", error);
  }

  // Initialisiere den Scheduler
  new Scheduler(client);
});

client.login(token);
