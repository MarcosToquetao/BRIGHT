/* ============================================================
   BRIGHT — Dashboard (Chart.js)
   ============================================================ */

const PALETTE = [
  "#2f9ee6", "#19c3c8", "#7c5cf0", "#ff8a5b",
  "#ffc857", "#ff6b9d", "#41d18b", "#5b8def",
  "#9b6dff", "#ff9f43", "#26c6da", "#ec5e8a",
];

function countBy(key) {
  const map = {};
  State.data.forEach((d) => {
    // getVals (definido em app.js) expande os campos de seleção múltipla.
    getVals(d, key).forEach((v) => { map[v] = (map[v] || 0) + 1; });
  });
  return map;
}
function sortedEntries(map, limit) {
  let e = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (limit) e = e.slice(0, limit);
  return e;
}

function makeChart(id, config) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (State.charts[id]) State.charts[id].destroy();
  State.charts[id] = new Chart(ctx, config);
}

function baseOpts(extra) {
  return Object.assign({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#5b7088", font: { family: "Inter", size: 12 }, padding: 14, usePointStyle: true } },
    },
    scales: undefined,
  }, extra || {});
}

function renderDashboard() {
  if (typeof Chart === "undefined") return;

  Chart.defaults.font.family = "Inter, sans-serif";
  Chart.defaults.color = "#6a829b";

  // 1. By technology (horizontal bar)
  const tech = sortedEntries(countBy("technology"));
  makeChart("chart-tech", {
    type: "bar",
    data: {
      labels: tech.map((e) => e[0]),
      datasets: [{
        data: tech.map((e) => e[1]),
        backgroundColor: tech.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 7,
      }],
    },
    options: baseOpts({
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "#eef4fa" }, ticks: { precision: 0 } },
        y: { grid: { display: false } },
      },
    }),
  });

  // 2. By year (line)
  const yearMap = countBy("pubYear");
  const years = Object.keys(yearMap).sort();
  makeChart("chart-year", {
    type: "line",
    data: {
      labels: years,
      datasets: [{
        data: years.map((y) => yearMap[y]),
        borderColor: "#2f9ee6",
        backgroundColor: "rgba(47,158,230,0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#2f9ee6",
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: baseOpts({
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#eef4fa" }, ticks: { precision: 0 }, beginAtZero: true },
      },
    }),
  });

  // 3. By organism (doughnut)
  const org = sortedEntries(countBy("organism"));
  makeChart("chart-organism", {
    type: "doughnut",
    data: {
      labels: org.map((e) => e[0]),
      datasets: [{
        data: org.map((e) => e[1]),
        backgroundColor: org.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: baseOpts({ cutout: "62%" }),
  });

  // 4. By tissue (bar, top 8)
  const tissue = sortedEntries(countBy("tissue"), 8);
  makeChart("chart-tissue", {
    type: "bar",
    data: {
      labels: tissue.map((e) => e[0]),
      datasets: [{
        data: tissue.map((e) => e[1]),
        backgroundColor: tissue.map((_, i) => PALETTE[(i + 3) % PALETTE.length]),
        borderRadius: 7,
      }],
    },
    options: baseOpts({
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#eef4fa" }, ticks: { precision: 0 }, beginAtZero: true },
      },
    }),
  });

  // 5. Access (polar/pie)
  const access = sortedEntries(countBy("access"));
  makeChart("chart-access", {
    type: "pie",
    data: {
      labels: access.map((e) => e[0]),
      datasets: [{
        data: access.map((e) => e[1]),
        backgroundColor: ["#41d18b", "#ffc857", "#ff6b9d", "#5b8def"],
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: baseOpts({}),
  });

  // 6. Tumor vs non-tumor (doughnut)
  const tumor = countBy("isTumor");
  makeChart("chart-tumor", {
    type: "doughnut",
    data: {
      labels: Object.keys(tumor),
      datasets: [{
        data: Object.values(tumor),
        backgroundColor: ["#ff6b9d", "#19c3c8"],
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: baseOpts({ cutout: "62%" }),
  });
}
