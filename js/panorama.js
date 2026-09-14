/* ============================================================
   BRIGHT — Panorama
   ------------------------------------------------------------
   A matriz tecnologia × tecido é ao mesmo tempo a imagem e a
   navegação do catálogo. Ela e os quatro leitores abaixo dela
   respondem aos mesmos filtros da tabela, para responder à
   pergunta real: "existe dado suficiente para o que eu quero?"

   Os eixos vêm sempre do acervo inteiro, nunca do recorte — assim
   a matriz não se reorganiza a cada filtro e dá para ver o que o
   filtro deixou de fora.
   ============================================================ */

/* Geometria de captura de cada tecnologia. Chave normalizada. */
const GEO_MAP = {
  "visium": "geo-visium",
  "visium hd": "geo-visium-hd",
  "xenium": "geo-xenium",
  "merfish": "geo-merfish",
  "slide-seq": "geo-slide-seq",
  "slide-seqv2": "geo-slide-seq",
  "stereo-seq": "geo-stereo-seq",
  "open-st": "geo-stereo-seq",
  "cosmx": "geo-cosmx",
  "geomx": "geo-geomx",
  "seqfish": "geo-seqfish",
  "seqfish+": "geo-seqfish",
  "dbit-seq": "geo-dbit",
};

function geoId(tech) {
  return GEO_MAP[String(tech || "").trim().toLowerCase()] || "geo-other";
}

/** Glifo da geometria de captura, no tamanho do texto. */
function geoGlyph(tech) {
  return `<svg class="geo" aria-hidden="true"><use href="#${geoId(tech)}"/></svg>`;
}

/* ---------- viridis ---------- */
const VIRIDIS = [
  [68, 1, 84], [65, 68, 135], [42, 120, 142],
  [34, 168, 132], [122, 209, 81], [253, 231, 37],
];

/** t em [0,1] → cor da escala viridis. */
function viridis(t) {
  t = Math.max(0, Math.min(1, t));
  const p = t * (VIRIDIS.length - 1);
  const i = Math.min(Math.floor(p), VIRIDIS.length - 2);
  const f = p - i;
  const [r, g, b] = VIRIDIS[i].map((c, k) => Math.round(c + (VIRIDIS[i + 1][k] - c) * f));
  return `rgb(${r} ${g} ${b})`;
}

/** Cinza para o balde não classificado: a escala de cor significa dado
 *  classificado, então "Other" não pode roubar o topo dela. */
function unclassified(t) {
  t = Math.max(0, Math.min(1, t));
  const c = Math.round(214 - t * 74);
  return `rgb(${c} ${c} ${c - 4})`;
}

/** Texto legível sobre uma cor da escala (o extremo amarelo pede tinta escura). */
function inkOn(t) {
  return t > 0.62 ? "var(--ink)" : "var(--paper)";
}

/* ---------- Matriz ---------- */

/** Eixos estáveis: valores presentes no acervo inteiro, do mais frequente ao menos.
 *  "Other" vai sempre para o fim — é o resto, não um eixo de navegação. */
function axisValues(data, key) {
  const count = {};
  data.forEach((d) => getVals(d, key).forEach((v) => { count[v] = (count[v] || 0) + 1; }));
  return Object.entries(count).sort(byFrequencyOtherLast).map((e) => e[0]);
}

function crossCount(rows, keyRow, keyCol) {
  const m = {};
  rows.forEach((d) => {
    const rs = getVals(d, keyRow), cs = getVals(d, keyCol);
    rs.forEach((r) => cs.forEach((c) => {
      m[r] = m[r] || {};
      m[r][c] = (m[r][c] || 0) + 1;
    }));
  });
  return m;
}

/**
 * Desenha a matriz.
 * @param {object} opts  {all, shown, active:{technology,tissue}, onPick, paint}
 */
