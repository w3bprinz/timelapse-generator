const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { DateTime } = require("luxon");
const Chart = require("chart.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { AttachmentBuilder } = require("discord.js");

class PulseService {
  constructor() {
    this.apiKey = process.env.PULSE_API_KEY;
    this.deviceId = process.env.PULSE_DEVICE_ID;
    this.channelId = process.env.PULSE_CHANNEL_ID;
    this.dataFile = path.join(__dirname, "../../data/pulse_data.json");
    this.archiveDir = path.join(__dirname, "../../data/archives");

    if (!fs.existsSync(this.archiveDir)) fs.mkdirSync(this.archiveDir, { recursive: true });
    if (!fs.existsSync(this.dataFile)) fs.writeFileSync(this.dataFile, "[]");
  }

  async fetchData() {
    const url = `https://api.pulsegrow.com/devices/${this.deviceId}/recent-data`;
    const response = await fetch(url, {
      headers: { "x-api-key": this.apiKey },
    });
    if (!response.ok) throw new Error(`Pulse API Fehler: ${response.status}`);
    const data = await response.json();
    return {
      timestamp: DateTime.now().setZone("Europe/Berlin").toISO(),
      temperature: data.temperatureC,
      humidity: data.humidityRh,
      co2: data.co2,
      vpd: data.vpd,
    };
  }

  async collectPulseData() {
    const newData = await this.fetchData();
    const json = JSON.parse(fs.readFileSync(this.dataFile));
    json.push(newData);
    fs.writeFileSync(this.dataFile, JSON.stringify(json, null, 2));
  }

  loadAllData() {
    return JSON.parse(fs.readFileSync(this.dataFile));
  }

  filterDataByDays(days) {
    const now = new Date();
    const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
    return this.loadAllData().filter((entry) => new Date(entry.timestamp) >= cutoff);
  }

  async createChart(days = 1) {
    const width = 800;
    const height = 400;

    const chart = new ChartJSNodeCanvas({
      width,
      height,
      chartCallback: async (ChartJS) => {
        const imported = await import("chartjs-adapter-luxon");
        ChartJS._adapters._date.override(imported.default);
      },
    });

    const data = this.filterDataByDays(days);
    const labels = data.map((d) => new Date(d.timestamp));

    const config = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Temperatur (°C)",
            data: data.map((d) => d.temperature),
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: "Luftfeuchtigkeit (%)",
            data: data.map((d) => d.humidity),
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: "VPD",
            data: data.map((d) => d.vpd),
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: "CO₂ (ppm)",
            data: data.map((d) => d.co2),
            borderWidth: 2,
            tension: 0.3,
          },
        ],
      },
      options: {
        scales: {
          x: {
            type: "time",
            time: {
              unit: days === 1 ? "hour" : "day",
              displayFormats: {
                hour: "dd.MM HH:mm",
                day: "dd.MM",
              },
            },
            ticks: {
              maxTicksLimit: 12,
            },
          },
          y: {
            beginAtZero: false,
          },
        },
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    };

    return chart.renderToBuffer(config);
  }

  async sendChartToDiscord(client, days = 1) {
    const imageBuffer = await this.createChart(days);

    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
      throw new Error("Kein gültiges Chart-Image erstellt");
    }

    const nameMap = { 1: "tag", 7: "woche", 30: "monat" };
    const filename = `pulse_chart_${nameMap[days] || days}.png`;
    const attachment = new AttachmentBuilder(imageBuffer, { name: filename });

    const channel = await client.channels.fetch(this.channelId);
    if (!channel) throw new Error("Discord Channel nicht gefunden");

    await channel.send({ files: [attachment] });
  }

  archiveDataIfNeeded() {
    const now = new Date();
    if (now.getDate() !== 1) return;

    const allData = this.loadAllData();
    const archivePath = path.join(this.archiveDir, `pulse_${now.getFullYear()}_${now.getMonth()}.json`);
    fs.writeFileSync(archivePath, JSON.stringify(allData, null, 2));
    fs.writeFileSync(this.dataFile, "[]");
  }
}

module.exports = new PulseService();
