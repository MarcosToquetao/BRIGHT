/* ============================================================
   BRIGHT — Lógica da aplicação
   ============================================================ */

const State = {
  lang: localStorage.getItem("bright-lang") || (window.BRIGHT_CONFIG.DEFAULT_LANG || "pt"),
  data: [],
  filtered: [],
  charts: {},
};

/* ---------- i18n ---------- */
function t(key) {
  const dict = window.BRIGHT_I18N[State.lang] || {};
  return dict[key] != null ? dict[key] : key;
}
function fieldLabel(key) {
  const f = window.BRIGHT_SCHEMA.find((s) => s.key === key);
  return f ? f.label[State.lang] : key;
}
function fieldDef(key) {
  return window.BRIGHT_SCHEMA.find((s) => s.key === key);
}
function isMulti(key) {
  const f = fieldDef(key);
  return !!(f && f.multi);
}
/* Retorna SEMPRE um array de valores para um campo.
   Campos "multi" separam valores por ";" (ou ",") na planilha. */
function getVals(d, key) {
  const raw = d ? d[key] : "";
  if (isMulti(key)) {
    return String(raw || "")
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter((s) => s && s !== "N/A");
  }
  const tv = String(raw == null ? "" : raw).trim();
  return tv && tv !== "N/A" ? [tv] : [];
}
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
  });
  document.documentElement.lang = State.lang;
  document.querySelectorAll(".lang-toggle button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === State.lang);
  });
}
function setLang(lang) {
  State.lang = lang;
  localStorage.setItem("bright-lang", lang);
  applyI18n();
  buildFilters();
  renderCatalog();
  if (currentView() === "dashboard") renderDashboard();
  const id = detailId();
  if (id) renderDetail(id);
}

/* ---------- Data loading ---------- */
async function loadData() {
  const cfg = window.BRIGHT_CONFIG;
  try {
    if (cfg.GOOGLE_SHEET_CSV_URL) {
      const csv = await fetch(cfg.GOOGLE_SHEET_CSV_URL).then((r) => r.text());
      State.data = parseCSV(csv);
    } else {
      State.data = await fetch(cfg.SAMPLE_DATA_URL).then((r) => r.json());
    }
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
    State.data = [];
  }
  // Garante id em todos os registros
  State.data.forEach((d, i) => { if (!d.id) d.id = String(i + 1); });
  State.filtered = State.data.slice();
}

/* Mini parser de CSV/TSV (lida com aspas). Detecta o separador automaticamente
   (vírgula ou tab) pela primeira linha. Cabeçalho = keys do schema. */
function parseCSV(text) {
  // Detecta o delimitador: se a primeira linha tiver tab, usa tab (TSV).
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delim = firstLine.indexOf("\t") !== -1 ? "\t" : ",";
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === delim) { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] || "").trim(); });
      return obj;
    });
}

