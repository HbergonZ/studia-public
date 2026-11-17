# Ensaio de importação com os PDFs do projeto

Foram lidos os cinco arquivos de `exemplos_editais` com o próprio `PdfTextExtractor`. Os originais foram preservados. As respostas JSON do ensaio foram preparadas localmente a partir de recortes documentais identificados. Não houve chamada a uma IA externa nem alteração nos editais dos usuários.

## Escopo e resultados

| Documento | Páginas lidas | Escopo da amostra importada | Unidades |
| --- | ---: | --- | ---: |
| DATAPREV, Edital 001/2026 | 64 | Conhecimentos gerais e perfis 1 e 3, Anexo I | 99 |
| CRECI/SP, Concurso 01/2026 | 51 | Assistente Administrativo e Técnico de TI, Anexo II; aplicabilidade do quadro 11.1 | 63 |
| MANAUSPREV, Edital 01/2026 | 39 | Analistas 01 e 08, conhecimentos gerais e específicos do Anexo II | 158 |
| CNU, Bloco 2, Edital 02/2024 | 66 | Anexo IV para AGU Estatístico e FUNAI Estatística; pesos do Anexo V | 42 |
| NAV Brasil, Edital 1/2025 | 64 | Controle sem programa de prova de conhecimentos, item 1.3 | 0 |

As quatro amostras com programa passaram por prévia, importação, seleção de cargo, ativação, geração e salvamento do plano, registro de continuação e conclusão com revisão individual. NAV Brasil não gerou matérias e teve a ativação bloqueada.

Foram comparados os títulos, trechos e a ordem das unidades entre JSON e banco. A troca de cargo foi verificada para evitar inclusão de conteúdos gerais ou específicos de outro cargo. No CRECI/SP e no MANAUSPREV, a matéria genérica Noções de Informática sai da seleção de TI nas amostras usadas, conforme os respectivos quadros e escopos. Isso não remove os assuntos de informática que pertencem aos conhecimentos específicos de TI.

Os planos respeitaram a disponibilidade diária de 120 minutos, incluindo pausas e tempo já registrado. A conclusão de uma unidade não marcou as demais como concluídas. Houve apenas um edital ativo por conta.

## Falhas encontradas e corrigidas

### Ordem das unidades

Unidades do mesmo assunto compartilham `sort_order`. As consultas de apresentação não tinham desempate, permitindo que o banco mostrasse uma unidade posterior antes da primeira. As consultas agora desempataram por `id`, preservando a ordem de inserção. O teste compara a sequência completa, sem ordenar artificialmente a expectativa.

### Peso de cargo não selecionado

O dashboard calculava o maior peso entre todas as opções do grupo, inclusive as desmarcadas. O planejador e o cronograma usavam o peso da matéria, ignorando pesos da aplicabilidade. As três consultas agora consideram somente opções selecionadas, com o peso da matéria como alternativa quando não houver peso explícito.

No CNU, a amostra da AGU deve produzir os pesos `[1,2,1,1,5]`; a da FUNAI, `[2,3,2,1,2]`. Ambos foram verificados. Para seleção simultânea, permanece a regra de maior peso entre os cargos escolhidos. Os pesos podem manter valores fracionários.

### Indicações na interface

O peso da matéria passou a aparecer como valor, sem o denominador artificial `/10`, que não corresponde aos pesos do CNU. O aviso de ausência de programa recebeu texto escuro para ficar legível no tema claro. Ao revisar um edital, o menu identifica o contexto como Edital em revisão, sem afirmar que esse edital está ativo.

## Reprodução

- `prototypes/real-editais/build-fixtures.py`: preparação controlada das amostras, com identificação SHA-256 dos PDFs e avisos explícitos do escopo.
- `server/tests/api/real-editais.mjs`: importação e regras de estudo usando uma conta temporária.
- `server/tests/api/real-editais-browser.mjs`: navegação, ícones distintos e revisão visual em desktop, 390 e 320 pixels.

Os dados gerados e os resultados detalhados ficam em `server/writable/testing`. A conta e seus editais são removidos depois do ensaio.

## Limites

Este ensaio não certifica a extração de todos os cargos dos PDFs nem a qualidade da resposta de uma IA ao prompt. Não havia chave da OpenRouter configurada. O fluxo testado foi o de importar JSON, com respostas controladas de conteúdo real. O campo de extração completa dessas respostas se refere ao conjunto definido para cada amostra, que não representa o documento inteiro. Os avisos da amostra deixam essa limitação explícita.
