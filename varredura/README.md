# BRIGHT — varredura automática

A varredura mudou de mecanismo. Antes ela buscava **artigos** sobre transcriptômica
espacial e você aprovava manualmente, copiando linhas para o Google Sheets. Isso
subestimava duplicação (dois artigos que reusam o mesmo dataset viravam dois achados)
e raramente trazia tecnologia, H&E ou link de download, porque essas informações
ficam em Métodos e em *Data availability*, não no resumo.

Agora ela busca **datasets** direto no GEO — que devolve tecnologia, organismo, nº de
amostras e evidência de H&E de forma verificável — e só depois liga os artigos que os
citam. Deduplicar por accession (GSE) em vez de por DOI resolve o problema na raiz: dois
artigos citando o mesmo GSE viram uma linha só, com duas citações.

## Como funciona

`.github/workflows/varredura.yml` roda toda segunda-feira (e também sob demanda, em
*Actions → Varredura semanal → Run workflow*) e chama `scripts/varredura.py discover`.
O script:

1. Busca no GEO, por tecnologia, tudo publicado na janela da semana.
2. Descarta o que já está em `data/catalog.json` ou já foi visto em `varredura/ledger.json`.
3. Para o que sobra, extrai tecnologia (do texto do `Series_overall_design`), organismo
   (do `Series_taxon`), tecido e status tumoral (por palavra-chave no texto da série) e
   H&E (pelos nomes dos arquivos suplementares de cada amostra — a saída padrão do Space
   Ranger revela corregistro sem precisar abrir imagem nenhuma).
4. Busca no Europe PMC quem cita aquele accession, para achar o artigo principal (autor,
   DOI, ano) e qualquer reúso.
5. Só entra em `data/catalog.json` o que tiver os cinco campos obrigatórios — tecnologia,
   tecido, tumoral, organismo, H&E — com método determinístico, não achismo. O resto vai
   para `data/review_queue.json`, com o motivo exato da rejeição.
6. Abre **um pull request** com as duas mudanças. Nada aparece no site sem esse PR ser
   mesclado.

## Arquivos

| Arquivo | O que é |
|---|---|
| `ledger.json` | Accessions já vistos (não mais DOIs/PMIDs). Guarda também quem cita cada dataset, para reúso não virar achado repetido. **Não apague.** |
| `agreement.json` | Por categoria (tecnologia × método de detecção de H&E), quantas propostas foram aceitas sem edição ao mesclar. Recalculado a cada rodada a partir do histórico de PRs — quando uma categoria acumula ≥20 propostas e ≥95% de concordância nos campos obrigatórios, o workflow passa a mesclar sozinho os PRs daquela categoria. |

Os arquivos antigos (`ledger_vistos.json`, `delta_*.csv`, `relatorio_achados*.md`,
`submissoes_pendentes.csv`) ficam aqui como histórico do mecanismo anterior; nada os lê
mais.

## Como revisar um PR

O diff de `data/catalog.json` é a revisão inteira: cada campo tem, em `_provenance`, a
fonte e o trecho exato que o justificou. O que você corrigir ali antes de mesclar é
exatamente o dado que ensina `agreement.json` a confiar mais — ou menos — na categoria
na próxima rodada.

`data/review_queue.json` traz o que quase entrou: complete os campos que faltam e mova
para `data/catalog.json` manualmente, ou descarte.

## Rodando localmente

```bash
python3 scripts/varredura.py discover --dry-run          # só mostra, não escreve
python3 scripts/varredura.py discover --since 2026-09-01 --until 2026-09-08
python3 scripts/varredura.py migrate                       # recupera accession do acervo antigo via DOI
python3 scripts/varredura.py agreement                      # recalcula a concordância
```

`NCBI_API_KEY` (opcional) sobe o limite de 3 para 10 requisições/s ao E-utilities.
`ANTHROPIC_API_KEY` está reservado para uma etapa futura de LLM em campos ambíguos
(tipo de câncer, fixação quando o texto é vago) — a rodada funciona sem ela, só com
correspondência determinística e por palavra-chave.
