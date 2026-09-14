#!/usr/bin/env python3
"""
BRIGHT — varredura automatica de datasets de transcriptomica espacial.

Busca DATASETS no GEO (nao artigos), extrai os campos minimos de forma
deterministica e citavel, deduplica por accession, e produz um PR sobre
data/catalog.json. Sem dependencias externas: so biblioteca padrao.

Subcomandos:
  discover  — rodada semanal: descobre, extrai, aplica o portao de admissao,
              escreve as adicoes propostas e atualiza o ledger.
  migrate   — passe unico: tenta recuperar o accession dos datasets ja
              publicados a partir do DOI, via Europe PMC. Aditivo apenas;
              nunca remove ou altera um campo existente.
  agreement — recalcula varredura/agreement.json a partir do historico de
              PRs mesclados (o git e o proprio registro de concordancia).

Uso:
  python3 scripts/varredura.py discover --dry-run
  python3 scripts/varredura.py migrate
  python3 scripts/varredura.py agreement
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_PATH = os.path.join(ROOT, "data", "catalog.json")
REVIEW_PATH = os.path.join(ROOT, "data", "review_queue.json")
LEDGER_PATH = os.path.join(ROOT, "varredura", "ledger.json")
AGREEMENT_PATH = os.path.join(ROOT, "varredura", "agreement.json")

MAINTAINER_NAME = "Marcos Lemes Toquetão"
MAINTAINER_EMAIL = "marcostoquetao@gmail.com"

NCBI_API_KEY = os.environ.get("NCBI_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
GEO_ACC = "https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi"
EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest"

# Termos de busca: uma tecnologia por consulta evita que uma so query
# gigante com OR perca precisao no ranking do E-utilities.
TECHNOLOGIES = [
    "Visium HD", "Visium", "Xenium", "MERFISH", "Slide-seq", "Slide-seqV2",
    "Stereo-seq", "Open-ST", "CosMx", "GeoMx", "seqFISH+", "seqFISH", "DBiT-seq",
]

# Ordem importa: o termo mais especifico primeiro (ex.: "Visium HD" antes de
# "Visium") para nao classificar Visium HD como Visium simples.
TECH_PATTERNS = [
    (re.compile(r"visium\s*hd", re.I), "Visium HD"),
    (re.compile(r"slide-?seq\s*v2", re.I), "Slide-seqV2"),
    (re.compile(r"slide-?seq(?!v2)", re.I), "Slide-seq"),
    (re.compile(r"stereo-?seq", re.I), "Stereo-seq"),
    (re.compile(r"open-?st\b", re.I), "Open-ST"),
    (re.compile(r"xenium", re.I), "Xenium"),
    (re.compile(r"merfish", re.I), "MERFISH"),
    (re.compile(r"cosmx", re.I), "CosMx"),
    (re.compile(r"geomx", re.I), "GeoMx"),
    (re.compile(r"seqfish\s*\+|seqfish\s*plus", re.I), "seqFISH+"),
    (re.compile(r"seqfish(?!\+)", re.I), "seqFISH"),
    (re.compile(r"dbit-?seq", re.I), "DBiT-seq"),
    (re.compile(r"\bvisium\b(?!\s*hd)", re.I), "Visium"),
]

ORGANISM_MAP = [
    (re.compile(r"homo sapiens", re.I), "Human"),
    (re.compile(r"mus musculus", re.I), "Mouse"),
    (re.compile(r"rattus norvegicus", re.I), "Rat"),
    (re.compile(r"danio rerio", re.I), "Zebrafish"),
    (re.compile(r"macaca|callithrix|chlorocebus|pan troglodytes|papio ", re.I), "Non-human primate"),
]

TISSUE_KEYWORDS = [
    (re.compile(r"\bbrain|cerebr|cortical|cortex\b", re.I), "Brain"),
    (re.compile(r"\blung|pulmonary\b", re.I), "Lung"),
    (re.compile(r"\bbreast|mammary\b", re.I), "Breast"),
    (re.compile(r"\bliver|hepat", re.I), "Liver"),
    (re.compile(r"\bkidney|renal\b", re.I), "Kidney"),
    (re.compile(r"\bheart|cardiac|myocard", re.I), "Heart"),
    (re.compile(r"\bskin|cutaneous|dermal\b", re.I), "Skin"),
    (re.compile(r"\bcolon|colorectal|intestin|gut\b", re.I), "Colon / Intestine"),
    (re.compile(r"\bpancrea", re.I), "Pancreas"),
    (re.compile(r"\bprostate\b", re.I), "Prostate"),
    (re.compile(r"\bovar", re.I), "Ovary"),
    (re.compile(r"lymph node", re.I), "Lymph node"),
    (re.compile(r"bone marrow", re.I), "Bone marrow"),
    (re.compile(r"\bmuscle|myofib", re.I), "Muscle"),
    (re.compile(r"\bspleen\b", re.I), "Spleen"),
]

TUMOR_YES = re.compile(r"tumor|tumour|cancer|carcinoma|malignan|neoplas|oncolog", re.I)
TUMOR_NO = re.compile(r"\bhealthy\b|\bnormal tissue\b|non-tumou?r|control tissue", re.I)

CANCER_KEYWORDS = [
    (re.compile(r"breast (carcinoma|cancer)", re.I), "Breast carcinoma"),
    (re.compile(r"lung (carcinoma|cancer)|nsclc|sclc", re.I), "Lung carcinoma"),
    (re.compile(r"glioblastoma|\bgbm\b", re.I), "Glioblastoma"),
    (re.compile(r"colorectal (carcinoma|cancer)", re.I), "Colorectal"),
    (re.compile(r"prostate (carcinoma|cancer)", re.I), "Prostate"),
    (re.compile(r"melanoma", re.I), "Melanoma"),
    (re.compile(r"pancreatic (carcinoma|cancer|adenocarcinoma)", re.I), "Pancreatic"),
    (re.compile(r"ovarian (carcinoma|cancer)", re.I), "Ovarian"),
    (re.compile(r"lymphoma", re.I), "Lymphoma"),
    (re.compile(r"hepatocellular", re.I), "Hepatocellular"),
    (re.compile(r"renal cell carcinoma|\brcc\b", re.I), "Renal"),
]

FIXATION_KEYWORDS = [
    (re.compile(r"\bFFPE\b|formalin-fixed", re.I), "FFPE"),
    (re.compile(r"fresh.?frozen", re.I), "Fresh frozen"),
    (re.compile(r"fixed.?frozen", re.I), "Fixed frozen"),
]

# Presenca destes arquivos na amostra do GEO e a saida padrao do Space
# Ranger para o slide de H&E corregistrado.
HE_COREGISTERED = re.compile(
    r"tissue_hires_image|tissue_lowres_image|scalefactors_json|"
    r"tissue_positions|aligned_fiducials|detected_tissue_image", re.I)
HE_PAIRED = re.compile(r"\.(tif|tiff|ndpi|svs|jpg|jpeg|png)(\.gz)?(?:\s|$)", re.I)

REQUIRED_FIELDS = ["technology", "tissue", "isTumor", "organism", "heImage"]


# ---------------------------------------------------------------- rede ----

def _sleep_eutils():
    time.sleep(0.11 if NCBI_API_KEY else 0.34)


def _get(url, params=None, retries=2, timeout=15):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "BRIGHT-varredura/1.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", errors="replace")
        except (urllib.error.URLError, TimeoutError):
            if attempt == retries - 1:
                raise
            time.sleep(1.0 * (attempt + 1))


def eutils_esearch(term, mindate, maxdate):
    params = {
        "db": "gds", "retmode": "json", "retmax": "300",
        "term": f'{term} AND gse[Entry Type] AND ("{mindate}"[PDAT] : "{maxdate}"[PDAT])',
    }
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY
    body = _get(f"{EUTILS}/esearch.fcgi", params)
    _sleep_eutils()
    return json.loads(body).get("esearchresult", {}).get("idlist", [])


def eutils_esummary(uids):
    out = {}
    for i in range(0, len(uids), 100):
        chunk = uids[i:i + 100]
        params = {"db": "gds", "retmode": "json", "id": ",".join(chunk)}
        if NCBI_API_KEY:
            params["api_key"] = NCBI_API_KEY
        body = _get(f"{EUTILS}/esummary.fcgi", params)
        _sleep_eutils()
        result = json.loads(body).get("result", {})
        for uid in result.get("uids", []):
            out[uid] = result[uid]
    return out


def geo_soft_text(acc, targ):
    url = f"{GEO_ACC}?acc={acc}&targ={targ}&form=text&view=brief"
    body = _get(url)
    _sleep_eutils()
    return body


def epmc_search(query, page_size=25):
    params = {"query": query, "format": "json", "pageSize": str(page_size), "resultType": "core"}
    body = _get(f"{EPMC}/search", params)
    time.sleep(0.2)
    return json.loads(body).get("resultList", {}).get("result", [])


# --------------------------------------------------------- extracao -----

def match_first(patterns, text):
    for pat, label in patterns:
        m = pat.search(text)
        if m:
            return label, m.group(0)
    return None, None


def field(value, source, evidence, method):
    return {"value": value, "source": source, "evidence": evidence, "method": method}


def extract_technology(summary_text, gse_acc):
    label, hit = match_first(TECH_PATTERNS, summary_text)
    if not label:
        return None
    return field(label, f"{GEO_ACC}?acc={gse_acc}&targ=self&form=text",
                 snippet(summary_text, hit), "regex")


def extract_organism(taxon, gse_acc):
    label, hit = match_first(ORGANISM_MAP, taxon or "")
    if not label:
        return None
    return field(label, f"{GEO_ACC}?acc={gse_acc}&targ=self&form=text",
                 f"Series_taxon = {taxon}", "deterministic")


def extract_tissue(text, gse_acc):
    label, hit = match_first(TISSUE_KEYWORDS, text)
    if not label:
        return None
    return field(label, f"{GEO_ACC}?acc={gse_acc}&targ=self&form=text",
                 snippet(text, hit), "keyword")


def extract_is_tumor(text, gse_acc):
    if TUMOR_YES.search(text) and not TUMOR_NO.search(text):
        m = TUMOR_YES.search(text)
        return field("Yes", f"{GEO_ACC}?acc={gse_acc}&targ=self&form=text", snippet(text, m.group(0)), "keyword")
    if TUMOR_NO.search(text) and not TUMOR_YES.search(text):
        m = TUMOR_NO.search(text)
        return field("No", f"{GEO_ACC}?acc={gse_acc}&targ=self&form=text", snippet(text, m.group(0)), "keyword")
    return None


def extract_cancer_type(text):
    label, hit = match_first(CANCER_KEYWORDS, text)
    return label


def extract_fixation(text, gse_acc):
    label, hit = match_first(FIXATION_KEYWORDS, text)
    if not label:
        return None
    return field(label, f"{GEO_ACC}?acc={gse_acc}&targ=self&form=text", snippet(text, hit), "keyword")


def extract_he(gse_acc, gsm_accessions):
    """Cruza os arquivos suplementares de cada amostra da serie.
    Corregistrada > pareada > ausente; qualquer amostra que suba de nivel
    decide a serie inteira."""
    best = None
    best_evidence = None
    for gsm in gsm_accessions[:12]:  # amostra: series com centenas de GSMs nao precisam de todas
        text = geo_soft_text(gsm, "self")
        files = "\n".join(l for l in text.splitlines() if "supplementary_file" in l.lower())
        if HE_COREGISTERED.search(files):
            m = HE_COREGISTERED.search(files)
            return field("Co-registered", f"{GEO_ACC}?acc={gsm}&targ=self&form=text",
                         snippet(files, m.group(0)), "filename")
        if HE_PAIRED.search(files) and best != "Paired":
            m = HE_PAIRED.search(files)
            best, best_evidence = "Paired", (gsm, snippet(files, m.group(0)))
    if best == "Paired":
        gsm, ev = best_evidence
        return field("Paired", f"{GEO_ACC}?acc={gsm}&targ=self&form=text", ev, "filename")
    return field("None", f"{GEO_ACC}?acc={gse_acc}&targ=gsm&form=text",
                 "Nenhum arquivo de imagem nos suplementares amostrados", "filename")


def snippet(text, needle, width=110):
    i = text.lower().find(needle.lower())
    if i < 0:
        return needle
    start, end = max(0, i - width // 2), min(len(text), i + len(needle) + width // 2)
    return ("…" if start else "") + " ".join(text[start:end].split()) + ("…" if end < len(text) else "")


# ---------------------------------------------------------- accession ---

ACCESSION_PATTERNS = [
    re.compile(r"\bGSE\d{3,}\b"),
    re.compile(r"\bE-MTAB-\d+\b"),
    re.compile(r"\bsyn\d{5,}\b", re.I),
    re.compile(r"\bEGAS\d+\b"),
    re.compile(r"\bphs\d{6}\b"),
    re.compile(r"\bPRJNA\d+\b"),
]


def find_accessions(text):
    found = []
    for pat in ACCESSION_PATTERNS:
        found.extend(pat.findall(text))
    # normaliza capitalizacao (syn -> syn, o resto ja vem em maiusculas)
    return sorted(set(a if not a.lower().startswith("syn") else "syn" + a[3:] for a in found))


# -------------------------------------------------------------- ledger --

def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


def known_accessions(catalog, review, ledger):
    known = set()
    for d in catalog:
        acc = d.get("accession")
        if acc:
            known.add(acc)
    # itens ja na fila de revisao nao podem ser re-propostos toda semana; o
    # dono decide quando remove-los dali (resolvendo ou descartando)
    for d in review:
        acc = d.get("accession")
        if acc:
            known.add(acc)
    for acc, rec in ledger.items():
        if rec.get("status") in ("proposed", "rejected"):
            known.add(acc)
    return known


# ------------------------------------------------------------- discover -

def discover(args):
    catalog = load_json(CATALOG_PATH, [])
    review = load_json(REVIEW_PATH, [])
    ledger = load_json(LEDGER_PATH, {})
    known = known_accessions(catalog, review, ledger)

    mindate = args.since or (date.today() - timedelta(days=7)).isoformat()
    maxdate = args.until or date.today().isoformat()
    mindate_geo = mindate.replace("-", "/")
    maxdate_geo = maxdate.replace("-", "/")

    print(f"Buscando no GEO entre {mindate} e {maxdate}…", file=sys.stderr)
    uids = set()
    for tech in TECHNOLOGIES:
        term = f'"{tech}"[All Fields]'
        found = eutils_esearch(term, mindate_geo, maxdate_geo)
        print(f"  {tech}: {len(found)} série(s)", file=sys.stderr)
        uids.update(found)

    if not uids:
        print("Nada novo nesta janela.", file=sys.stderr)
        write_summary(args, [], [], catalog, review)
        return

    summaries = eutils_esummary(sorted(uids))
    # um unico contador para tudo que este run gera (catalogo OU revisao) —
    # senao, varios itens de revisao no mesmo run colidem no mesmo id
    existing_ids = [int(d["id"]) for d in catalog + review if str(d.get("id", "")).isdigit()]
    next_id = max(existing_ids + [0]) + 1
    new_catalog, new_review = [], []

    for uid, s in summaries.items():
        acc = s.get("accession", "")
        if not acc.startswith("GSE") or acc in known:
            continue
        known.add(acc)

        title = s.get("title", "")
        design = geo_soft_text(acc, "self")
        blob = f"{title}\n{s.get('summary', '')}\n{design}"

        prov = {}
        tech = extract_technology(blob, acc)
        organism = extract_organism(s.get("taxon", ""), acc)
        tissue = extract_tissue(blob, acc)
        tumor = extract_is_tumor(blob, acc)
        gsm_ids = [g["accession"] for g in s.get("samples", [])]
        he = extract_he(acc, gsm_ids) if gsm_ids else None
        fixation = extract_fixation(blob, acc)
        cancer_type = extract_cancer_type(blob) if (tumor and tumor["value"] == "Yes") else None

        for name, f_ in [("technology", tech), ("organism", organism), ("tissue", tissue),
                          ("isTumor", tumor), ("heImage", he), ("fixation", fixation)]:
            if f_:
                prov[name] = f_

        # citacoes: quem cita este accession, no GEO ou na literatura
        citations = []
        try:
            for hit in epmc_search(f'ACCESSION_ID:"{acc}"'):
                citations.append({
                    "doi": hit.get("doi", ""), "pmid": hit.get("pmid", ""),
                    "pmcid": hit.get("pmcid", ""), "title": hit.get("title", ""),
                    "role": "primary" if hit.get("pmid", "") in (s.get("pubmedids") or []) else "reuse",
                })
        except Exception as e:
            print(f"  aviso: Europe PMC falhou para {acc}: {e}", file=sys.stderr)

        primary = next((c for c in citations if c["role"] == "primary"), None)

        record = {
            "id": str(next_id),
            "accession": acc,
            "recordType": "dataset",
            "title": (primary or {}).get("title") or title,
            "organism": (organism or {}).get("value", ""),
            "tissue": (tissue or {}).get("value", ""),
            "isTumor": (tumor or {}).get("value", ""),
            "cancerType": cancer_type or "",
            "technology": (tech or {}).get("value", ""),
            "geneCoverage": "", "panelGeneCount": "",
            "coregProtein": "",
            "heImage": (he or {}).get("value", ""),
            "fixation": (fixation or {}).get("value", ""),
            "numSamples": str(s.get("n_samples", "")) or "",
            "access": "Public",
            "repositoryUrl": f"{GEO_ACC}?acc={acc}",
            "articleUrl": f"https://doi.org/{primary['doi']}" if primary and primary.get("doi") else "",
            "doi": primary.get("doi", "") if primary else "",
            "authors": primary.get("authorString", "") if primary else "",
            "pubYear": (s.get("pdat", "")[:4] or ""),
            "pubMonth": "",
            "submittedBy": "Varredura automática BRIGHT (GEO)",
            "contactEmail": MAINTAINER_EMAIL,
            "notes": "",
            "_provenance": {k: {"source": v["source"], "evidence": v["evidence"], "method": v["method"]}
                            for k, v in prov.items()},
        }
        record["_provenance"]["access"] = {
            "source": f"{GEO_ACC}?acc={acc}", "evidence": "Série pública do GEO", "method": "deterministic"}

        missing = [k for k in REQUIRED_FIELDS if not record.get(k)]
        deterministic_ok = tech and tech["method"] == "regex" and he and he["method"] == "filename"

        ledger[acc] = {
            "first_seen": date.today().isoformat(),
            "status": "proposed" if not missing and deterministic_ok else "review",
            "aliases": [s.get("bioproject", "")] + gsm_ids[:3],
            "citations": citations,
        }

        next_id += 1
        if not missing and deterministic_ok:
            new_catalog.append(record)
        else:
            record["_missing"] = missing or ["confiança insuficiente em technology/heImage"]
            new_review.append(record)

    if not args.dry_run:
        save_json(CATALOG_PATH, catalog + new_catalog)
        save_json(REVIEW_PATH, review + new_review)
        save_json(LEDGER_PATH, ledger)

    write_summary(args, new_catalog, new_review, catalog, review)


def write_summary(args, new_catalog, new_review, catalog, review):
    print(file=sys.stderr)
    print(f"admissíveis (vão para data/catalog.json): {len(new_catalog)}", file=sys.stderr)
    for r in new_catalog:
        print(f"  + {r['accession']}  {r['technology']:<12} {r['tissue']:<18} {r['title'][:60]}", file=sys.stderr)
    print(f"para revisão (vão para data/review_queue.json): {len(new_review)}", file=sys.stderr)
    for r in new_review:
        print(f"  ? {r['accession']}  faltando: {', '.join(r['_missing'])}  {r['title'][:50]}", file=sys.stderr)
    if args.dry_run:
        print("\n(--dry-run: nada foi escrito em disco)", file=sys.stderr)


# -------------------------------------------------------------- migrate -

def migrate(args):
    """Tenta recuperar o accession dos datasets ja publicados a partir do
    DOI, via Europe PMC (texto completo quando aberto). So adiciona;
    nunca remove ou reescreve um campo existente."""
    catalog = load_json(CATALOG_PATH, [])
    recovered, checked, skipped = 0, 0, 0
    candidates = [d for d in catalog
                  if not d.get("accession") and d.get("recordType") == "dataset" and (d.get("doi") or "").strip()]
    skipped = len(catalog) - len(candidates)
    print(f"{len(candidates)} datasets sem accession, com DOI, a verificar…", file=sys.stderr)

    for i, d in enumerate(candidates, 1):
        doi = d["doi"].strip()
        checked += 1
        print(f"  [{i}/{len(candidates)}] {doi} …", end=" ", file=sys.stderr, flush=True)
        try:
            hits = epmc_search(f'DOI:"{doi}"', page_size=1)
        except Exception as e:
            print(f"falhou ({e})", file=sys.stderr)
            continue
        if not hits:
            print("sem correspondência no EPMC", file=sys.stderr)
            continue
        hit = hits[0]
        text_blob = " ".join([hit.get("abstractText", ""), hit.get("title", "")])
        accs = find_accessions(text_blob)
        source = f"https://europepmc.org/article/{hit.get('source', 'MED')}/{hit.get('id', '')}"

        pmcid = hit.get("pmcid")
        if not accs and pmcid:
            try:
                xml = _get(f"{EPMC}/{pmcid}/fullTextXML", retries=1, timeout=12)
                accs = find_accessions(xml)
                time.sleep(0.2)
            except Exception:
                pass

        if accs:
            d["accession"] = accs[0]
            d.setdefault("_provenance", {})["accession"] = {
                "source": source, "evidence": f"Encontrado no texto: {accs[0]}", "method": "regex"}
            if len(accs) > 1:
                d["_provenance"]["accession"]["evidence"] += f" (outros candidatos: {', '.join(accs[1:])})"
            recovered += 1
            print(f"achado → {accs[0]}", file=sys.stderr)
        else:
            print("nenhum accession no texto", file=sys.stderr)

        # salva a cada 15 para nao perder trabalho se a rodada for interrompida
        if not args.dry_run and i % 15 == 0:
            save_json(CATALOG_PATH, catalog)

    print(f"\nrecuperados: {recovered}/{checked} verificados ({skipped} já tinham accession ou são coleção/portal)",
          file=sys.stderr)
    if not args.dry_run and recovered:
        save_json(CATALOG_PATH, catalog)
        print(f"gravado em {CATALOG_PATH}", file=sys.stderr)
    elif args.dry_run:
        print("(--dry-run: nada foi escrito em disco)", file=sys.stderr)


# ------------------------------------------------------------ agreement -

def agreement(args):
    """Recalcula varredura/agreement.json comparando, para cada PR
    mesclado que tocou data/catalog.json, o primeiro commit do branch
    contra o commit de merge: campo identico = aceito, campo alterado =
    corrigido. Sem historico de PRs ainda, o resultado fica vazio — e as
    categorias so passam a auto-publicar quando houver >=20 propostas e
    concordancia >=0.95 nos cinco campos obrigatorios."""
    import subprocess

    def sh(cmd):
        return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False).stdout

    merges = [l for l in sh(["git", "log", "--merges", "--format=%H %P"]).splitlines() if l.strip()]
    tally = {}  # categoria -> {campo -> [proposto, aceito]}

    for line in merges:
        parts = line.split()
        if len(parts) < 3:
            continue
        merge_commit, parent1, parent2 = parts[0], parts[1], parts[2]
        before = sh(["git", "show", f"{parent1}:data/catalog.json"])
        after = sh(["git", "show", f"{merge_commit}:data/catalog.json"])
        if not before or not after:
            continue
        try:
            before_map = {d["accession"]: d for d in json.loads(before) if d.get("accession")}
            after_map = {d["accession"]: d for d in json.loads(after) if d.get("accession")}
        except Exception:
            continue
        for acc, was in before_map.items():
            now = after_map.get(acc)
            if not now:
                continue
            prov = was.get("_provenance", {})
            cat = f"{was.get('technology', '?')}/{prov.get('heImage', {}).get('method', '?')}"
            bucket = tally.setdefault(cat, {})
            for f in REQUIRED_FIELDS:
                proposed, accepted = bucket.setdefault(f, [0, 0])
                bucket[f][0] = proposed + 1
                bucket[f][1] = accepted + (1 if was.get(f) == now.get(f) else 0)

    out = {}
    for cat, fields in tally.items():
        out[cat] = {}
        for f, (proposed, accepted) in fields.items():
            rate = accepted / proposed if proposed else 0
            out[cat][f] = {
                "proposed": proposed, "accepted": accepted, "rate": round(rate, 4),
                "auto_merge_eligible": proposed >= 20 and rate >= 0.95,
            }

    save_json(AGREEMENT_PATH, out)
    if not out:
        print("Sem histórico de PRs mesclados ainda — agreement.json fica vazio "
              "(nenhuma categoria auto-publica até acumular >=20 propostas).", file=sys.stderr)
    else:
        print(json.dumps(out, ensure_ascii=False, indent=2), file=sys.stderr)


# ------------------------------------------------------------------ cli -

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("discover", help="rodada semanal de descoberta no GEO")
    d.add_argument("--since", help="YYYY-MM-DD (default: 7 dias atrás)")
    d.add_argument("--until", help="YYYY-MM-DD (default: hoje)")
    d.add_argument("--dry-run", action="store_true", help="não escreve nada em disco")
    d.set_defaults(func=discover)

    m = sub.add_parser("migrate", help="recupera accession do acervo já publicado, via DOI")
    m.add_argument("--dry-run", action="store_true")
    m.set_defaults(func=migrate)

    a = sub.add_parser("agreement", help="recalcula a concordância a partir do histórico de PRs")
    a.set_defaults(func=agreement)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
