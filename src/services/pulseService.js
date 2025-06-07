import { Chart, registerables } from "chart.js";
import "chartjs-adapter-luxon";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";
import { DateTime } from "luxon";

const width = 1000;
const height = 500;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width,
  height,
  chartCallback: (ChartLib) => {
    ChartLib.register(...registerables);
  },
});

const PULSE_DATA_PATH = "/app/pulse_data.json";

async function loadData(days) {
  const raw = await fs.readFile(PULSE_DATA_PATH, "utf-8");
  const data = JSON.parse(raw);

  const threshold = DateTime.now().minus({ days });
  return data.filter((entry) => DateTime.fromISO(entry.timestamp) >= threshold);
}

function createChartConfig(data) {
  return {
    type: "line",
    data: {
      labels: data.map((d) => d.timestamp),
      datasets: [
        {
          label: "Temperatur (°C)",
          data: data.map((d) => d.temperature),
          borderColor: "#ff6384",
          fill: false,
        },
        {
          label: "Luftfeuchtigkeit (%)",
          data: data.map((d) => d.humidity),
          borderColor: "#36a2eb",
          fill: false,
        },
        {
          label: "CO₂ (ppm)",
          data: data.map((d) => d.co2),
          borderColor: "#4bc0c0",
          fill: false,
        },
        {
          label: "VPD",
          data: data.map((d) => d.vpd),
          borderColor: "#9966ff",
          fill: false,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Pulse Klimadaten" },
      },
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "dd.MM.yyyy HH:mm",
            displayFormats: { hour: "HH:mm", day: "dd.MM." },
          },
          title: { display: true, text: "Zeit" },
        },
        y: {
          title: { display: true, text: "Wert" },
        },
      },
    },
  };
}

export default {
  async createChart(days) {
    const data = await loadData(days);
    const config = createChartConfig(data);
    return await chartJSNodeCanvas.renderToBuffer(config);
  },

  async sendChartToDiscord(client, days) {
    const chartBuffer = await this.createChart(days);
    const channel = await client.channels.fetch(process.env.PULSE_CHANNEL_ID);

    const filename = `pulse_chart_${DateTime.now().toFormat("yyyyMMdd_HHmm")}.png`;
    const filepath = path.join("/app/screenshots", filename);

    await fs.writeFile(filepath, chartBuffer);
    const resizedPath = filepath.replace(".png", "_resized.png");

    await sharp(chartBuffer).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).toFile(resizedPath);

    await channel.send({ files: [resizedPath] });
    await fs.unlink(resizedPath);
  },

  async storePulseData(entry) {
    const data = await fs.readJSON(PULSE_DATA_PATH).catch(() => []);
    data.push(entry);
    await fs.writeJSON(PULSE_DATA_PATH, data, { spaces: 2 });
  },
};
