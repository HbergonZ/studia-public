# Disponibilidade e regressão do fluxo PDF para estudos

Data de referência: 19/10/2026, America/Manaus.

## Disponibilidade atual observada

Uma requisição pequena por provedor concluiu com sucesso: Gemini 3.6 Flash em aproximadamente 2,7 s e Dots gratuito pelo OpenRouter em aproximadamente 2,6 s. Isso confirma disponibilidade para a consulta, não uma quantidade conhecida de cota restante.

Ao enviar os seis PDFs, o Gemini respondeu 503 nos três primeiros (Porto Velho, ManausPREV e DATAPREV) e 429 nos três seguintes (CRECI/SP, NAV Brasil e CNU). Não concluiu extrações de documentos nesta rodada.

O OpenRouter conseguiu executar a rodada. Manteve-se a restrição a modelos com preço zero. Os modelos efetivamente chamados foram Dots, MiniMax M3.1 Flash gratuito e Nemotron. Nenhuma credencial foi impressa ou alterada.

## Resultado dos seis exemplos

| PDF e cargo-alvo | Gemini | OpenRouter, após validação atual |
|---|---|---|
| Porto Velho, Enfermeiro 725 a 743 | 503 | Quatro blocos gerais de nível superior e o específico de Enfermeiro, 44 unidades. Pronto para conferência humana. |
| ManausPREV, TI 08 | 503 | Falhou: blocos grandes, sobreposição e resposta truncada. O conteúdo inválido não foi aprovado. |
| DATAPREV, Desenvolvimento de Software 3 | 503 | Onze blocos, incluindo Gestão e Governança de TI, 37 unidades. Pronto para conferência humana. |
| CRECI/SP, Assistente Administrativo | 429 | Dez cargos no inventário; cinco blocos do cargo escolhido e 22 unidades. Pronto para conferência humana. |
| NAV Brasil, sem programa de prova de conhecimentos | 429 | A primeira classificação incorreta foi rejeitada. A tentativa de correção retornou ausência de programa com justificativa. |
| CNU, Estatístico AGU B2-01-A | 429 | Gerais e cinco eixos, com a continuação do eixo 3 na página 53; 63 unidades. Pronto para conferência humana. |

“Pronto para conferência” não certifica completude absoluta nem dispensa comparar com o edital. Os seis arquivos foram testados, com um cargo-alvo por edital que possui programa. Não foram extraídos todos os cargos individualmente.

## Correção de associação encontrada nesta rodada

A resposta inicial de Porto Velho incluiu gerais dos níveis fundamental e médio junto ao superior. A conferência local de lacunas não identifica sozinha uma associação incorreta entre escolaridades. Foi acrescentada a validação do cabeçalho de escolaridade e também do número do perfil quando há cabeçalho explícito.

A repetição de Porto Velho reaproveitou o inventário de 51 cargos. Dots foi rejeitado por escolaridade incorreta e depois por específico de outro cargo. MiniMax retornou os cinco blocos correspondentes ao Enfermeiro. A localização, com inventário reaproveitado e tentativas rejeitadas incluídas, levou aproximadamente 94 s. O inventário inicial havia levado cerca de 50 s; os 94 s não representam uma nova importação integral.

DATAPREV concluiu em aproximadamente 90 s, CRECI/SP em 26 s, NAV Brasil em 29 s e CNU em 41 s, incluindo as respectivas tentativas. ManausPREV encerrou sem resposta válida em cerca de 123 s. Os tempos são observações desta rodada.

## Fidelidade e conferência documental

