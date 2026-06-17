/* ============================================================
   BRIGHT — Configuração
   ============================================================
   Para conectar ao seu Google Sheets real:
   1. No Google Sheets: Arquivo → Compartilhar → Publicar na web
      → escolha a aba "Publicados" → formato "CSV" → Publicar.
   2. Copie o link gerado e cole abaixo em GOOGLE_SHEET_CSV_URL.
   Enquanto estiver null, o site usa os dados de exemplo
   em data/sample.json para você visualizar tudo funcionando.
   ============================================================ */

window.BRIGHT_CONFIG = {
  // URL do CSV/TSV publicado do Google Sheets (aba "Publicados").
  // IMPORTANTE: precisa estar entre aspas. O site detecta sozinho se é
  // separado por vírgula (CSV) ou tab (TSV).
  GOOGLE_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTN4tCKbAeinYhG7Hr_UhTwtxnLmJdPY7Vu8C13i7tgdboKVWVcgkpmrRAjfn3TNAkmW8u_AxVINxGq/pub?gid=14863653&single=true&output=tsv",

  // Caminho dos dados de exemplo (fallback usado quando a URL acima é null).
  SAMPLE_DATA_URL: "data/sample.json",

  // Link do formulário de submissão (Google Forms).
  SUBMIT_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSemDS8Ufza6Vx8tk-Vk48fUKoBhYX5uexDVCUlViMQznOrEBg/viewform",

  // Idioma padrão ao abrir o site ("pt" ou "en").
  DEFAULT_LANG: "pt",
};
