import "dotenv/config";
import "./utils/log-patch.js";

import { Client, GatewayIntentBits, Collection, REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { token, clientId, guildId } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

const commands = [];
for (const file of commandFiles) {
  const command = await import(path.join(commandsPath, file));
  if ("data" in command.default && "execute" in command.default) {
    client.commands.set(command.default.data.name, command.default);
    commands.push(command.default.data.toJSON());
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const event = await import(path.join(eventsPath, file));
  const evt = event.default;
  if (evt.once) {
    client.once(evt.name, (...args) => evt.execute(...args));
  } else {
    client.on(evt.name, (...args) => evt.execute(...args));
  }
}

client.once("ready", async () => {
  console.log("Bot ist bereit!");
  const rest = new REST({ version: "10" }).setToken(token);
  const useGlobal = process.env.USE_GLOBAL_COMMANDS;
  const route = useGlobal ? Routes.applicationCommands(clientId) : Routes.applicationGuildCommands(clientId, guildId);

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
