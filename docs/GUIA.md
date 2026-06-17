# Guia do BRIGHT

Catálogo aberto de transcriptômica espacial. Site estático (HTML/CSS/JS) que lê os
dados de um Google Sheets e os exibe em tabela com filtros, páginas de detalhe e um
dashboard interativo. **O site não hospeda os dados — apenas metadados e links.**

---

## 1. Estrutura de arquivos

```
BRIGHT/
├── index.html          ← página única (catálogo, detalhe, dashboard, submeter, sobre)
├── css/styles.css      ← identidade visual (azul-claro, minimalista)
├── js/
│   ├── config.js       ← AQUI você cola a URL do Google Sheets e do formulário
│   ├── schema.js       ← campos do catálogo + vocabulários controlados
│   ├── i18n.js         ← textos da interface (PT/EN)
│   ├── app.js          ← carregamento de dados, filtros, catálogo, detalhe
│   └── dashboard.js    ← gráficos (Chart.js)
├── data/
│   ├── sample.json     ← dados de exemplo (usados enquanto o Sheets não está ligado)
│   └── template.csv    ← modelo de colunas para a planilha
├── assets/logo.svg
└── docs/GUIA.md        ← este arquivo
```

---

## 2. Como visualizar localmente

Como o site faz `fetch` de arquivos, abra com um servidor local (não com duplo-clique):

```bash
# dentro da pasta BRIGHT
python -m http.server 8000
```
Depois acesse <http://localhost:8000>.

---

## 3. Conectar ao Google Sheets

1. Crie uma planilha no Google Sheets com **uma aba "Publicados"**.
2. Na **primeira linha**, use exatamente os cabeçalhos do arquivo `data/template.csv`
   (id, title, organism, tissue, isTumor, cancerType, technology, geneCoverage,
   panelGeneCount, coregProtein, heImage, fixation, numSamples, access,
   repositoryUrl, articleUrl, doi, authors, pubYear, pubMonth, submittedBy,
   contactEmail, notes).
3. Preencha os datasets usando os valores dos vocabulários (ver `js/schema.js`).
   Dica: configure validação de dados (dropdown) nas colunas para padronizar.
   - **Campos de seleção múltipla** (tecnologia, tecido, tipo de câncer,
     organismo, cobertura de genes, fixação, acesso): para informar mais de um
     valor numa mesma célula, separe-os por **ponto-e-vírgula**, ex.:
     `Visium; Visium HD` ou `Skin; Lymph node`.
   - Toda lista controlada tem a opção **"Other"** — use-a quando nenhuma
     opção servir e detalhe em **Observações**.
4. Vá em **Arquivo → Compartilhar → Publicar na web**.
   - Selecione a aba **Publicados** e o formato **CSV**.
   - Clique em **Publicar** e copie a URL gerada.
5. Cole essa URL em `js/config.js`:
   ```js
   GOOGLE_SHEET_CSV_URL: "https://docs.google.com/.../pub?output=csv",
   ```
6. Recarregue o site — ele passa a ler os dados reais.

> Enquanto `GOOGLE_SHEET_CSV_URL` for `null`, o site usa `data/sample.json`.

---

## 4. Formulário de submissão (Google Forms)

**Forma mais fácil — geração automática:** use o script
`docs/criar_google_form.gs`, que monta o formulário inteiro para você.
1. Acesse <https://script.google.com> → "Novo projeto".
2. Apague o conteúdo padrão e cole todo o `criar_google_form.gs`.
3. (Opcional) cole o ID da planilha em `SHEET_ID` para as respostas caírem
   nela automaticamente.
4. Selecione a função `criarFormularioBRIGHT` e clique em ▶ Executar; autorize.
5. No log aparecem o link de edição e o **link público** — cole este último em
   `js/config.js` → `SUBMIT_FORM_URL`.

O script já configura: campos de **seleção múltipla** como "Caixas de seleção"
(tecnologia, tecido, tipo de câncer, organismo, cobertura, fixação, acesso),
campos de **seleção única** como múltipla escolha/lista, a opção **"Other"** em
todas as listas, e os campos de texto (título, links, autores, observações).

**Coleta + curadoria (recomendado):** use o script
`docs/publicar_automatico.gs`. Cada submissão cai sozinha na aba **"Pendentes"**
(já formatada — sem copiar/colar), mas **nada vai ao ar sem o seu aval**: o site
lê apenas a aba **"Publicados"**.
1. Abra a planilha → Extensões → Apps Script.
2. Cole o `publicar_automatico.gs` e salve.
3. Rode a função `instalarGatilhoBRIGHT` uma vez e autorize.
4. Recarregue a planilha → aparece o menu **BRIGHT** no topo.

Para **aprovar**: na aba "Pendentes", selecione a(s) linha(s) e clique em
**BRIGHT → ✅ Publicar selecionadas** (a linha vai para "Publicados" com `id`
automático e some de "Pendentes"). Para descartar: **BRIGHT → 🗑️ Recusar
selecionadas**.

> Para fazer manualmente: campos múltiplos = "Caixas de seleção"; únicos =
> "Múltipla escolha"/"Lista"; sempre inclua "Other" e oriente a detalhar em
> Observações.

---

## 5. Publicar no GitHub Pages (gratuito)

1. Crie um repositório no GitHub (ex.: `bright`) e envie esta pasta.
2. No repositório: **Settings → Pages**.
3. Em *Source*, escolha a branch `main` e a pasta `/ (root)`. Salve.
4. Em ~1 minuto o site fica no ar em
   `https://SEU-USUARIO.github.io/bright/`.
5. (Opcional) Configure um domínio próprio em *Settings → Pages → Custom domain*.

Alternativas equivalentes e gratuitas: **Cloudflare Pages** e **Netlify**
(basta apontar para o repositório; sem etapa de build).

---

## 6. Adicionar/editar campos do catálogo

Edite `js/schema.js`:
- `label` → muda o rótulo exibido (PT/EN).
- `options` → muda o vocabulário controlado.
- `filter: true` → faz o campo virar um filtro no catálogo.

Lembre de manter o cabeçalho da planilha igual à `key` do campo.