function renderMatrix(opts) {
  const el = document.getElementById("matrix");
  if (!el) return;
  const techs = axisValues(opts.all, "technology");
  const tissues = axisValues(opts.all, "tissue");
  if (!techs.length || !tissues.length) {
    el.innerHTML = `<p class="state-empty">${t("matrix.empty")}</p>`;
    el.style.gridTemplateColumns = "1fr";
    return;
  }

  const full = crossCount(opts.all, "technology", "tissue");
  const now = crossCount(opts.shown, "technology", "tissue");

  // O máximo ignora o balde "Other": ele é o resto mal classificado e, sendo
  // sempre o maior, comprimiria toda a escala de cor da parte informativa.
  let max = 0, maxAll = 0;
  techs.forEach((r) => tissues.forEach((c) => {
    const n = (full[r] && full[r][c]) || 0;
    maxAll = Math.max(maxAll, n);
    if (r !== "Other" && c !== "Other") max = Math.max(max, n);
  }));
  max = max || maxAll;

  const parts = [`<div class="m-corner"></div>`];
  tissues.forEach((c) => {
    parts.push(`<div class="m-col">${escapeHtml(showValue(c))}</div>`);
  });

  techs.forEach((r) => {
    parts.push(`<div class="m-row">${geoGlyph(r)}<span>${escapeHtml(showValue(r))}</span></div>`);
    tissues.forEach((c) => {
      const n = (now[r] && now[r][c]) || 0;
      // linear: as contagens são rasas (1 a 3), qualquer compressão achata tudo
      const ratio = max ? Math.min(1, n / max) : 0;
      const vague = r === "Other" || c === "Other";
      const on = opts.active.technology === r && opts.active.tissue === c;
      const style = n
        ? ` style="background:${vague ? unclassified(ratio) : viridis(ratio)};` +
          `color:${vague ? "var(--ink)" : inkOn(ratio)}"`
        : "";
      const label = t("matrix.cellLabel")
        .replace("{n}", n).replace("{tech}", showValue(r)).replace("{tissue}", showValue(c));
      parts.push(
        `<button type="button" class="m-cell${on ? " on" : ""}" data-n="${n}"` +
        ` data-tech="${escapeAttr(r)}" data-tissue="${escapeAttr(c)}"` +
        `${style} aria-label="${escapeAttr(label)}"${n ? "" : " tabindex=\"-1\""}>` +
        `${n || ""}</button>`
      );
    });
  });

  el.style.gridTemplateColumns = `minmax(132px, max-content) repeat(${tissues.length}, minmax(58px, 1fr))`;
  el.innerHTML = parts.join("");

  if (opts.paint) {
    el.classList.add("paint");
    el.querySelectorAll(".m-cell:not([data-n='0'])").forEach((c, i) => {
      c.style.animationDelay = Math.min(i * 9, 420) + "ms";
    });
    setTimeout(() => el.classList.remove("paint"), 1200);
  }

  el.querySelectorAll(".m-cell").forEach((b) => {
    if (b.dataset.n === "0") return;
    b.addEventListener("click", () => opts.onPick(b.dataset.tech, b.dataset.tissue));
  });
}

/* ---------- Leitores ---------- */

const READOUTS = [
  { key: "organism", label: "readout.organism", top: 4 },
  { key: "isTumor",  label: "readout.tumor",    top: 3 },
  { key: "heImage",  label: "readout.he",       top: 4 },
  { key: "access",   label: "readout.access",   top: 4 },
];

function tally(rows, key) {
  const count = {};
  let unknown = 0;
  rows.forEach((d) => {
    const vals = getVals(d, key);
    if (!vals.length) { unknown++; return; }
    vals.forEach((v) => { count[v] = (count[v] || 0) + 1; });
  });
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return { sorted, unknown };
}

function renderReadouts(rows) {
  const host = document.getElementById("readouts");
  if (!host) return;
  host.innerHTML = READOUTS.map((r) => {
    const { sorted, unknown } = tally(rows, r.key);
    const top = sorted.slice(0, r.top);
    const rest = sorted.slice(r.top).reduce((s, e) => s + e[1], 0);
    const items = top.map((e, i) => ({
      name: showValue(e[0]),
      n: e[1],
      // faixa estreita da escala para manter contraste entre categorias
      color: viridis(0.08 + (top.length > 1 ? (i / (top.length - 1)) * 0.74 : 0.4)),
    }));
    if (rest) items.push({ name: t("readout.rest"), n: rest, color: "var(--hairline-strong)" });
    if (unknown) items.push({ name: t("readout.unknown"), n: unknown, color: "var(--hairline)" });

    const total = items.reduce((s, it) => s + it.n, 0) || 1;
    const bar = items.map((it) =>
      `<span style="width:${(it.n / total) * 100}%;background:${it.color}"></span>`).join("");
    const keys = items.map((it) =>
      `<li><i style="background:${it.color}"></i>${escapeHtml(it.name)} <b>${it.n}</b></li>`).join("");

    return `<div class="readout"><h3>${t(r.label)}</h3>` +
           `<div class="bar">${bar}</div><ul class="keys">${keys}</ul></div>`;
  }).join("");
}
