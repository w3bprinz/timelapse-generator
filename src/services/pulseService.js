import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { Chart, registerables } from "chart.js";
import "chartjs-adapter-luxon";
import { DateTime } from "luxon";
import fetch from "node-fetch";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.resolve(__dirname, "../../data/pulse_data.json");
const ARCHIVE_DIR = path.resolve(__dirname, "../../data/archives");

Chart.register(...registerables);

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 800,
  height: 400,
  backgroundColour: "#2c2f33",
  chartCallback: (ChartLib) => {
    ChartLib.register(...registerables);
  },
});

class PulseService {
  async collectPulseData() {
    try {
      const url = `https://api.pulsegrow.com/devices/${process.env.PULSE_DEVICE_ID}/recent-data`;
      const response = await fetch(url, {
        headers: { "x-api-key": process.env.PULSE_API_KEY },
      });

      if (!response.ok) throw new Error(`Pulse API Fehler: ${response.status}`);

      const data = await response.json();
      const entry = {
        timestamp: new Date().toISOString(),
        temperature: data.temperatureC,
        humidity: data.humidityRh,
        co2: data.co2,
        vpd: data.vpd,
      };

      const allData = await this.readData();
      allData.push(entry);
      await fs.outputJson(DATA_PATH, allData, { spaces: 2 });
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Pulse Grow-Daten:", error);
    }
  }

  async readData() {
    try {
      const exists = await fs.pathExists(DATA_PATH);
      if (!exists) return [];
      const content = await fs.readJson(DATA_PATH);
      return Array.isArray(content) ? content : [];
    } catch (err) {
      console.error("Fehler beim Lesen der Pulse-Daten:", err);
      return [];
    }
  }

  async archiveOldData() {
    const data = await this.readData();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);

    const toArchive = data.filter((entry) => new Date(entry.timestamp) < cutoff);
    const remaining = data.filter((entry) => new Date(entry.timestamp) >= cutoff);

    if (toArchive.length === 0) return;

    const archiveName = path.join(ARCHIVE_DIR, `pulse_data_${DateTime.now().toISODate()}.json`);
    await fs.outputJson(archiveName, toArchive, { spaces: 2 });
    await fs.outputJson(DATA_PATH, remaining, { spaces: 2 });
  }

  async sendChartToDiscord(client, days) {
    try {
      const buffer = await this.createChart(days);
      const channel = await client.channels.fetch(process.env.PULSE_CHANNEL_ID);
      await channel.send({
        content: `📊 Diagramm der letzten ${days} Tage`,
        files: [{ attachment: buffer, name: `pulse_chart_${days}d.png` }],
      });
    } catch (err) {
      console.error("❌ Fehler beim Senden des Charts:", err);
    }
  }

  async createChart(days) {
    const data = await this.readData();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = data.filter((entry) => {
      const date = DateTime.fromISO(entry.timestamp);
      return date.isValid && date.toJSDate() >= cutoff;
    });

    const labels = filtered.map((entry) => entry.timestamp);
    const datasets = [
      {
        label: "Temperatur (°C)",
        data: filtered.map((e) => e.temperature),
        borderColor: "#ff6384",
        backgroundColor: "#ff6384",
        yAxisID: "y",
      },
      {
        label: "Luftfeuchtigkeit (%)",
        data: filtered.map((e) => e.humidity),
        borderColor: "#36a2eb",
        backgroundColor: "#36a2eb",
        yAxisID: "y",
      },
      {
        label: "CO2 (ppm)",
        data: filtered.map((e) => e.co2),
        borderColor: "#cc65fe",
        backgroundColor: "#cc65fe",
        yAxisID: "y1",
      },
      {
        label: "VPD",
        data: filtered.map((e) => e.vpd),
        borderColor: "#ffce56",
        backgroundColor: "#ffce56",
        yAxisID: "y2",
      },
    ];

    const config = {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        scales: {
          x: {
            type: "time",
            time: {
              unit: "hour",
              tooltipFormat: "HH:mm",
              displayFormats: { hour: "HH:mm" },
            },
            ticks: { color: "#ffffff", maxTicksLimit: 20 },
            grid: { color: "#444" },
          },
          y: {
            title: { display: true, text: "Temp / Humidity", color: "#ffffff" },
            ticks: { color: "#ffffff" },
            grid: { color: "#444" },
          },
          y1: {
            position: "right",
            title: { display: true, text: "CO2 (ppm)", color: "#ffffff" },
            ticks: { color: "#ffffff" },
            grid: { drawOnChartArea: false },
          },
          y2: {
            position: "right",
            title: { display: true, text: "VPD", color: "#ffffff" },
            ticks: { color: "#ffffff" },
            grid: { drawOnChartArea: false },
          },
        },
        plugins: {
          legend: { labels: { color: "#ffffff" } },
        },
      },
    };

    return chartJSNodeCanvas.renderToBuffer(config);
  }
}

const pulseService = new PulseService();
export default pulseService;
