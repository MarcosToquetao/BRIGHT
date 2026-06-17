/**
 * BRIGHT — Coleta de submissões + CURADORIA (aprovação manual)
 * --------------------------------------------------------------
 * Fluxo:
 *   1. Cada NOVA resposta do formulário cai sozinha na aba "Pendentes"
 *      (já formatada no padrão do site — você NÃO copia/cola nada).
 *   2. O site público lê SOMENTE a aba "Publicados". Portanto nada
 *      aparece no ar sem o seu aval.
 *   3. Para aprovar: selecione a(s) linha(s) na aba "Pendentes" e use o
 *      menu  BRIGHT → Publicar selecionadas. A linha é movida para
 *      "Publicados" com um id automático e some de "Pendentes".
 *      Para descartar: BRIGHT → Recusar selecionadas.
 *
 * COMO INSTALAR (só uma vez):
 *  1. Abra a sua PLANILHA do Google Sheets (a que recebe as respostas).
 *  2. Menu  Extensões → Apps Script.
 *  3. Apague o conteúdo padrão e cole TODO este arquivo. Salve.
 *  4. Selecione a função  instalarGatilhoBRIGHT  e clique em ▶ Executar.
 *     Autorize quando pedir. (Só precisa fazer isso uma vez.)
 *  5. Recarregue a planilha: vai aparecer o menu "BRIGHT" no topo.
 */

var ABA_PENDENTES  = "Pendentes";
var ABA_PUBLICADOS = "Publicados";

// Título da pergunta no formulário  ->  coluna interna do site.
var MAPA = {
  "Título do estudo / Study title": "title",
  "Organismo / Organism": "organism",
  "Tecido / Tissue": "tissue",
  "Amostra tumoral? / Tumor sample?": "isTumor",
  "Tipo de câncer / Cancer type": "cancerType",
  "Tecnologia de transcriptômica espacial / Spatial transcriptomics technology": "technology",
  "Cobertura de genes / Gene coverage": "geneCoverage",
  "Nº de genes do painel / Panel gene count": "panelGeneCount",
  "Proteína corregistrada? / Co-registered protein?": "coregProtein",
  "Imagem H&E / H&E image": "heImage",
  "Tipo de fixação / Fixation type": "fixation",
  "Nº de amostras / Number of samples": "numSamples",
  "Disponibilidade de acesso / Access availability": "access",
  "Repositório de download / Download repository": "repositoryUrl",
  "Artigo / Article": "articleUrl",
  "DOI": "doi",
  "Autores / Authors": "authors",
  "Ano de publicação / Publication year": "pubYear",
  "Mês de publicação / Publication month": "pubMonth",
  "Submetido por / Submitted by": "submittedBy",
  "E-mail de contato / Contact e-mail": "contactEmail",
  "Observações / Notes": "notes"
};

// Ordem exata das colunas (igual nas duas abas).
var COLUNAS = ["id", "title", "organism", "tissue", "isTumor", "cancerType",
  "technology", "geneCoverage", "panelGeneCount", "coregProtein", "heImage",
  "fixation", "numSamples", "access", "repositoryUrl", "articleUrl", "doi",
  "authors", "pubYear", "pubMonth", "submittedBy", "contactEmail", "notes"];

/** Rode esta função UMA vez para ativar a automação. */
function instalarGatilhoBRIGHT() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // remove gatilhos antigos desta automação (evita duplicar)
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "aoEnviarFormularioBRIGHT") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("aoEnviarFormularioBRIGHT")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  garantirAba_(ABA_PENDENTES);
  garantirAba_(ABA_PUBLICADOS);
  criarMenuBRIGHT_();
  Logger.log("BRIGHT: curadoria ATIVADA. Submissões vão para \"" + ABA_PENDENTES + "\"; aprove pelo menu BRIGHT.");
  try {
    SpreadsheetApp.getUi().alert(
      "BRIGHT: curadoria ativada!\n\n" +
      "• Novas submissões caem em \"" + ABA_PENDENTES + "\".\n" +
      "• Nada vai ao ar sem o seu aval.\n" +
      "• Para publicar: selecione a linha e use o menu BRIGHT → Publicar selecionadas.\n\n" +
      "Recarregue a planilha para ver o menu BRIGHT.");
  } catch (e) { /* sem UI quando rodado fora da planilha — tudo bem */ }
}

