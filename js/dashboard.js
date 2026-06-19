/* ============================================================
   BRIGHT — Dashboard (Chart.js)
   ============================================================ */

/* Canais de fluorescência — paleta categórica grounded na microscopia. */
const PALETTE = [
  "#13b3c2", "#df3d77", "#7b4dc0", "#34c596",
  "#ffb454", "#4f8cf5", "#ef5da8", "#9b6dff",
  "#0fb8a6", "#ff8a5b", "#6c5ce7", "#26c6da",
];

/* Rótulos localizados para valores de vocabulário controlado. */
const VAL_LABELS = {
  pt: {
    "Co-registered": "Corregistrada", "Paired": "Pareada", "None": "Indisponível",
    "Yes": "Tumoral", "No": "Não tumoral",
  },
  en: {
    "Co-registered": "Co-registered", "Paired": "Paired", "None": "Not available",
    "Yes": "Tumor", "No": "Non-tumor",
  },
};
function localizeVal(v) {
  const dict = VAL_LABELS[State.lang] || {};
  return dict[v] || v;
}

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
/* Soma de numSamples por valor de um campo (ex.: amostras por tecnologia). */
function samplesBy(key) {
  const map = {};
  State.data.forEach((d) => {
    const n = parseInt(String(d.numSamples).replace(/[^\d]/g, ""), 10);
    const val = isNaN(n) ? 0 : n;
    getVals(d, key).forEach((v) => { map[v] = (map[v] || 0) + val; });
  });
  return map;
}
/* Matriz cruzada: soma de numSamples por (linha=keyRow) empilhada por keyStack.
   Retorna { rows:[...], stacks:[...], matrix: {row:{stack:valor}} }. */
function crossSamples(keyRow, keyStack, topStacks) {
  const matrix = {}, stackTotals = {};
  State.data.forEach((d) => {
    const n = parseInt(String(d.numSamples).replace(/[^\d]/g, ""), 10);
    const val = isNaN(n) ? 0 : n;
    const rows = getVals(d, keyRow);
    const stacks = getVals(d, keyStack);
    if (!rows.length || !stacks.length) return;
    rows.forEach((r) => {
      matrix[r] = matrix[r] || {};
      stacks.forEach((s) => {
        matrix[r][s] = (matrix[r][s] || 0) + val;
        stackTotals[s] = (stackTotals[s] || 0) + val;
      });
    });
  });
  let stacks = Object.entries(stackTotals).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  if (topStacks && stacks.length > topStacks) stacks = stacks.slice(0, topStacks);
  const rows = Object.keys(matrix).sort((a, b) => {
    const sa = Object.values(matrix[a]).reduce((x, y) => x + y, 0);
    const sb = Object.values(matrix[b]).reduce((x, y) => x + y, 0);
    return sb - sa;
  });
  return { rows, stacks, matrix };
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
      legend: { labels: { color: "#483a63", font: { family: "IBM Plex Sans", size: 12, weight: "500" }, padding: 14, usePointStyle: true } },
    },
    scales: undefined,
  }, extra || {});
}

function renderDashboard() {
  if (typeof Chart === "undefined") return;

  Chart.defaults.font.family = "IBM Plex Sans, sans-serif";
  Chart.defaults.color = "#483a63";

  // 1. Datasets por tecnologia (barra horizontal)
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
        x: { grid: { color: "#ece3f6" }, ticks: { precision: 0 } },
        y: { grid: { display: false } },
      },
    }),
  });

  // 2. Amostras de tecido por tecnologia (barras empilhadas: tech × tecido)
  const cross = crossSamples("technology", "tissue", 8);
  makeChart("chart-samples-tech", {
    type: "bar",
    data: {
      labels: cross.rows,
      datasets: cross.stacks.map((s, i) => ({
        label: s,
        data: cross.rows.map((r) => (cross.matrix[r] && cross.matrix[r][s]) || 0),
        backgroundColor: PALETTE[i % PALETTE.length],
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#fff",
      })),
    },
    options: baseOpts({
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: "#ece3f6" }, ticks: { precision: 0 }, beginAtZero: true },
      },
    }),
  });

  // 3. Datasets por organismo (rosca)
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

  // 4. Tumoral vs. não tumoral (rosca)
  const tumor = sortedEntries(countBy("isTumor"));
  makeChart("chart-tumor", {
    type: "doughnut",
    data: {
      labels: tumor.map((e) => localizeVal(e[0])),
      datasets: [{
        data: tumor.map((e) => e[1]),
        backgroundColor: ["#df3d77", "#13b3c2", "#ffb454"],
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: baseOpts({ cutout: "62%" }),
  });

  // 5. Tecidos mais frequentes (barra, top 8)
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
        y: { grid: { color: "#ece3f6" }, ticks: { precision: 0 }, beginAtZero: true },
      },
    }),
  });

  // 6. Tipos de câncer (barra horizontal, top 10)
  const cancer = sortedEntries(countBy("cancerType"), 10);
  makeChart("chart-cancer", {
    type: "bar",
    data: {
      labels: cancer.map((e) => e[0]),
      datasets: [{
        data: cancer.map((e) => e[1]),
        backgroundColor: cancer.map((_, i) => PALETTE[(i + 5) % PALETTE.length]),
        borderRadius: 7,
      }],
    },
    options: baseOpts({
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "#ece3f6" }, ticks: { precision: 0 }, beginAtZero: true },
        y: { grid: { display: false } },
      },
    }),
  });

  // 7. Imagem H&E disponível (rosca: corregistrada / pareada / indisponível)
  const heMap = countBy("heImage");
  const heOrder = ["Co-registered", "Paired", "None"];
  const heKeys = heOrder.filter((k) => heMap[k]).concat(
    Object.keys(heMap).filter((k) => !heOrder.includes(k)));
  makeChart("chart-he", {
    type: "doughnut",
    data: {
      labels: heKeys.map((k) => localizeVal(k)),
      datasets: [{
        data: heKeys.map((k) => heMap[k]),
        backgroundColor: heKeys.map((k) =>
          k === "Co-registered" ? "#34c596" : k === "Paired" ? "#4f8cf5" : k === "None" ? "#d6c9e6" : "#ffb454"),
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: baseOpts({ cutout: "62%" }),
  });

  // 8. Tipo de fixação (pizza)
  const fix = sortedEntries(countBy("fixation"));
  makeChart("chart-fixation", {
    type: "pie",
    data: {
      labels: fix.map((e) => e[0]),
      datasets: [{
        data: fix.map((e) => e[1]),
        backgroundColor: fix.map((_, i) => PALETTE[(i + 2) % PALETTE.length]),
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: baseOpts({}),
  });
}
