/* ============================================================
   BRIGHT — Textos da interface (PT/EN)
   ============================================================
   Duas camadas:
   - BRIGHT_I18N  : textos da interface.
   - BRIGHT_VALUES: tradução dos vocabulários controlados. O valor
     canônico nos dados é sempre o inglês (Brain, Human, Paired);
     aqui ele ganha uma forma exibível em português. A busca
     considera as duas formas.
   ============================================================ */

window.BRIGHT_I18N = {
  pt: {
    "site.tagline": "Catálogo de transcriptômica espacial",
    "nav.catalog": "Catálogo",
    "nav.submit": "Submeter",
    "nav.about": "Sobre",

    "lead.text": "Metadados de datasets públicos de transcriptômica espacial, reunidos para você decidir rápido se um dado serve para o seu trabalho. Os dados ficam nos repositórios de origem. Aqui está o caminho até eles.",

    "matrix.title": "Onde existe dado",
    "matrix.hint": "Cada célula cruza uma tecnologia com um tecido. Clique para filtrar.",
    "matrix.legendLow": "menos",
    "matrix.legendHigh": "mais",
    "matrix.empty": "Nenhum dado no recorte atual.",
    "matrix.cellLabel": "{n} em {tech} · {tissue}",

    "readout.organism": "Organismo",
    "readout.tumor": "Tumoral",
    "readout.he": "Imagem H&E",
    "readout.access": "Acesso",
    "readout.unknown": "não informado",
    "readout.rest": "demais",

    "search.placeholder": "Buscar por estudo, autor, tecido, DOI…",
    "filters.onlyLink": "Só com link de download",
    "filters.onlyHE": "Só com imagem H&E",
    "filters.clear": "Limpar",
    "filters.all": "Todos",
    "results.count": "{n} de {total} datasets",
    "results.one": "1 de {total} datasets",

    "table.study": "Estudo",
    "table.tech": "Tecnologia",
    "table.tissue": "Tecido",
    "table.tumor": "Tumor",
    "table.organism": "Organismo",
    "table.samples": "Amostras",
    "table.he": "H&E",
    "table.access": "Acesso",
    "table.year": "Ano",
    "table.empty": "Nenhum dataset corresponde a esses filtros.",
    "table.loading": "Carregando catálogo…",
    "table.sortHint": "Ordenar por esta coluna",
    "table.collection": "coleção",

    "gap.note": "{n} dos {total} datasets já têm link direto para download. Estamos recuperando os demais a partir dos repositórios de origem.",

    "detail.back": "Voltar ao catálogo",
    "detail.download": "Baixar no repositório",
    "detail.article": "Ler o artigo",
    "detail.noLink": "Link de download ainda não recuperado para este dataset.",
    "detail.section.overview": "Visão geral",
    "detail.section.technical": "Detalhes técnicos",
    "detail.section.access": "Acesso e proveniência",
    "detail.section.notes": "Observações",
    "detail.notfound": "Dataset não encontrado.",
    "detail.provenance": "Como sabemos disso",
    "detail.provenanceLead": "A origem de cada campo deste registro.",
    "detail.isCollection": "Este registro é uma coleção: reúne amostras de vários estudos, por isso as amostras dele não entram na soma do catálogo.",

    "portals.title": "Onde mais procurar",
    "portals.lead": "Não encontrou aqui? Estes bancos agregam dados de transcriptômica espacial com escopos diferentes do nosso.",

    "submit.title": "Submeter um dataset",
    "submit.lead": "Conhece um dataset que deveria estar no catálogo? O formulário leva poucos minutos.",
    "submit.step1.title": "Preencha o formulário",
    "submit.step1.text": "Informe os metadados e, principalmente, o accession ou link do repositório onde o dado está depositado.",
    "submit.step2.title": "Revisão",
    "submit.step2.text": "Conferimos se o dataset existe, se os metadados batem com o repositório e se ele ainda não está no catálogo.",
    "submit.step3.title": "Publicação",
    "submit.step3.text": "Aprovado, o dataset entra no catálogo e passa a aparecer na busca e na matriz.",
    "submit.cta": "Abrir o formulário",

    "about.title": "Sobre o BRIGHT",
    "about.p1": "BRIGHT é um catálogo aberto de datasets de transcriptômica espacial. Ele reúne os metadados e os caminhos de download de estudos públicos, para que encontrar um dado adequado deixe de ser uma garimpagem na literatura.",
    "about.p2": "O BRIGHT não hospeda dados e não faz análise. Ele aponta para os repositórios oficiais de cada estudo. A análise é sua, no seu ambiente.",
    "about.p3": "Cada registro passa por conferência: o dataset precisa existir de fato no repositório indicado, e tecnologia, tecido, organismo, natureza tumoral e disponibilidade de imagem H&E precisam vir de uma fonte citável. Quando um campo não pôde ser confirmado, ele fica vazio, nunca preenchido por suposição.",
    "about.curation.title": "Curadoria",
    "about.curation.text": "Mantido por Marcos Lemes Toquetão. Revisão semanal da literatura e dos repositórios públicos.",
    "about.cite.title": "Como citar",
    "about.cite.text": "Cite sempre o estudo de origem e o repositório do dado. Se o BRIGHT ajudou a encontrá-lo, mencione o catálogo e a data da consulta.",
    "about.updated": "Atualizado em {date}",

    "footer.text": "Catálogo aberto de transcriptômica espacial",
  },

  en: {
    "site.tagline": "Spatial transcriptomics catalog",
    "nav.catalog": "Catalog",
    "nav.submit": "Submit",
    "nav.about": "About",

    "lead.text": "Metadata for public spatial transcriptomics datasets, gathered so you can decide quickly whether a dataset fits your work. The data stays in its source repositories. This is the route to it.",

    "matrix.title": "Where the data is",
    "matrix.hint": "Each cell crosses a technology with a tissue. Click to filter.",
    "matrix.legendLow": "fewer",
    "matrix.legendHigh": "more",
    "matrix.empty": "No data in the current selection.",
    "matrix.cellLabel": "{n} in {tech} · {tissue}",

    "readout.organism": "Organism",
    "readout.tumor": "Tumor",
    "readout.he": "H&E image",
    "readout.access": "Access",
    "readout.unknown": "not reported",
    "readout.rest": "others",

    "search.placeholder": "Search study, author, tissue, DOI…",
    "filters.onlyLink": "Only with download link",
    "filters.onlyHE": "Only with H&E image",
    "filters.clear": "Clear",
    "filters.all": "All",
    "results.count": "{n} of {total} datasets",
    "results.one": "1 of {total} datasets",

    "table.study": "Study",
    "table.tech": "Technology",
    "table.tissue": "Tissue",
    "table.tumor": "Tumor",
    "table.organism": "Organism",
    "table.samples": "Samples",
    "table.he": "H&E",
    "table.access": "Access",
    "table.year": "Year",
    "table.empty": "No dataset matches these filters.",
    "table.loading": "Loading catalog…",
    "table.sortHint": "Sort by this column",
    "table.collection": "collection",

    "gap.note": "{n} of {total} datasets already carry a direct download link. We are recovering the rest from their source repositories.",

    "detail.back": "Back to catalog",
    "detail.download": "Open in repository",
    "detail.article": "Read the article",
    "detail.noLink": "Download link not yet recovered for this dataset.",
    "detail.section.overview": "Overview",
    "detail.section.technical": "Technical details",
    "detail.section.access": "Access and provenance",
    "detail.section.notes": "Notes",
    "detail.notfound": "Dataset not found.",
    "detail.provenance": "How we know this",
    "detail.provenanceLead": "Where each field in this record came from.",
    "detail.isCollection": "This record is a collection: it bundles samples from several studies, so its samples are not added to the catalog total.",

    "portals.title": "Where else to look",
    "portals.lead": "Didn't find it here? These databases aggregate spatial transcriptomics data with a different scope from ours.",

    "submit.title": "Submit a dataset",
    "submit.lead": "Know a dataset that belongs in the catalog? The form takes a few minutes.",
    "submit.step1.title": "Fill in the form",
    "submit.step1.text": "Give the metadata and, above all, the accession or repository link where the data is deposited.",
    "submit.step2.title": "Review",
    "submit.step2.text": "We check that the dataset exists, that its metadata matches the repository, and that it isn't already catalogued.",
    "submit.step3.title": "Publication",
    "submit.step3.text": "Once approved, the dataset joins the catalog and appears in search and in the matrix.",
    "submit.cta": "Open the form",

    "about.title": "About BRIGHT",
    "about.p1": "BRIGHT is an open catalog of spatial transcriptomics datasets. It gathers the metadata and download routes of public studies, so that finding suitable data stops being a hunt through the literature.",
    "about.p2": "BRIGHT hosts no data and runs no analysis. It points at each study's official repository. The analysis is yours, in your own environment.",
    "about.p3": "Every record is checked: the dataset must actually exist in the stated repository, and technology, tissue, organism, tumor status and H&E image availability must come from a citable source. When a field could not be confirmed it is left empty, never filled in by assumption.",
    "about.curation.title": "Curation",
    "about.curation.text": "Maintained by Marcos Lemes Toquetão. Weekly review of the literature and of public repositories.",
    "about.cite.title": "How to cite",
    "about.cite.text": "Always cite the original study and the data repository. If BRIGHT helped you find it, mention the catalog and the date you consulted it.",
    "about.updated": "Updated {date}",

    "footer.text": "Open spatial transcriptomics catalog",
  },
};

