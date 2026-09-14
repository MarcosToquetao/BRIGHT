/* ============================================================
   BRIGHT — aplicação
   ============================================================ */

const State = {
  lang: localStorage.getItem("bright-lang") || window.BRIGHT_CONFIG.DEFAULT_LANG || "pt",
  data: [],
  portals: [],
  shown: [],
  updated: "",
  sort: { key: "pubYear", dir: -1 },
  filters: { q: "", technology: "", tissue: "", isTumor: "", organism: "", access: "", onlyLink: false, onlyHE: false },
};

/* Campos que viram menu de filtro. A ordem é a da interface.
   Usam o rótulo curto da coluna, não o nome longo do schema. */
const FILTER_FIELDS = ["technology", "tissue", "isTumor", "organism", "access"];
const FILTER_LABEL = {
  technology: "table.tech", tissue: "table.tissue", isTumor: "table.tumor",
  organism: "table.organism", access: "table.access",
};

/* Colunas da tabela: chave do schema, rótulo, e como ordenar. */
const COLUMNS = [
  { key: "title",       label: "table.study",    kind: "text" },
  { key: "technology",  label: "table.tech",     kind: "list" },
  { key: "tissue",      label: "table.tissue",   kind: "list" },
  { key: "isTumor",     label: "table.tumor",    kind: "text" },
  { key: "organism",    label: "table.organism", kind: "list" },
  { key: "numSamples",  label: "table.samples",  kind: "num" },
  { key: "heImage",     label: "table.he",       kind: "text" },
  { key: "access",      label: "table.access",   kind: "list" },
  { key: "pubYear",     label: "table.year",     kind: "num" },
];

/* ---------- Textos ---------- */
function t(key) {
  const dict = window.BRIGHT_I18N[State.lang] || {};
  return dict[key] != null ? dict[key] : key;
}
/** Valor do vocabulário controlado na forma exibível do idioma atual. */
function showValue(v) {
  const dict = window.BRIGHT_VALUES[State.lang] || {};
  return dict[v] != null ? dict[v] : v;
}
function fieldDef(key) {
  return window.BRIGHT_SCHEMA.find((s) => s.key === key);
}
function fieldLabel(key) {
  const f = fieldDef(key);
  return f ? f.label[State.lang] : key;
}
function isMulti(key) {
  const f = fieldDef(key);
  return !!(f && f.multi);
}
/** Sempre um array de valores canônicos para um campo. */
function getVals(d, key) {
  const raw = d ? d[key] : "";
  const clean = (s) => s && s !== "N/A" && s !== "a confirmar";
  if (isMulti(key)) {
    return String(raw || "").split(/[;,]/).map((s) => s.trim()).filter(clean);
  }
  const v = String(raw == null ? "" : raw).trim();
  return clean(v) ? [v] : [];
}
function showList(d, key) {
  const vals = getVals(d, key).map(showValue);
  return vals.length ? vals.join(", ") : "";
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
  document.documentElement.lang = State.lang;
  document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("active", b.dataset.lang === State.lang));
}

function setLang(lang) {
  State.lang = lang;
  localStorage.setItem("bright-lang", lang);
  applyI18n();
  buildSelects();
  refresh();
  renderPortals();
  renderUpdated();
  const id = detailId();
  if (id) renderDetail(id);
}

/* ---------- Dados ---------- */
async function loadData() {
  const cfg = window.BRIGHT_CONFIG;
  try {
    const res = await fetch(cfg.CATALOG_URL);
    State.data = await res.json();
    State.updated = res.headers.get("last-modified") || "";
  } catch (e) {
    console.error("Falha ao carregar o catálogo:", e);
    State.data = [];
  }
  try {
    State.portals = await fetch(cfg.PORTALS_URL).then((r) => r.json());
  } catch (e) {
    State.portals = [];
  }
  State.data.forEach((d, i) => { if (!d.id) d.id = String(i + 1); });
}

/** Datasets individuais — coleções agregam amostras de outros estudos. */
function individuals() {
  return State.data.filter((d) => d.recordType !== "collection");
}

