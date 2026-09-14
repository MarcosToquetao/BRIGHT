/* ============================================================
   BRIGHT — Configuração
   ============================================================
   O catálogo agora vive versionado no próprio repositório
   (data/catalog.json). Alterações entram por pull request, onde
   o diff pode ser revisado antes de ir ao ar.

   A planilha do Google continua sendo a porta de entrada das
   submissões humanas (Forms → aba "Pendentes"); elas são
   incorporadas ao catálogo na revisão semanal.
   ============================================================ */

window.BRIGHT_CONFIG = {
  // Catálogo curado: datasets e coleções.
  CATALOG_URL: "data/catalog.json",

  // Bancos e portais agregadores — não são datasets, são lugares
  // onde procurar. Aparecem na seção "Onde mais procurar".
  PORTALS_URL: "data/portais.json",

  // Link do formulário de submissão (Google Forms).
  SUBMIT_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSemDS8Ufza6Vx8tk-Vk48fUKoBhYX5uexDVCUlViMQznOrEBg/viewform",

  // Idioma padrão ao abrir o site ("pt" ou "en").
  DEFAULT_LANG: "pt",
};