/* ------------------------------------------------------------
   Vocabulários controlados. Chave = valor canônico (inglês),
   como está nos dados e na planilha. Nomes próprios de
   tecnologia não se traduzem.
   ------------------------------------------------------------ */
window.BRIGHT_VALUES = {
  pt: {
    // organism
    "Human": "Humano",
    "Mouse": "Camundongo",
    "Rat": "Rato",
    "Zebrafish": "Peixe-zebra",
    "Non-human primate": "Primata não humano",
    // tissue
    "Brain": "Cérebro",
    "Lung": "Pulmão",
    "Breast": "Mama",
    "Liver": "Fígado",
    "Kidney": "Rim",
    "Heart": "Coração",
    "Skin": "Pele",
    "Colon / Intestine": "Cólon / Intestino",
    "Pancreas": "Pâncreas",
    "Prostate": "Próstata",
    "Ovary": "Ovário",
    "Lymph node": "Linfonodo",
    "Bone marrow": "Medula óssea",
    "Muscle": "Músculo",
    "Spleen": "Baço",
    // isTumor / coregProtein
    "Yes": "Sim",
    "No": "Não",
    // cancerType
    "Breast carcinoma": "Carcinoma de mama",
    "Lung carcinoma": "Carcinoma de pulmão",
    "Colorectal": "Colorretal",
    "Prostate": "Próstata",
    "Pancreatic": "Pancreático",
    "Ovarian": "Ovariano",
    "Lymphoma": "Linfoma",
    "Hepatocellular": "Hepatocelular",
    "Renal": "Renal",
    // geneCoverage
    "Restricted panel (~300 genes)": "Painel restrito (~300 genes)",
    "Expanded panel (~5000 genes)": "Painel expandido (~5000 genes)",
    "Whole transcriptome": "Transcriptoma completo",
    "Multiple panels": "Múltiplos painéis",
    // heImage
    "Co-registered": "Corregistrada",
    "Paired": "Pareada",
    "None": "Ausente",
    // fixation
    "Fresh frozen": "Congelado a fresco",
    "Fixed frozen": "Fixado e congelado",
    // access
    "Public": "Público",
    "On request": "Sob solicitação",
    "Controlled": "Controlado",
    // genérico
    "Other": "Outro",
    // meses
    "January": "Janeiro", "February": "Fevereiro", "March": "Março",
    "April": "Abril", "May": "Maio", "June": "Junho",
    "July": "Julho", "August": "Agosto", "September": "Setembro",
    "October": "Outubro", "November": "Novembro", "December": "Dezembro",
  },
  en: {}, // o canônico já é o inglês
};