/* ---------- Estado na URL ---------- */
function currentView() {
  const h = location.hash.replace(/^#/, "").split("?")[0];
  if (h.startsWith("dataset/")) return "detail";
  return ["catalog", "submit", "about"].includes(h) ? h : "catalog";
}
function detailId() {
  const h = location.hash.replace(/^#/, "").split("?")[0];
  return h.startsWith("dataset/") ? decodeURIComponent(h.slice("dataset/".length)) : null;
}
function readFiltersFromUrl() {
  const qs = location.hash.split("?")[1] || "";
  const p = new URLSearchParams(qs);
  State.filters.q = p.get("q") || "";
  FILTER_FIELDS.forEach((k) => { State.filters[k] = p.get(k) || ""; });
  State.filters.onlyLink = p.get("link") === "1";
  State.filters.onlyHE = p.get("he") === "1";
}
/** Filtros ativos serializados, para carregar de uma view para outra. */
function filterQuery() {
  const f = State.filters;
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  FILTER_FIELDS.forEach((k) => { if (f[k]) p.set(k, f[k]); });
  if (f.onlyLink) p.set("link", "1");
  if (f.onlyHE) p.set("he", "1");
  const qs = p.toString();
  return qs ? "?" + qs : "";
}

function writeFiltersToUrl() {
  // Só o catálogo é dono da URL. Sem esta guarda, um link direto para um
  // dataset seria reescrito para #catalog antes mesmo de ser roteado.
  if (currentView() !== "catalog") return;
  const next = "#catalog" + filterQuery();
  if (location.hash !== next) history.replaceState(null, "", next);
}

/* ---------- Filtros ---------- */
function buildSelects() {
  const host = document.getElementById("selects");
  if (!host) return;
  host.innerHTML = FILTER_FIELDS.map((key) => {
    const vals = optionsFor(key);
    const opts = [`<option value="">${t("filters.all")}</option>`].concat(
      vals.map((v) => `<option value="${escapeAttr(v)}"${State.filters[key] === v ? " selected" : ""}>${escapeHtml(showValue(v))}</option>`)
    ).join("");
    return `<div class="field"><label for="f-${key}">${escapeHtml(t(FILTER_LABEL[key]))}</label>` +
           `<select id="f-${key}" data-filter="${key}">${opts}</select></div>`;
  }).join("");
  host.querySelectorAll("select").forEach((s) => s.addEventListener("change", () => {
    State.filters[s.dataset.filter] = s.value;
    refresh();
  }));
}

/** Ordena pares [valor, contagem] do mais frequente ao menos, com "Other" no fim. */
function byFrequencyOtherLast(a, b) {
  if ((a[0] === "Other") !== (b[0] === "Other")) return a[0] === "Other" ? 1 : -1;
  return b[1] - a[1] || a[0].localeCompare(b[0]);
}

/** Só valores realmente presentes no acervo. */
function optionsFor(key) {
  const count = {};
  State.data.forEach((d) => getVals(d, key).forEach((v) => { count[v] = (count[v] || 0) + 1; }));
  return Object.entries(count).sort(byFrequencyOtherLast).map((e) => e[0]);
}

function matches(d) {
  const f = State.filters;
  for (const k of FILTER_FIELDS) {
    if (f[k] && !getVals(d, k).includes(f[k])) return false;
  }
  if (f.onlyLink && !(d.repositoryUrl || "").trim()) return false;
  if (f.onlyHE && !["Co-registered", "Paired"].includes((d.heImage || "").trim())) return false;
  if (f.q) {
    const term = f.q.toLowerCase();
    // procura no canônico e na forma traduzida, para servir aos dois idiomas
    const hay = [d.title, d.authors, d.doi, d.notes]
      .concat(["technology", "tissue", "organism", "cancerType", "heImage", "access"]
        .flatMap((k) => getVals(d, k).flatMap((v) => [v, showValue(v)])))
      .join(" ").toLowerCase();
    if (!hay.includes(term)) return false;
  }
  return true;
}

function sortRows(rows) {
  const { key, dir } = State.sort;
  const col = COLUMNS.find((c) => c.key === key) || COLUMNS[0];
  const val = (d) => {
    if (col.kind === "num") {
      const n = parseInt(String(d[key] || "").trim(), 10);
      return Number.isNaN(n) ? null : n;
    }
    if (col.kind === "list") return getVals(d, key).map(showValue).join(", ");
    return String(d[key] || "").trim();
  };
  return rows.slice().sort((a, b) => {
    const x = val(a), y = val(b);
    // ausência sempre por último, independentemente da direção
    if (x === null || x === "") return (y === null || y === "") ? 0 : 1;
    if (y === null || y === "") return -1;
    if (typeof x === "number") return (x - y) * dir;
    return x.localeCompare(y, State.lang) * dir;
  });
}

function refresh(paint) {
  State.shown = sortRows(State.data.filter(matches));
  writeFiltersToUrl();
  renderTable();
  renderMatrix({
    all: State.data,
    shown: State.shown,
    active: { technology: State.filters.technology, tissue: State.filters.tissue },
    onPick: pickCell,
    paint: !!paint,
  });
  renderReadouts(State.shown);
  renderGapNote();
  syncControls();
}

function pickCell(tech, tissue) {
  const f = State.filters;
  const same = f.technology === tech && f.tissue === tissue;
  f.technology = same ? "" : tech;
  f.tissue = same ? "" : tissue;
  refresh();
  document.getElementById("catalog-table").scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncControls() {
  const f = State.filters;
  const q = document.getElementById("search");
  if (q && q.value !== f.q) q.value = f.q;
  FILTER_FIELDS.forEach((k) => {
    const s = document.getElementById("f-" + k);
    if (s && s.value !== f[k]) s.value = f[k];
  });
  document.getElementById("only-link").checked = f.onlyLink;
  document.getElementById("only-he").checked = f.onlyHE;

  const total = State.data.length;
  const n = State.shown.length;
  document.getElementById("result-count").textContent =
    (n === 1 ? t("results.one") : t("results.count")).replace("{n}", n).replace("{total}", total);
}

function clearFilters() {
  State.filters = { q: "", technology: "", tissue: "", isTumor: "", organism: "", access: "", onlyLink: false, onlyHE: false };
  refresh();
}

/* ---------- Tabela ---------- */
function renderTable() {
  const head = document.getElementById("catalog-head");
  const body = document.getElementById("catalog-body");
  if (!head || !body) return;

  head.innerHTML = "<tr>" + COLUMNS.map((c) => {
    const active = State.sort.key === c.key;
    const caret = active ? (State.sort.dir === 1 ? "▲" : "▼") : "";
    const sortAttr = active ? ` aria-sort="${State.sort.dir === 1 ? "ascending" : "descending"}"` : "";
    return `<th class="${c.kind === "num" ? "num" : ""}"${sortAttr}>` +
      `<button type="button" data-sort="${c.key}" title="${escapeAttr(t("table.sortHint"))}">` +
      `${escapeHtml(t(c.label))}<span class="caret" aria-hidden="true">${caret}</span></button></th>`;
  }).join("") + "</tr>";

  head.querySelectorAll("button[data-sort]").forEach((b) => b.addEventListener("click", () => {
    const key = b.dataset.sort;
    if (State.sort.key === key) State.sort.dir *= -1;
    else State.sort = { key, dir: key === "pubYear" || key === "numSamples" ? -1 : 1 };
    refresh();
  }));

  if (!State.shown.length) {
    body.innerHTML = `<tr><td colspan="${COLUMNS.length}"><p class="state-empty">${t("table.empty")}</p></td></tr>`;
    return;
  }

  body.innerHTML = State.shown.map((d) => {
    const techs = getVals(d, "technology");
    const techCell = techs.length
      ? techs.map((v) => `<span class="tech-item">${geoGlyph(v)}${escapeHtml(showValue(v))}</span>`).join("")
      : dash();
    const collection = d.recordType === "collection"
      ? `<span class="tag-collection">${t("table.collection")}</span>` : "";
    const authors = shortAuthors(d.authors);
    return `<tr tabindex="0" data-id="${escapeAttr(d.id)}">` +
      `<td class="study"><div class="t">${escapeHtml(d.title || "—")}${collection}</div>` +
        (authors ? `<div class="meta">${escapeHtml(authors)}</div>` : "") + `</td>` +
      `<td class="tech">${techCell}</td>` +
      `<td><div class="clamp">${cell(showList(d, "tissue"))}</div></td>` +
      `<td>${cell(showList(d, "isTumor"))}</td>` +
      `<td>${cell(showList(d, "organism"))}</td>` +
      `<td class="num">${cell(d.numSamples)}</td>` +
      `<td>${cell(showList(d, "heImage"))}</td>` +
      `<td>${accessCell(d)}</td>` +
      `<td class="num">${cell(d.pubYear)}</td>` +
    `</tr>`;
  }).join("");

  body.querySelectorAll("tr[data-id]").forEach((tr) => {
    // leva os filtros junto, para que voltar do detalhe devolva a mesma busca
    const open = () => { location.hash = "dataset/" + encodeURIComponent(tr.dataset.id) + filterQuery(); };
    tr.addEventListener("click", open);
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
}

/** Na tabela basta saber de quem é o estudo; a lista inteira fica no detalhe. */
function shortAuthors(raw) {
  const list = String(raw || "").replace(/\bet al\.?/i, "").split(/[;]/)
    .map((s) => s.trim()).filter(Boolean);
  if (!list.length) return "";
  return list.length <= 2 ? list.join("; ") : list.slice(0, 2).join("; ") + " et al.";
}

function dash() { return `<span class="none" aria-label="—">—</span>`; }
function cell(v) {
  const s = String(v == null ? "" : v).trim();
  return s && s !== "N/A" && s !== "a confirmar" ? escapeHtml(s) : dash();
}
const ACCESS_ICON = { "Public": "acc-public", "On request": "acc-request", "Controlled": "acc-controlled" };
function accessCell(d) {
  const vals = getVals(d, "access");
  if (!vals.length) return dash();
  return vals.map((v) => {
    const ico = ACCESS_ICON[v];
    return (ico ? `<svg class="acc-ico" aria-hidden="true"><use href="#${ico}"/></svg>` : "") + escapeHtml(showValue(v));
  }).join("<br>");
}

function renderGapNote() {
  const el = document.getElementById("gap-note");
  if (!el) return;
  const rows = individuals();
  const withLink = rows.filter((d) => (d.repositoryUrl || "").trim()).length;
  el.textContent = t("gap.note").replace("{n}", withLink).replace("{total}", rows.length);
}

/* ---------- Onde mais procurar ---------- */
function renderPortals() {
  const host = document.getElementById("portals-list");
  if (!host) return;
  host.innerHTML = State.portals.map((p) => {
    const name = p.name || (p.title || "").split(":")[0].trim();
    const desc = (State.lang === "en" ? p.description_en : p.description) || "";
    const href = (p.repositoryUrl || "").trim();
    const label = href
      ? `<a class="p-name" href="${escapeAttr(href)}" target="_blank" rel="noopener">${escapeHtml(name)}</a>`
      : `<span class="p-name">${escapeHtml(name)}</span>`;
    return `<li>${label}<div class="p-desc">${escapeHtml(desc)}</div></li>`;
  }).join("");
}

/* ---------- Detalhe ---------- */
const DETAIL_GROUPS = [
  { title: "detail.section.overview",  keys: ["organism", "tissue", "isTumor", "cancerType"] },
  { title: "detail.section.technical", keys: ["technology", "geneCoverage", "panelGeneCount", "coregProtein", "heImage", "fixation", "numSamples"] },
  { title: "detail.section.access",    keys: ["access", "repositoryUrl", "doi", "authors", "pubYear", "pubMonth", "submittedBy"] },
];

function renderDetail(id) {
  const host = document.getElementById("detail");
  const d = State.data.find((x) => String(x.id) === String(id));
  if (!d) { host.innerHTML = `<p class="state-empty">${t("detail.notfound")}</p>`; return; }

  const techs = getVals(d, "technology");
  const groups = DETAIL_GROUPS.map((g) => {
    const props = g.keys.map((k) => {
      const vals = getVals(d, k);
      if (!vals.length) return "";
      const shown = k === "repositoryUrl" || k === "articleUrl"
        ? `<a href="${escapeAttr(vals[0])}" target="_blank" rel="noopener">${escapeHtml(vals[0])}</a>`
        : escapeHtml(vals.map(showValue).join(", "));
      return `<div class="prop"><div class="k">${escapeHtml(fieldLabel(k))}</div><div class="v">${shown}</div></div>`;
    }).filter(Boolean).join("");
    return props ? `<section class="detail-section"><h2>${t(g.title)}</h2><div class="props">${props}</div></section>` : "";
  }).join("");

  const notes = (d.notes || "").trim();
  const notesBlock = notes
    ? `<section class="detail-section"><h2>${t("detail.section.notes")}</h2><p class="notes-text">${escapeHtml(notes)}</p></section>`
    : "";

  const prov = d._provenance && Object.keys(d._provenance).length ? provenanceBlock(d._provenance) : "";

  host.innerHTML = `<div class="detail">
    <a class="detail-back" href="#catalog${escapeAttr(filterQuery())}">← ${t("detail.back")}</a>
    <h1>${escapeHtml(d.title || "—")}</h1>
    ${techs.length ? `<div class="detail-tech">${techs.map((v) => `<span class="tech-item">${geoGlyph(v)}${escapeHtml(showValue(v))}</span>`).join("")}</div>` : ""}
    ${d.recordType === "collection" ? `<p class="callout">${t("detail.isCollection")}</p>` : ""}
    <div class="detail-actions">
      ${d.repositoryUrl ? `<a class="btn" href="${escapeAttr(d.repositoryUrl)}" target="_blank" rel="noopener">${t("detail.download")}</a>`
                        : `<span class="no-link">${t("detail.noLink")}</span>`}
      ${d.articleUrl ? `<a class="btn ghost" href="${escapeAttr(d.articleUrl)}" target="_blank" rel="noopener">${t("detail.article")}</a>` : ""}
    </div>
    ${groups}${notesBlock}${prov}
  </div>`;
}

/** Procedência por campo — preenchida pela varredura automática. */
function provenanceBlock(prov) {
  const rows = Object.entries(prov).map(([k, p]) => {
    const src = p.source ? `<a href="${escapeAttr(p.source)}" target="_blank" rel="noopener">${escapeHtml(p.source)}</a>` : "";
    return `<div class="prop"><div class="k">${escapeHtml(fieldLabel(k))}</div>` +
           `<div class="v">${escapeHtml(p.evidence || p.value || "")}${src ? "<br>" + src : ""}</div></div>`;
  }).join("");
  return `<section class="detail-section"><h2>${t("detail.provenance")}</h2>` +
         `<p class="notes-text">${t("detail.provenanceLead")}</p><div class="props">${rows}</div></section>`;
}

/* ---------- Rotas ---------- */
function route() {
  const view = currentView();
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const id = detailId();
  if (view === "detail" && id) {
    document.getElementById("view-detail").classList.add("active");
    readFiltersFromUrl();   // para o link de voltar devolver a mesma busca
    renderDetail(id);
  } else {
    document.getElementById("view-" + view).classList.add("active");
    if (view === "catalog") { readFiltersFromUrl(); refresh(); }
  }
  document.querySelectorAll(".site-nav a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + view);
  });
  window.scrollTo({ top: 0 });
}

function renderUpdated() {
  const el = document.getElementById("footer-updated");
  if (!el) return;
  if (!State.updated) { el.textContent = ""; return; }
  const d = new Date(State.updated);
  if (Number.isNaN(d.getTime())) { el.textContent = ""; return; }
  const date = d.toLocaleDateString(State.lang === "pt" ? "pt-BR" : "en-GB",
    { day: "2-digit", month: "short", year: "numeric" });
  el.textContent = t("about.updated").replace("{date}", date);
}

/* ---------- Utilidades ---------- */
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(s) { return escapeHtml(s); }

/* ---------- Início ---------- */
async function init() {
  const link = document.getElementById("submit-link");
  if (link) link.href = window.BRIGHT_CONFIG.SUBMIT_FORM_URL || "#";

  applyI18n();
  document.getElementById("catalog-body").innerHTML =
    `<tr><td colspan="${COLUMNS.length}"><p class="state-loading">${t("table.loading")}</p></td></tr>`;

  await loadData();
  readFiltersFromUrl();
  buildSelects();
  renderPortals();
  renderUpdated();
  refresh(true);

  document.getElementById("search").addEventListener("input", (e) => {
    State.filters.q = e.target.value.trim();
    refresh();
  });
  document.getElementById("only-link").addEventListener("change", (e) => {
    State.filters.onlyLink = e.target.checked; refresh();
  });
  document.getElementById("only-he").addEventListener("change", (e) => {
    State.filters.onlyHE = e.target.checked; refresh();
  });
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang)));

  window.addEventListener("hashchange", route);
  route();
}

document.addEventListener("DOMContentLoaded", init);
