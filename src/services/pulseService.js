import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { Chart, registerables, _adapters } from "chart.js";
import "chartjs-adapter-luxon";
import { DateTime } from "luxon";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, "../../data/pulse_data.json");
const ARCHIVE_DIR = path.resolve(__dirname, "../../data/archives");

Chart.register(...registerables);
_adapters._date.override(DateTime);

const width = 800;
const height = 400;
const backgroundColour = "#2c2f33";
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  backgroundColour,
  chartCallback: (ChartLib) => {
    ChartLib.register(...registerables);
  },
});

class PulseService {
  async collectPulseData() {
    const data = await this.readData();
    const newEntry = {
      timestamp: new Date().toISOString(),
      temperature: this.randomValue(20, 30),
      humidity: this.randomValue(40, 60),
      co2: Math.floor(this.randomValue(400, 800)),
      vpd: this.randomValue(0.8, 1.2),
    };
    data.push(newEntry);
    await fs.outputJson(DATA_PATH, data, { spaces: 2 });
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

    const archiveName = path.join(ARCHIVE_DIR, `pulse_data_${formatISO(new Date(), { representation: "date" })}.json`);
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
    const filtered = data.filter((entry) => isValid(parseISO(entry.timestamp)) && new Date(entry.timestamp) >= cutoff);

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

    const configuration = {
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
              displayFormats: {
                hour: "HH:mm",
              },
            },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 20,
              color: "#ffffff",
            },
            grid: {
              color: "#444",
            },
          },
          y: {
            position: "left",
            title: {
              display: true,
              text: "Temp / Humidity",
              color: "#ffffff",
            },
            ticks: {
              color: "#ffffff",
            },
            grid: {
              color: "#444",
            },
          },
          y1: {
            position: "right",
            title: {
              display: true,
              text: "CO2 (ppm)",
              color: "#ffffff",
            },
            ticks: {
              color: "#ffffff",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
          y2: {
            position: "right",
            title: {
              display: true,
              text: "VPD",
              color: "#ffffff",
            },
            ticks: {
              color: "#ffffff",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: "#ffffff",
            },
          },
        },
      },
    };

    return chartJSNodeCanvas.renderToBuffer(configuration);
  }

  randomValue(min, max) {
    return +(Math.random() * (max - min) + min).toFixed(2);
  }
}

export default {
  collectPulseData,
  archiveOldData,
  sendChartToDiscord,
};
