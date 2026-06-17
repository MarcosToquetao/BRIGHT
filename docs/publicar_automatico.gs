/**
 * BRIGHT — Publicação automática das submissões
 * --------------------------------------------------------------
 * Copia automaticamente cada NOVA resposta do formulário para a
 * aba "Publicados", já no formato que o site entende (e atribui
 * um id sequencial). Assim você nunca mais copia/cola à mão.
 *
 * COMO INSTALAR (só uma vez):
 *  1. Abra a sua PLANILHA do Google Sheets (a que recebe as respostas).
 *  2. Menu  Extensões → Apps Script.
 *  3. Apague o conteúdo padrão e cole TODO este arquivo.
 *  4. Selecione a função  instalarGatilhoBRIGHT  e clique em ▶ Executar.
 *     Autorize quando pedir. (Só precisa fazer isso uma vez.)
 *  5. Pronto! A partir de agora, cada submissão do formulário cai
 *     sozinha em "Publicados" e aparece no site em poucos minutos.
 *
 * Observação: isto publica as submissões automaticamente (sem revisão
 * manual). Se algum dia quiser um passo de curadoria, troque
 * ABA_DESTINO para "Pendentes" e mova as aprovadas para "Publicados".
 */

var ABA_DESTINO = "Publicados";

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

// Ordem exata das colunas na aba "Publicados".
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
  garantirAbaPublicados_();
  Logger.log("BRIGHT: publicação automática ATIVADA. Novas respostas irão para \"" + ABA_DESTINO + "\".");
  try {
    SpreadsheetApp.getUi().alert("BRIGHT: publicação automática ativada!\nNovas submissões irão para a aba \"" + ABA_DESTINO + "\".");
  } catch (e) { /* sem UI quando rodado fora da planilha — tudo bem */ }
}

/** Disparada automaticamente a cada submissão do formulário. */
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
  var sheet = garantirAbaPublicados_();
  dados.id = Math.max(1, sheet.getLastRow()); // cabeçalho = linha 1 -> 1º id = 1
  var linha = COLUNAS.map(function (k) { return dados[k] != null ? dados[k] : ""; });
  sheet.appendRow(linha);
}

/** Garante que a aba "Publicados" existe e tem o cabeçalho correto. */
function garantirAbaPublicados_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_DESTINO);
  if (!sheet) sheet = ss.insertSheet(ABA_DESTINO);
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUNAS);
  return sheet;
}