/** Cria o menu BRIGHT ao abrir a planilha (gatilho simples). */
function onOpen() { criarMenuBRIGHT_(); }

function criarMenuBRIGHT_() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("BRIGHT")
      .addItem("✅ Publicar selecionadas", "publicarSelecionadas")
      .addItem("🗑️ Recusar selecionadas", "recusarSelecionadas")
      .addToUi();
  } catch (e) { /* sem UI quando rodado fora da planilha */ }
}

/** Disparada automaticamente a cada submissão: grava em "Pendentes". */
function aoEnviarFormularioBRIGHT(e) {
  var nv = (e && e.namedValues) ? e.namedValues : {};
  var dados = {};
  for (var titulo in MAPA) {
    var valor = nv[titulo];
    if (valor && valor.length && String(valor[0]).trim() !== "") {
      // caixas de seleção vêm como "a, b, c" -> padroniza para "a; b; c"
      dados[MAPA[titulo]] = String(valor[0]).split(/\s*,\s*/).join("; ");
    } else {
      dados[MAPA[titulo]] = "";
    }
  }
  var sheet = garantirAba_(ABA_PENDENTES);
  dados.id = ""; // id só é atribuído na aprovação
  var linha = COLUNAS.map(function (k) { return dados[k] != null ? dados[k] : ""; });
  sheet.appendRow(linha);
}

/** Move as linhas selecionadas em "Pendentes" para "Publicados". */
function publicarSelecionadas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var origem = ss.getActiveSheet();
  var ui = SpreadsheetApp.getUi();
  if (origem.getName() !== ABA_PENDENTES) {
    ui.alert("Selecione as linhas na aba \"" + ABA_PENDENTES + "\" antes de publicar.");
    return;
  }
  var linhas = linhasSelecionadas_(origem);
  if (!linhas.length) { ui.alert("Nenhuma linha selecionada."); return; }

  var destino = garantirAba_(ABA_PUBLICADOS);
  var proximoId = proximoId_(destino);
  var ultimaCol = COLUNAS.length;
  var movidas = 0;

  // processa de baixo p/ cima para poder apagar sem bagunçar os índices
  linhas.sort(function (a, b) { return b - a; }).forEach(function (r) {
    if (r === 1) return; // nunca a linha de cabeçalho
    var valores = origem.getRange(r, 1, 1, ultimaCol).getValues()[0];
    valores[0] = proximoId++;            // coluna id
    destino.appendRow(valores);
    origem.deleteRow(r);
    movidas++;
  });

  ui.alert(movidas + " dataset(s) publicado(s)! Aparecem no site em alguns minutos.");
}

/** Apaga (recusa) as linhas selecionadas em "Pendentes". */
function recusarSelecionadas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var origem = ss.getActiveSheet();
  var ui = SpreadsheetApp.getUi();
  if (origem.getName() !== ABA_PENDENTES) {
    ui.alert("Selecione as linhas na aba \"" + ABA_PENDENTES + "\" para recusar.");
    return;
  }
  var linhas = linhasSelecionadas_(origem);
  if (!linhas.length) { ui.alert("Nenhuma linha selecionada."); return; }
  var resp = ui.alert("Recusar e apagar " + linhas.length + " linha(s)?",
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;
  linhas.sort(function (a, b) { return b - a; }).forEach(function (r) {
    if (r !== 1) origem.deleteRow(r);
  });
}

/** Lista os números de linha cobertos pela seleção atual. */
function linhasSelecionadas_(sheet) {
  var set = {};
  var ranges = sheet.getActiveRangeList() ? sheet.getActiveRangeList().getRanges() : [sheet.getActiveRange()];
  ranges.forEach(function (rg) {
    var ini = rg.getRow(), n = rg.getNumRows();
    for (var i = 0; i < n; i++) set[ini + i] = true;
  });
  return Object.keys(set).map(Number);
}

/** Próximo id sequencial com base na coluna id de "Publicados". */
function proximoId_(sheet) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return 1;
  var ids = sheet.getRange(2, 1, ultima - 1, 1).getValues();
  var max = 0;
  ids.forEach(function (r) {
    var n = parseInt(r[0], 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

/** Garante que a aba existe e tem o cabeçalho correto. */
function garantirAba_(nome) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nome);
  if (!sheet) sheet = ss.insertSheet(nome);
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUNAS);
  return sheet;
}
