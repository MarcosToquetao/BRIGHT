/* ============================================================
   BRIGHT — Esquema de campos e vocabulários controlados
   ============================================================
   Cada campo tem:
   - key: nome interno (estável, usado no código e como cabeçalho
          de coluna na planilha do Google Sheets).
   - label: rótulo elegante bilíngue exibido ao usuário.
   - type: text | number | url | select
   - options: vocabulário controlado (para type "select").
   - multi: true  → seleção múltipla (um dataset pode ter vários
            valores neste campo). Na planilha, separe os valores
            por ponto-e-vírgula, ex.: "Visium; Xenium".
   - filter: se aparece como filtro no catálogo.

   Convenção: toda lista controlada inclui a opção "Other"
   (no formulário, oriente a pessoa a detalhar em Observações).
   ============================================================ */

window.BRIGHT_SCHEMA = [
  {
    key: "title",
    label: { pt: "Título do estudo", en: "Study title" },
    type: "text",
  },
  {
    key: "organism",
    label: { pt: "Organismo", en: "Organism" },
    type: "select",
    multi: true,
    filter: true,
    options: ["Human", "Mouse", "Rat", "Zebrafish", "Non-human primate", "Other"],
  },
  {
    key: "tissue",
    label: { pt: "Tecido", en: "Tissue" },
    type: "select",
    multi: true,
    filter: true,
    options: [
      "Brain", "Lung", "Breast", "Liver", "Kidney", "Heart", "Skin",
      "Colon / Intestine", "Pancreas", "Prostate", "Ovary", "Lymph node",
      "Bone marrow", "Muscle", "Spleen", "Other",
    ],
  },
  {
    key: "isTumor",
    label: { pt: "Amostra tumoral?", en: "Tumor sample?" },
    type: "select",
    filter: true,
    options: ["Yes", "No"],
  },
  {
    key: "cancerType",
    label: { pt: "Tipo de câncer", en: "Cancer type" },
    type: "select",
    multi: true,
    filter: true,
    options: [
      "Breast carcinoma", "Lung carcinoma", "Glioblastoma", "Colorectal",
      "Prostate", "Melanoma", "Pancreatic", "Ovarian", "Lymphoma",
      "Hepatocellular", "Renal", "Other",
    ],
  },
  {
    key: "technology",
    label: {
      pt: "Tecnologia de transcriptômica espacial",
      en: "Spatial transcriptomics technology",
    },
    type: "select",
    multi: true,
    filter: true,
    options: [
      "Visium", "Visium HD", "Xenium", "MERFISH", "Slide-seq",
      "Slide-seqV2", "Stereo-seq", "CosMx", "GeoMx", "seqFISH",
      "seqFISH+", "DBiT-seq", "Open-ST", "Other",
    ],
  },
  {
    key: "geneCoverage",
    label: { pt: "Cobertura de genes", en: "Gene coverage" },
    type: "select",
    multi: true,
    filter: true,
    options: [
      "Restricted panel (~300 genes)",
      "Expanded panel (~5000 genes)",
      "Whole transcriptome",
      "Multiple panels",
      "Other",
    ],
  },
  {
    key: "panelGeneCount",
    label: { pt: "Nº de genes do painel", en: "Panel gene count" },
    type: "number",
  },
  {
    key: "coregProtein",
    label: { pt: "Proteína corregistrada?", en: "Co-registered protein?" },
    type: "select",
    filter: true,
    options: ["Yes", "No"],
  },
  {
    key: "heImage",
    label: { pt: "Imagem H&E", en: "H&E image" },
    type: "select",
    filter: true,
    options: ["Co-registered", "Paired", "None"],
  },
  {
    key: "fixation",
    label: { pt: "Tipo de fixação", en: "Fixation type" },
    type: "select",
    multi: true,
    filter: true,
    options: ["FFPE", "Fresh frozen", "Fixed frozen", "Other"],
  },
  {
    key: "numSamples",
    label: { pt: "Nº de amostras", en: "Number of samples" },
    type: "number",
  },
  {
    key: "access",
    label: { pt: "Disponibilidade de acesso", en: "Access availability" },
    type: "select",
    multi: true,
    filter: true,
    options: ["Public", "On request", "Controlled", "Other"],
  },
  {
    key: "repositoryUrl",
    label: { pt: "Repositório de download", en: "Download repository" },
    type: "url",
  },
  {
    key: "articleUrl",
    label: { pt: "Artigo", en: "Article" },
    type: "url",
  },
  {
    key: "doi",
    label: { pt: "DOI", en: "DOI" },
    type: "text",
  },
  {
    key: "authors",
    label: { pt: "Autores", en: "Authors" },
    type: "text",
  },
  {
    key: "pubYear",
    label: { pt: "Ano de publicação", en: "Publication year" },
    type: "number",
    filter: true,
  },
  {
    key: "pubMonth",
    label: { pt: "Mês de publicação", en: "Publication month" },
    type: "select",
    options: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
  },
  {
    key: "submittedBy",
    label: { pt: "Submetido por", en: "Submitted by" },
    type: "text",
  },
  {
    key: "contactEmail",
    label: { pt: "E-mail de contato", en: "Contact e-mail" },
    type: "text",
  },
  {
    key: "notes",
    label: { pt: "Observações", en: "Notes" },
    type: "text",
  },
];