- DATAPREV: os 77 fragmentos da referência parcial do perfil 3 e dos gerais foram encontrados após normalização de letras, números, espaços e pontuação. O específico inclui o final sobre BPMN antes do perfil 4.
- CRECI/SP: 53 de 55 fragmentos da referência parcial apareceram como sequências normalizadas contínuas. Os outros dois atravessam cabeçalhos de página inseridos pelo PDF. O texto sobre logística, viagens, estoque e distribuição está presente; o final inclui licitações, contratos, Lei 6.530/1978 e ética. O trecho de Windows preserva “área de trabalho”.
- CNU: 39 de 42 fragmentos da referência parcial apareceram continuamente. As outras sequências atravessam metadados e cabeçalhos de página. A continuação de sistemas operacionais e redes está presente, assim como o final do eixo 5.
- Porto Velho: a resposta final coincide com os quatro gerais de nível superior e o programa de Enfermeiro já conferidos na rodada anterior, até o Guia de Vigilância Epidemiológica, Covid-19.

Essas comparações são parciais. A validação definitiva da associação e da completude ainda depende de conferência do documento.

## Sistema implementado e testado

- Leitura em segundo plano por fila PostgreSQL e worker CLI, com estado persistente, cancelamento e retomada explícita.
- Respostas em trânsito não podem sobrescrever um rascunho cancelado ou substituído. Uma tarefa interrompida expira e preserva resultados anteriores, sem repetir chamadas de IA automaticamente.
- Leitura de todas as páginas físicas com Poppler; OCR local Tesseract em português/inglês nas páginas com pouco texto; cache por arquivo/página; limites de 15 MB, 200 páginas, resolução, prazo por processo e dez minutos por rodada.
- Diagnóstico por página, inclusive imagem e página final vazia. O texto obtido por OCR é sinalizado para comparação com o original.
- Alertas e confirmação para documento possivelmente complementar ou sem programa claramente identificado. Seleção por títulos/experiência não pode ser tratada como programa quando o texto não contém cabeçalho de programa.
- Reabertura de decisões humanas sobre pendências sem reenviar o conteúdo ou consultar a IA.
- Divisão local em unidades por limites conservadores de frases/itens. Cada unidade conserva seu trecho; a concatenação precisa reproduzir integralmente a fonte, na ordem e sem duplicações introduzidas. Não se corta um bloco sem limite seguro apenas para fazê-lo menor.
- Ativação direcionada à rotina existente, preservando configurações anteriores.

Backend: **128 testes, 372 asserções**, aprovados. Também passaram os testes HTTP de importação, organização, confiabilidade, persistência das fontes reais, OCR, cancelamento, retomada e geração do primeiro plano. A regressão direta da fila usa exclusivamente o edital temporário do teste.

Uma conta nova completou pelo navegador: upload real do PDF, leitura em segundo plano, recarga, escolha do cargo, revisão de fonte, aplicação, ativação, configuração da disponibilidade e primeiro plano. Foram conferidas telas de 1440, 390 e 320 px, sem transbordamento horizontal ou exceções JavaScript. O teste usou respostas manuais determinísticas para não depender da disponibilidade dos provedores.

## Artefatos e reprodução

`server/tests/api/ai-availability.php` faz o teste pequeno real. A rodada completa usa `live-job-import.php`; `live-job-final-review.php` revalida as capturas sem chamar IA. Os resultados desta rodada ficam em `server/writable/testing/live-job-import/verificacao-20261019/`, ignorado pelo Git. `final-review.json` considera a repetição direcionada de Porto Velho e revalida com as regras atuais.

`job-processing.mjs`, `import-queue-regression.php` e `pdf-onboarding-browser.mjs` verificam processamento, recuperação e uso da conta nova. Os PDFs de teste de OCR são gerados localmente e não contêm dados do usuário. Os seis exemplos originais foram lidos com suas páginas físicas; nenhum precisou de OCR nesta rodada, enquanto um PDF inteiramente em imagem foi verificado em teste específico.

O plano de implementação é [PDF para estudos](2026-10-18-plano-pdf-para-estudos.md). Limites de provedores e conferência humana permanecem explícitos: funcionalidades entregues não significam que todos os modelos conseguirão extrair todos os editais.

A versão validada foi publicada. Arquivos públicos responderam 200, a API sem autenticação respondeu 401 e o worker iniciou com as migrações aplicadas. As contas de teste e a prévia temporária foram removidas; o histórico do usuário foi preservado.
