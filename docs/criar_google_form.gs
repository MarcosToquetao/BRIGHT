/**
 * BRIGHT — Gerador automático do formulário de submissão (Google Forms)
 * ---------------------------------------------------------------------
 * COMO USAR:
 *  1. Acesse  https://script.google.com  → "Novo projeto".
 *  2. Apague o conteúdo padrão e cole TODO este arquivo.
 *  3. (Opcional) Cole o ID da sua planilha em SHEET_ID abaixo para que as
 *     respostas caiam direto nela (numa aba nova "Respostas do formulário").
 *     O ID é o trecho da URL da planilha entre /d/ e /edit.
 *  4. Selecione a função  criarFormularioBRIGHT  e clique em ▶ Executar.
 *  5. Autorize o acesso quando pedir. Ao terminar, o log mostra o link de
 *     edição e o link público do formulário (use este último no site,
 *     em js/config.js → SUBMIT_FORM_URL).
 *
 *  Campos de SELEÇÃO MÚLTIPLA usam "Caixas de seleção" (marca vários).
 *  Campos de seleção única usam "Múltipla escolha"/"Lista".
 *  Toda lista controlada inclui a opção "Other" — oriente a detalhar em
 *  "Observações".
 */

// (opcional) cole o ID OU a URL completa da sua planilha do Google Sheets.
// Pode deixar vazio ("") — nesse caso o formulário é criado sem vincular,
// e você liga depois em: Respostas → Vincular a Planilhas.
var SHEET_ID = "";

