# Importação por cargo: teste dos quatro exemplos restantes

Data: 18/10/2026. Complemento do [teste de Porto Velho e ManausPREV](2026-10-18-importacao-por-cargo.md).

Os quatro PDFs restantes foram enviados primeiro ao Gemini e depois ao OpenRouter. Com os dois exemplos anteriores, os seis arquivos de `exemplos_editais` foram exercitados no novo fluxo. Cada edital com programa foi testado com um cargo ou perfil escolhido, sem testar todos os cargos individualmente.

## Resultado por arquivo

| PDF e seleção | Gemini | OpenRouter gratuito | Conferência documental |
|---|---|---|---|
| `edital-retificado-dataprev.pdf`, perfil 3, Desenvolvimento de Software | Identificou 13 opções. A localização do conteúdo recebeu 429, inclusive em uma nova tentativa com inventário reaproveitado. | Nemotron concluiu o inventário e dois blocos após rejeições de Dots. Cerca de 135 s no total. | **Incompleto.** Preservou o texto retornado, mas omitiu o bloco final de Gestão e Governança de TI do perfil 3. |
| `edital2.pdf`, CRECI/SP, PST, Assistente Administrativo | Primeiro recebeu 503. Na nova tentativa identificou 10 opções, mas a localização recebeu 429. | Dots recebeu 400; Nemotron devolveu referências inválidas nas duas tentativas; Gemma recebeu 429. | Não houve conteúdo válido para conferir no novo fluxo. |
| `edital4.pdf`, NAV Brasil, seleção por títulos e experiência | Inicialmente identificou ausência de programa, mas sem justificar. Após explicitar essa exigência no prompt, retornou ausência de programa com referências aos itens 1.3 e 9, em cerca de 3,9 s. | Dots identificou 22 opções e declarou haver programa, indicando páginas de avaliação de títulos como programa de conhecimentos. | **Gemini aprovado para a classificação sem programa. OpenRouter reprovado.** O erro do OpenRouter foi detectado pela referência documental do teste, não pelo validador estrutural da aplicação. |
| `edital5.pdf`, CNU, bloco 2, Estatístico AGU, B2-01-A | Primeiro recebeu 429. Na nova tentativa identificou 21 opções; a localização também recebeu 429. | Dots retornou os gerais e os cinco eixos após corrigir um intervalo invertido. Cerca de 32 s no total. | **Incompleto.** Faltou a continuação do eixo 3 na página 53, sobre sistemas operacionais e redes. |

“Estrutura válida” significa que a resposta atende ao contrato e aos limites locais. Não significa que todo o programa foi localizado. Nesta rodada, nenhum dos três novos exemplos com programa teve uma extração de conteúdo aprovada na conferência documental.

## Omissões confirmadas no PDF

### DATAPREV

O OpenRouter localizou os gerais nas linhas 1266 a 1297, página 27, e os específicos nas linhas 1440 a 1492, páginas 30 e 31. O específico terminou em integração e ingestão de dados.

O programa do perfil 3 continua nas linhas 1493 a 1499, antes do cabeçalho do perfil 4. Ali estão Gestão e Governança de Tecnologia da Informação, gerenciamento de projetos, processos, riscos, ITIL v4, COBIT 2019 e modelagem com BPMN. Esse trecho não apareceu em nenhum dos blocos retornados.

Uma comparação auxiliar encontrou 69 de 77 unidades de referência após normalizar letras, números, espaços e pontuação. A contagem é parcial e inclui diferenças causadas por quebras de página; não foi usada para aprovar a resposta. A omissão foi confirmada diretamente nas linhas do PDF.

### CNU

O eixo 3 foi localizado somente nas linhas 3388 a 3393, página 52. A última linha termina no número “3”, cujo texto continua na página seguinte. As linhas 3407 a 3415, página 53, contêm Sistemas operacionais e Redes de Computadores e ficaram fora de todas as seções. O eixo 4 começa na linha 3416.

A resposta incluiu o final do eixo 5, até algoritmos e operações estatísticas, mas isso não compensa a omissão no eixo 3. A comparação auxiliar encontrou 38 de 42 unidades de referência; duas diferenças são decorrentes de cabeçalhos inseridos nas quebras de página, enquanto sistemas operacionais e redes realmente faltam.

## Disponibilidade e tentativas

