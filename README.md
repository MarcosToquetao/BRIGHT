# BRIGHT

**Brazilian Resource for Integrated Genomics, Histology and Transcriptomics**

Catálogo aberto de datasets de **transcriptômica espacial**. Site estático
(HTML/CSS/JS) que lê os metadados de uma planilha Google Sheets e os exibe em
tabela com filtros, páginas de detalhe e um dashboard interativo.

> O site **não hospeda os dados** — apenas metadados e os links para download.

🌐 **Site:** https://marcostoquetao.github.io/BRIGHT/

## Recursos

- Catálogo pesquisável com filtros por tecnologia, tecido, organismo, câncer, acesso, etc.
- Páginas de detalhe por dataset com links de download e artigo.
- Dashboard interativo (Chart.js) com gráficos de resumo.
- Interface bilíngue (PT/EN).
- Formulário de submissão (Google Forms) com publicação automática.

## Como contribuir com um dataset

Use o formulário de submissão linkado no site (aba **Submeter**). As respostas
são revisadas/publicadas e aparecem automaticamente no catálogo.

## Documentação

Veja [`docs/GUIA.md`](docs/GUIA.md) para detalhes de configuração, conexão com o
Google Sheets, geração do formulário e publicação.

## Tecnologia

Site estático — sem build. Basta servir os arquivos. Hospedado no GitHub Pages.