function criarFormularioBRIGHT() {
  var form = FormApp.create("BRIGHT — Submissão de dataset de transcriptômica espacial");
  form.setDescription(
    "Contribua com o catálogo BRIGHT. Informe os metadados e os links de download " +
    "do dataset. Use as opções pré-definidas sempre que possível; quando nenhuma " +
    "servir, escolha \"Other\" e detalhe no campo Observações.\n\n" +
    "Submit a spatial transcriptomics dataset to the BRIGHT catalog."
  );
  form.setCollectEmail(false); // já pedimos o e-mail como pergunta
  form.setProgressBar(true);

  var O = {
    organism: ["Human", "Mouse", "Rat", "Zebrafish", "Non-human primate", "Other"],
    tissue: ["Brain", "Lung", "Breast", "Liver", "Kidney", "Heart", "Skin",
      "Colon / Intestine", "Pancreas", "Prostate", "Ovary", "Lymph node",
      "Bone marrow", "Muscle", "Spleen", "Other"],
    isTumor: ["Yes", "No"],
    cancerType: ["Breast carcinoma", "Lung carcinoma", "Glioblastoma", "Colorectal",
      "Prostate", "Melanoma", "Pancreatic", "Ovarian", "Lymphoma",
      "Hepatocellular", "Renal", "Other"],
    technology: ["Visium", "Visium HD", "Xenium", "MERFISH", "Slide-seq", "Slide-seqV2",
      "Stereo-seq", "CosMx", "GeoMx", "seqFISH", "seqFISH+", "DBiT-seq", "Open-ST", "Other"],
    geneCoverage: ["Restricted panel (~300 genes)", "Expanded panel (~5000 genes)",
      "Whole transcriptome", "Multiple panels", "Other"],
    coregProtein: ["Yes", "No"],
    heImage: ["Co-registered", "Paired", "None"],
    fixation: ["FFPE", "Fresh frozen", "Fixed frozen", "Other"],
    access: ["Public", "On request", "Controlled", "Other"],
    pubMonth: ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"]
  };

  // ----- helpers -----
  function txt(title, help, required) {
    var it = form.addTextItem().setTitle(title);
    if (help) it.setHelpText(help);
    it.setRequired(!!required);
    return it;
  }
  function para(title, help) {
    var it = form.addParagraphTextItem().setTitle(title);
    if (help) it.setHelpText(help);
    return it;
  }
  function choice(title, opts, help, required) { // seleção única
    var it = form.addMultipleChoiceItem().setTitle(title).setChoiceValues(opts);
    if (help) it.setHelpText(help);
    it.setRequired(!!required);
    return it;
  }
  function list(title, opts, help, required) { // lista suspensa única
    var it = form.addListItem().setTitle(title).setChoiceValues(opts);
    if (help) it.setHelpText(help);
    it.setRequired(!!required);
    return it;
  }
  function checks(title, opts, help, required) { // SELEÇÃO MÚLTIPLA
    var it = form.addCheckboxItem().setTitle(title).setChoiceValues(opts);
    it.setHelpText((help ? help + " " : "") + "Pode marcar mais de uma opção.");
    it.setRequired(!!required);
    return it;
  }

  // ----- perguntas (ordem = colunas da planilha, sem 'id') -----
  txt("Título do estudo / Study title", "", true);

  checks("Organismo / Organism", O.organism, "", true);
  checks("Tecido / Tissue", O.tissue, "", true);
  choice("Amostra tumoral? / Tumor sample?", O.isTumor, "", true);
  checks("Tipo de câncer / Cancer type", O.cancerType,
    "Preencha apenas se for amostra tumoral.", false);

  checks("Tecnologia de transcriptômica espacial / Spatial transcriptomics technology",
    O.technology, "", true);
  checks("Cobertura de genes / Gene coverage", O.geneCoverage, "", true);
  txt("Nº de genes do painel / Panel gene count",
    "Número aproximado. Deixe vazio se for transcriptoma total.", false);

  choice("Proteína corregistrada? / Co-registered protein?", O.coregProtein, "", true);
  choice("Imagem H&E / H&E image", O.heImage, "", true);
  checks("Tipo de fixação / Fixation type", O.fixation, "", true);
  txt("Nº de amostras / Number of samples", "", false);

  checks("Disponibilidade de acesso / Access availability", O.access, "", true);
  txt("Repositório de download / Download repository",
    "Link para baixar os dados (GEO, Zenodo, SRA, etc.).", true);
  txt("Artigo / Article", "Link do artigo, se houver.", false);
  txt("DOI", "", false);
  txt("Autores / Authors", "Separe por ; ou vírgula.", false);
  txt("Ano de publicação / Publication year", "", false);
  list("Mês de publicação / Publication month", O.pubMonth, "", false);

  txt("Submetido por / Submitted by", "Seu nome.", true);
  txt("E-mail de contato / Contact e-mail", "", true);
  para("Observações / Notes",
    "Qualquer detalhe relevante. Se escolheu \"Other\" em algum campo, descreva aqui.");

  // ----- destino das respostas -----
  var sid = extrairIdPlanilha(SHEET_ID);
  if (sid) {
    try {
      // valida que o ID realmente abre uma planilha antes de vincular
      SpreadsheetApp.openById(sid);
      form.setDestination(FormApp.DestinationType.SPREADSHEET, sid);
      Logger.log("Respostas vinculadas à planilha (ID: " + sid + ").");
    } catch (e) {
      Logger.log("AVISO: não consegui vincular à planilha (" + e.message + ").");
      Logger.log("O formulário foi criado mesmo assim — vincule manualmente em " +
        "Respostas → Vincular a Planilhas.");
    }
  }

  Logger.log("Formulário criado!");
  Logger.log("Link de EDIÇÃO: " + form.getEditUrl());
  Logger.log("Link PÚBLICO (use em js/config.js → SUBMIT_FORM_URL): " + form.getPublishedUrl());
}

/** Aceita o ID puro OU a URL completa da planilha e devolve só o ID. */
function extrairIdPlanilha(valor) {
  if (!valor) return "";
  valor = String(valor).trim();
  var m = valor.match(/\/d\/([a-zA-Z0-9-_]+)/); // formato .../d/<ID>/edit
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(valor)) return valor; // já é um ID
  return ""; // valor inválido → ignora e cria o form sem vincular
}