Foi usado `gemini-3.6-flash`, configurado no ambiente. No OpenRouter, os modelos efetivamente chamados foram Dots, Nemotron e Gemma, mantendo filtro de preço zero. As chaves não foram impressas nem alteradas.

O Gemini conseguiu identificar os cargos nos três exemplos com programa, mas a segunda chamada recebeu limite de cota. Isso indica que a redução do texto, por si só, não resolve a disponibilidade para esta conta. O inventário da DATAPREV foi reutilizado em uma tentativa adicional; a resposta continuou sendo 429. As novas tentativas de CRECI/SP e CNU também estão registradas separadamente.

Na segunda etapa, as entradas tiveram aproximadamente 93 mil caracteres na DATAPREV, contra 269 mil no documento numerado completo; 38 mil contra 259 mil no CRECI/SP; e 24 mil a 48 mil contra 352 mil no CNU. O intervalo do CNU varia porque cada provedor escolheu um conjunto diferente de páginas. Uma entrada menor pode ser incompleta se o inventário omitir páginas.

## Integração e ajuste realizado

As respostas estruturalmente aceitas da DATAPREV e do CNU foram reenviadas pelo novo fluxo HTTP em conta temporária: upload do PDF original, inventário, seleção, prévia e confirmação de importação. Os textos gravados coincidiram com os trechos da resposta, e somente o cargo escolhido ficou selecionado. Isso confirma a persistência, sem aprovar a completude dessas duas respostas.

O resultado sem programa do Gemini para o NAV Brasil também passou pelo upload e pela etapa de inventário. A aplicação manteve a justificativa, não criou matérias e bloqueou a aplicação de um conteúdo inexistente. Os resultados reprovados ou interrompidos não foram reapresentados como sucesso por fallback de outro provedor.

O único ajuste de produção desta rodada foi explicitar no prompt que ausência de programa exige `options=[]`, `syllabus_pages=[]` e justificativa em `warnings`. O validador já exigia a justificativa; essa exigência foi preservada. A repetição real do NAV Brasil confirmou o resultado. Os testes do backend passaram: **115 testes, 337 asserções**.

Nenhum edital ou histórico do usuário foi substituído. As contas temporárias usadas na persistência foram removidas ao final.

## Melhorias que os testes indicam

1. Conferir a continuação de cada bloco, especialmente na mudança de página e antes do próximo cargo. O campo `complete=true` declarado pela IA não é prova de cobertura.
2. Acrescentar uma verificação independente das lacunas de conteúdo após a localização. As omissões de DATAPREV e CNU passaram pelos limites estruturais atuais.
3. Confirmar a existência de prova de conhecimentos antes de aceitar páginas indicadas como programa. O NAV Brasil mostrou uma classificação incorreta do OpenRouter.
4. Explicitar o formato permitido para `ref` e melhorar a mensagem de validação por opção. Parênteses e vírgulas nos identificadores gerados causaram rejeições no OpenRouter, embora os nomes oficiais possam conter esses caracteres.
5. Tratar o intervalo entre identificação e localização como ponto de retomada para cotas, mantendo o inventário já obtido.

Essas melhorias adicionais não foram implementadas nesta rodada de testes. A prévia e a confirmação humana continuam necessárias. O novo fluxo preserva a fonte e facilita trabalhar por cargo, mas ainda não permite prometer uma extração automática completa em todos os exemplos.

## Reprodução

```text
php tests/api/live-job-import.php gemini fresh remaining
php tests/api/live-job-import.php openrouter fresh remaining
php tests/api/live-job-import.php gemini fresh edital4
php tests/api/live-job-import.php gemini reuse edital-retificado-dataprev
php tests/api/live-job-import.php gemini fresh edital2
php tests/api/live-job-import.php gemini fresh edital5
```

Os comandos realizam chamadas externas e não integram a suíte automática. Os relatórios principais ficam em `server/writable/testing/live-job-import/{provider}-remaining-results.json`; tentativas adicionais ficam em `{provider}-{arquivo}-results.json`. O resultado mais recente de cada arquivo deve ser lido junto à rodada principal. Respostas antigas podem continuar no diretório após uma falha posterior.

`server/tests/api/live-job-import-storage.mjs` reproduz a integração sem chamar IA, usando `/fixtures`, `/pdfs` e a fixture isolada de contas. O relatório correspondente é `remaining-storage-results.json`. Todos esses artefatos locais ficam no diretório ignorado pelo Git.
