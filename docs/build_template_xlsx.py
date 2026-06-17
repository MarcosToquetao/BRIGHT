# Gera a planilha-modelo do BRIGHT (BRIGHT_planilha_modelo.xlsx)
# Abas: Publicados, Pendentes, Listas (vocabulário) + dropdowns de validação.
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

OUT = r"C:\Users\Marcos Lemes\Code\Projects\BRIGHT\data\BRIGHT_planilha_modelo.xlsx"

# ---- Definição dos campos (na ordem das colunas) ----
# (key, comentário PT, multi?, options[])
FIELDS = [
    ("id", "ID único (número). Não repita.", False, None),
    ("title", "Título do estudo (texto).", False, None),
    ("organism", "Organismo — MÚLTIPLO: separe vários por ;", True,
     ["Human", "Mouse", "Rat", "Zebrafish", "Non-human primate", "Other"]),
    ("tissue", "Tecido — MÚLTIPLO: separe vários por ;", True,
     ["Brain", "Lung", "Breast", "Liver", "Kidney", "Heart", "Skin",
      "Colon / Intestine", "Pancreas", "Prostate", "Ovary", "Lymph node",
      "Bone marrow", "Muscle", "Spleen", "Other"]),
    ("isTumor", "Amostra tumoral? (Yes/No).", False, ["Yes", "No"]),
    ("cancerType", "Tipo de câncer — MÚLTIPLO: separe por ;", True,
     ["Breast carcinoma", "Lung carcinoma", "Glioblastoma", "Colorectal",
      "Prostate", "Melanoma", "Pancreatic", "Ovarian", "Lymphoma",
      "Hepatocellular", "Renal", "Other"]),
    ("technology", "Tecnologia de transcriptômica espacial — MÚLTIPLO: separe por ;", True,
     ["Visium", "Visium HD", "Xenium", "MERFISH", "Slide-seq", "Slide-seqV2",
      "Stereo-seq", "CosMx", "GeoMx", "seqFISH", "seqFISH+", "DBiT-seq",
      "Open-ST", "Other"]),
    ("geneCoverage", "Cobertura de genes — MÚLTIPLO: separe por ;", True,
     ["Restricted panel (~300 genes)", "Expanded panel (~5000 genes)",
      "Whole transcriptome", "Multiple panels", "Other"]),
    ("panelGeneCount", "Nº de genes do painel (número; deixe vazio se transcriptoma total).", False, None),
    ("coregProtein", "Proteína corregistrada? (Yes/No).", False, ["Yes", "No"]),
    ("heImage", "Imagem H&E (Co-registered / Paired / None).", False,
     ["Co-registered", "Paired", "None"]),
    ("fixation", "Tipo de fixação — MÚLTIPLO: separe por ;", True,
     ["FFPE", "Fresh frozen", "Fixed frozen", "Other"]),
    ("numSamples", "Nº de amostras (número).", False, None),
    ("access", "Disponibilidade de acesso — MÚLTIPLO: separe por ;", True,
     ["Public", "On request", "Controlled", "Other"]),
    ("repositoryUrl", "Link de download dos dados (GEO, Zenodo, etc.).", False, None),
    ("articleUrl", "Link do artigo.", False, None),
    ("doi", "DOI.", False, None),
    ("authors", "Autores.", False, None),
    ("pubYear", "Ano de publicação (número).", False, None),
    ("pubMonth", "Mês de publicação.", False,
     ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"]),
    ("submittedBy", "Submetido por.", False, None),
    ("contactEmail", "E-mail de contato.", False, None),
    ("notes", "Observações livres.", False, None),
]

# Larguras especiais por key
WIDTHS = {
    "id": 6, "title": 42, "tissue": 22, "cancerType": 20, "technology": 28,
    "geneCoverage": 26, "panelGeneCount": 16, "coregProtein": 18, "heImage": 16,
    "fixation": 16, "numSamples": 14, "access": 22, "repositoryUrl": 32,
    "articleUrl": 28, "doi": 24, "authors": 26, "pubYear": 14, "pubMonth": 16,
    "submittedBy": 18, "contactEmail": 22, "notes": 40, "organism": 18, "isTumor": 14,
}

# Exemplos (apague na planilha real)
EXAMPLES = [
    ["1", "Spatial atlas of the human breast tumor microenvironment", "Human", "Breast",
     "Yes", "Breast carcinoma", "Visium; Visium HD", "Whole transcriptome", "",
     "No", "Co-registered", "FFPE", "12", "Public",
     "https://www.ncbi.nlm.nih.gov/geo/", "https://doi.org/...", "10.1038/...",
     "Silva A; Souza B", "2023", "March", "Equipe BRIGHT", "curadoria@bright.org",
     "EXEMPLO — apague e insira seus dados."],
    ["2", "GeoMx digital spatial profiling of melanoma immune niches", "Human",
     "Skin; Lymph node", "Yes", "Melanoma", "GeoMx", "Expanded panel (~5000 genes)",
     "1800", "Yes", "Co-registered", "FFPE", "14", "On request; Controlled",
     "https://zenodo.org/record/...", "https://doi.org/...", "10.1158/...",
     "Cardoso R; Mendes S", "2023", "May", "Equipe BRIGHT", "curadoria@bright.org",
     "EXEMPLO de campos múltiplos (tecido e acesso)."],
    ["3", "Single-cell resolution mapping of mouse cortex with Xenium", "Mouse",
     "Brain", "No", "", "Xenium", "Restricted panel (~300 genes)", "247", "No",
     "Paired", "Fresh frozen", "6", "Public", "https://zenodo.org/record/...",
     "https://doi.org/...", "10.1016/...", "Pereira D; Almeida E", "2024", "January",
     "Equipe BRIGHT", "curadoria@bright.org", "EXEMPLO — apague."],
]

FONT = "Arial"
HEADER_FILL = PatternFill("solid", fgColor="1C6FB3")
MULTI_FILL = PatternFill("solid", fgColor="EDE7FD")
HEADER_FONT = Font(name=FONT, bold=True, color="FFFFFF", size=11)
thin = Side(style="thin", color="C3D8EA")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook()

# ---------- Aba Listas (vocabulário) ----------
listas = wb.active
listas.title = "Listas"
list_fields = [f for f in FIELDS if f[3]]  # só os que têm opções
col_range = {}  # key -> (col_letter, n_options)
for ci, (key, _c, _m, opts) in enumerate(list_fields, start=1):
    col = get_column_letter(ci)
    cell = listas.cell(row=1, column=ci, value=key)
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = Alignment(horizontal="center")
    for ri, opt in enumerate(opts, start=2):
        listas.cell(row=ri, column=ci, value=opt).font = Font(name=FONT, size=10)
    listas.column_dimensions[col].width = max(14, min(30, max(len(o) for o in opts) + 2))
    col_range[key] = (col, len(opts))
listas.sheet_view.showGridLines = True
listas.freeze_panes = "A2"


def build_data_sheet(ws, with_examples):
    # Cabeçalho (keys internas — exigido pelo site)
    for ci, (key, comment, multi, opts) in enumerate(FIELDS, start=1):
        col = get_column_letter(ci)
        c = ws.cell(row=1, column=ci, value=key)
        c.font = HEADER_FONT
        c.fill = MULTI_FILL if multi else HEADER_FILL
        if multi:
            c.font = Font(name=FONT, bold=True, color="4B2FB0", size=11)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = BORDER
        note = comment + ("" if not opts else "")
        cm = Comment(note, "BRIGHT")
        cm.width = 240
        cm.height = 90
        c.comment = cm
        ws.column_dimensions[col].width = WIDTHS.get(key, 18)
    # Exemplos
    if with_examples:
        for ex in EXAMPLES:
            ws.append(ex)
        for r in range(2, 2 + len(EXAMPLES)):
            for ci in range(1, len(FIELDS) + 1):
                ws.cell(row=r, column=ci).font = Font(name=FONT, size=10, italic=True, color="6A829B")
    ws.freeze_panes = "B2"
    ws.row_dimensions[1].height = 22

    # Validações de dados
    last = 600
    for ci, (key, comment, multi, opts) in enumerate(FIELDS, start=1):
        if not opts:
            continue
        col = get_column_letter(ci)
        rng, n = col_range[key]
        formula = f"Listas!${rng}$2:${rng}${1 + n}"
        if multi:
            dv = DataValidation(type="list", formula1=formula, allow_blank=True,
                                showErrorMessage=False)
            dv.promptTitle = "Campo múltiplo"
            dv.prompt = "Escolha uma opção ou digite várias separadas por ; (ex.: Visium; Visium HD)"
            dv.showInputMessage = True
        else:
            dv = DataValidation(type="list", formula1=formula, allow_blank=True,
                                showErrorMessage=True)
            dv.errorTitle = "Valor inválido"
            dv.error = "Selecione uma das opções da lista."
            dv.errorStyle = "stop"
        ws.add_data_validation(dv)
        dv.add(f"{col}2:{col}{last}")


pub = wb.create_sheet("Publicados", 0)  # primeira aba
build_data_sheet(pub, with_examples=True)
pen = wb.create_sheet("Pendentes")
build_data_sheet(pen, with_examples=False)

# Ordem das abas: Publicados, Pendentes, Listas
wb.move_sheet("Listas", offset=len(wb.sheetnames))
wb.active = wb["Publicados"]

wb.save(OUT)
print("OK:", OUT)
