require("dotenv").config();
require("./utils/log-patch");

const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { token, clientId, guildId } = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
  ],
  presence: {
    status: "online",
    activities: [
      {
        name: "🌱 Pflanzenwachstum überwachen",
        type: "WATCHING",
      },
    ],
  },
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

// Bot ist bereit
client.once("ready", async () => {
  console.log("Bot ist bereit!");

  // Deploy Commands
  const rest = new REST({ version: "10" }).setToken(token);

  // Umschaltbar zwischen Guild- oder Global-Deploy
  const useGlobal = process.env.USE_GLOBAL_COMMANDS;

  const route = useGlobal ? Routes.applicationCommands(clientId) : Routes.applicationGuildCommands(clientId, guildId);

  // Guild Commands löschen, um doppelte Slash Commands zu vermeiden
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log("🧹 Alte Guild-Commands erfolgreich entfernt.");
  } catch (err) {
    console.error("❌ Fehler beim Entfernen der Guild-Commands:", err);
  }

  try {
    await rest.put(route, { body: commands });
    console.log(`✅ ${commands.length} Slash-Commands ${useGlobal ? "global" : "für die Guild"} deployed.`);
  } catch (error) {
    console.error("❌ Fehler beim Deploy der Commands:", error);
  }
});

client.login(token);
