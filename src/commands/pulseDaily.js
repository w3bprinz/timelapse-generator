import fetch from "node-fetch";
import { DateTime } from "luxon";
import dotenv from "dotenv";
import { EmbedBuilder } from "discord.js";

dotenv.config();

async function fetchPulseData() {
  const now = DateTime.now().setZone("Europe/Berlin");
  const start = now.minus({ days: 1 }).set({ hour: 20, minute: 0, second: 0 });
  const end = now.set({ hour: 20, minute: 0, second: 0 });

  const url = `https://api.pulsegrow.com/devices/${process.env.PULSE_DEVICE_ID}/data-range?start=${start
    .toUTC()
    .toISO()}&end=${end.toUTC().toISO()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": process.env.PULSE_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Fehler beim Abrufen der Pulse-Daten: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

function calculateAverages(data) {
  const fields = ["temperatureC", "humidityRh", "vpd", "co2"];
  const sums = {};
  const counts = {};

  fields.forEach((field) => {
    sums[field] = 0;
    counts[field] = 0;
  });

  data.forEach((entry) => {
    fields.forEach((field) => {
      if (typeof entry[field] === "number") {
        sums[field] += entry[field];
        counts[field]++;
      }
    });
  });

  const averages = {};
  fields.forEach((field) => {
    averages[field] = counts[field] > 0 ? sums[field] / counts[field] : null;
  });

  return averages;
}

async function sendSummaryToDiscord(client) {
  const channel = await client.channels.fetch(process.env.PULSE_CHANNEL_ID);
  const data = await fetchPulseData();
  const averages = calculateAverages(data);

  const embed = new EmbedBuilder()
    .setTitle("🌿 Pulse Tagesübersicht (20 Uhr)")
    .setDescription("Durchschnittswerte der letzten 24 Stunden")
    .addFields(
      { name: "🌡️ Temperatur", value: `${averages.temperatureC?.toFixed(1)} °C`, inline: true },
      { name: "💧 Luftfeuchtigkeit", value: `${averages.humidityRh?.toFixed(1)} %`, inline: true },
      { name: "🟣 VPD", value: `${averages.vpd?.toFixed(2)} kPa`, inline: true },
      { name: "🫁 CO₂", value: `${averages.co2?.toFixed(0)} ppm`, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

export default {
  sendSummaryToDiscord,
};