/* ---------- Routing (hash based) ---------- */
function currentView() {
  const h = location.hash.replace("#", "");
  if (h.startsWith("dataset/")) return "detail";
  return ["catalog", "dashboard", "submit", "about"].includes(h) ? h : "catalog";
}
function detailId() {
  const h = location.hash.replace("#", "");
  return h.startsWith("dataset/") ? decodeURIComponent(h.split("/")[1]) : null;
}
function route() {
  const view = currentView();
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const id = detailId();
  if (view === "detail" && id) {
    document.getElementById("view-detail").classList.add("active");
    renderDetail(id);
  } else {
    const el = document.getElementById("view-" + view);
    if (el) el.classList.add("active");
    if (view === "dashboard") renderDashboard();
  }
  // nav active state
  document.querySelectorAll(".nav-links a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + view);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Filters ---------- */
function buildFilters() {
  const container = document.getElementById("filters");
  if (!container) return;
  const filterFields = window.BRIGHT_SCHEMA.filter((f) => f.filter);
  container.innerHTML = filterFields.map((f) => {
    const values = filterOptions(f);
    const opts = ['<option value="">' + t("filter.all") + "</option>"]
      .concat(values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`))
      .join("");
    return `<div class="filter-field">
      <label>${escapeHtml(f.label[State.lang])}</label>
      <select data-filter="${f.key}">${opts}</select>
    </div>`;
  }).join("");
  container.querySelectorAll("select").forEach((s) => s.addEventListener("change", applyFilters));
}
/* Opções do filtro = vocabulário oficial do schema (na ordem definida)
   + qualquer valor presente nos dados que ainda não esteja na lista. */
function filterOptions(f) {
  const out = (f.options || []).filter((o) => o !== "N/A");
  uniqueValues(f.key).forEach((v) => { if (!out.includes(v)) out.push(v); });
  return out;
}
/* Valores únicos presentes nos dados (expandindo campos multi). */
function uniqueValues(key) {
  const set = new Set();
  State.data.forEach((d) => getVals(d, key).forEach((v) => set.add(v)));
  return Array.from(set).sort();
}
function applyFilters() {
  const term = (document.getElementById("search").value || "").toLowerCase().trim();
  const active = {};
  document.querySelectorAll("#filters select").forEach((s) => {
    if (s.value) active[s.dataset.filter] = s.value;
  });
  State.filtered = State.data.filter((d) => {
    for (const k in active) { if (!getVals(d, k).includes(active[k])) return false; }
    if (term) {
      const hay = [d.title, d.authors, d.tissue, d.organism, d.doi, d.technology, d.cancerType]
        .join(" ").toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
  renderCatalog();
}
function clearFilters() {
  document.getElementById("search").value = "";
  document.querySelectorAll("#filters select").forEach((s) => (s.value = ""));
  applyFilters();
}

/* ---------- Render: Catalog ---------- */
function renderCatalog() {
  const grid = document.getElementById("card-grid");
  const bar = document.getElementById("results-count");
  if (!grid) return;
  bar.textContent = State.filtered.length + " " + t("catalog.results");
  if (!State.filtered.length) {
    grid.innerHTML = `<div class="empty">${t("catalog.empty")}</div>`;
    return;
  }
  grid.innerHTML = State.filtered.map((d) => {
    const techChips = getVals(d, "technology").map((v) => `<span class="chip tech">${escapeHtml(v)}</span>`).join("");
    const orgChips = getVals(d, "organism").map((v) => `<span class="chip organism">${escapeHtml(v)}</span>`).join("");
    const cancerChips = d.isTumor === "Yes"
      ? (getVals(d, "cancerType").map((v) => `<span class="chip tumor">${escapeHtml(v)}</span>`).join("") || `<span class="chip tumor">Tumor</span>`)
      : "";
    const tissueTxt = getVals(d, "tissue").join(", ") || "—";
    const accessVals = getVals(d, "access");
    const accessBadges = (accessVals.length ? accessVals : ["—"])
      .map((a) => `<span class="badge-access ${accessBadgeClass(a)}">${escapeHtml(a)}</span>`).join(" ");
    return `<article class="dataset-card" onclick="location.hash='dataset/${encodeURIComponent(d.id)}'">
      <div class="chips">
        ${techChips || '<span class="chip tech">—</span>'}
        ${cancerChips}
        ${orgChips}
      </div>
      <h3>${escapeHtml(d.title || "—")}</h3>
      <div class="card-meta">${escapeHtml(tissueTxt)} · ${escapeHtml(d.numSamples || "?")} ${State.lang === "pt" ? "amostras" : "samples"} · ${escapeHtml(d.pubYear || "")}</div>
      <div class="card-foot">
        <span class="access-wrap">${accessBadges}</span>
        <span class="link-btn">${t("catalog.view")} →</span>
      </div>
    </article>`;
  }).join("");
}
function accessBadgeClass(access) {
  if (access === "Public") return "public";
  if (access === "On request") return "request";
  if (access === "Controlled") return "controlled";
  return "request";
}

/* ---------- Render: Detail ---------- */
function renderDetail(id) {
  const wrap = document.getElementById("detail-content");
  const d = State.data.find((x) => String(x.id) === String(id));
  if (!d) { wrap.innerHTML = `<div class="empty">${t("detail.notfound")}</div>`; return; }

  const groups = [
    { title: t("detail.section.overview"), keys: ["organism", "tissue", "isTumor", "cancerType"] },
    { title: t("detail.section.technical"), keys: ["technology", "geneCoverage", "panelGeneCount", "coregProtein", "heImage", "fixation", "numSamples"] },
    { title: t("detail.section.access"), keys: ["access", "doi", "authors", "pubYear", "pubMonth"] },
    { title: t("detail.section.contact"), keys: ["submittedBy", "contactEmail"] },
  ];

  const groupHtml = groups.map((g) => {
    const props = g.keys.map((k) => {
      const vals = getVals(d, k);
      if (!vals.length) return "";
      return `<div class="prop"><div class="k">${escapeHtml(fieldLabel(k))}</div><div class="v">${escapeHtml(vals.join(", "))}</div></div>`;
    }).filter(Boolean).join("");
    if (!props) return "";
    return `<div class="detail-section"><h4>${escapeHtml(g.title)}</h4><div class="prop-grid">${props}</div></div>`;
  }).join("");

  const notesHtml = d.notes
    ? `<div class="detail-section"><h4>${t("detail.section.notes")}</h4><div class="notes-box">${escapeHtml(d.notes)}</div></div>`
    : "";

  wrap.innerHTML = `<div class="detail-wrap">
    <div class="detail-head">
      <a class="link-btn" href="#catalog">← ${t("detail.back")}</a>
      <h2>${escapeHtml(d.title || "—")}</h2>
      <div class="chips">
        ${getVals(d, "technology").map((v) => `<span class="chip tech">${escapeHtml(v)}</span>`).join("") || '<span class="chip tech">—</span>'}
        ${getVals(d, "organism").map((v) => `<span class="chip organism">${escapeHtml(v)}</span>`).join("")}
        ${d.isTumor === "Yes" ? (getVals(d, "cancerType").map((v) => `<span class="chip tumor">${escapeHtml(v)}</span>`).join("") || '<span class="chip tumor">Tumor</span>') : ""}
      </div>
      <div class="detail-actions">
        ${d.repositoryUrl ? `<a class="btn btn-primary" target="_blank" rel="noopener" href="${escapeAttr(d.repositoryUrl)}">↓ ${t("detail.download")}</a>` : ""}
        ${d.articleUrl ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${escapeAttr(d.articleUrl)}">${t("detail.article")} ↗</a>` : ""}
      </div>
    </div>
    <div class="detail-body">
      ${groupHtml}
      ${notesHtml}
    </div>
  </div>`;
}

/* ---------- Stats (home strip) ---------- */
function renderStats() {
  const totalSamples = State.data.reduce((sum, d) => {
    const n = parseInt(String(d.numSamples).replace(/[^\d]/g, ""), 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  animateCount("stat-datasets", State.data.length);
  animateCount("stat-samples", totalSamples);
  animateCount("stat-tissues", uniqueValues("tissue").length);
  animateCount("stat-tech", uniqueValues("technology").length);
}
/* Contagem animada (count-up) — toque elegante na home. */
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const fmt = (n) => n.toLocaleString(State.lang === "pt" ? "pt-BR" : "en-US");
  if (target <= 0) { el.textContent = "0"; return; }
  const dur = 900, t0 = performance.now();
  function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.textContent = fmt(Math.round(eased * target));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(s) { return escapeHtml(s); }

/* ---------- Init ---------- */
async function init() {
  // submit form link
  const sf = document.getElementById("submit-form-link");
  if (sf) sf.href = window.BRIGHT_CONFIG.SUBMIT_FORM_URL || "#";

  applyI18n();
  await loadData();
  renderStats();
  buildFilters();
  renderCatalog();

  document.getElementById("search").addEventListener("input", applyFilters);
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.querySelectorAll(".lang-toggle button").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang)));

  window.addEventListener("hashchange", route);
  route();
}

document.addEventListener("DOMContentLoaded", init);
