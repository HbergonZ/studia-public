# Teste da importação por cargo

Data: 18/10/2026. Comparação com [o teste anterior dos seis PDFs](2026-10-18-testes-reais-ia-editais.md).

## O que mudou

O PDF é lido no servidor. A primeira resposta identifica cargos e páginas do programa. A pessoa escolhe um cargo antes da segunda análise. Nessa etapa, a IA informa intervalos de linhas e evidências de aplicabilidade. O servidor copia o texto dessas linhas do PDF, sem pedir à IA para transcrever os assuntos.

O fluxo funciona com Gemini/OpenRouter configurados e com prompts para outra IA. O rascunho permite retomar, corrigir o inventário e trocar a seleção antes da importação. A gravação exige conferir os trechos e confirmar. Os editais existentes e a importação de JSON completo permanecem disponíveis.

## Chamadas reais

Os dois casos abaixo concentram os problemas mais relevantes do teste anterior: documento grande e confusão entre cargos com conteúdos compartilhados. A rodada inicial cobriu esses dois arquivos. Depois foram testados [os quatro exemplos restantes](2026-10-18-importacao-por-cargo-demais-exemplos.md), completando os seis PDFs no novo fluxo. Esse complemento encontrou omissões na DATAPREV e no CNU e falhas de cota, detalhadas no relatório. As cinco amostras estruturadas usadas na regressão são testes locais, sem chamada de IA.

| Caso | Gemini | OpenRouter gratuito |
|---|---|---|
| Porto Velho, `ilovepdf_merged (1).pdf`, Enfermeiro 725 a 743 | Inventário de 51 opções e cinco blocos, quatro gerais e um específico. Primeira execução completa em cerca de 24 s. Nova localização com inventário reaproveitado em 6,5 s. | Inventário de 51 opções. Dots retornou intervalos inválidos; a tentativa seguinte com Nemotron localizou cinco blocos válidos em cerca de 43 s, incluindo as tentativas rejeitadas. |
| ManausPREV, `edital3.pdf`, Analista Previdenciário, TI 08 | Inventário de 13 opções. Uma chamada de localização retornou os gerais de TI da página 27 e os específicos das páginas 33 e 34, em cerca de 4,5 s, usando inventário reaproveitado. Outras chamadas falharam com 503 e, na rodada final, 429. | Inventário de 13 opções. Respostas incluíram gerais de outros códigos, intervalos invertidos e sobrepostos. A rodada final foi rejeitada, com timeout no fallback e 429 no modelo seguinte. |

O modelo Gemini configurado foi `gemini-3.6-flash`. No OpenRouter foram consultados os modelos gratuitos disponíveis no catálogo, com limite de preço zero. Os modelos que participaram das últimas tentativas foram Dots, Nemotron e Gemma. Tempos e disponibilidade representam essas chamadas, sem garantia para as próximas.

Na segunda etapa, o texto numerado passou de aproximadamente 401 mil para 120 mil caracteres em Porto Velho (70% menor) e de 230 mil para 84 mil em ManausPREV (63% menor). A descoberta inicial ainda precisa ler o documento completo. Reaproveitar o inventário nas novas tentativas evita repetir essa etapa; os tempos dessa localização isolada não equivalem ao tempo total de upload e identificação.

## Conferência do conteúdo

Em Porto Velho, os quatro blocos gerais retornados pelos dois provedores possuem o mesmo texto. O corpo do programa específico de Enfermeiro também coincide. A diferença de tamanho entre os específicos é o cabeçalho e seus espaços: Gemini inclui “CONHECIMENTOS ESPECÍFICOS”, enquanto OpenRouter começa pelo código do cargo. O último assunto é o Guia de Vigilância Epidemiológica, Covid-19.

No ManausPREV, a resposta útil do Gemini contém o grupo geral dos códigos 08 e 10, seguido do específico de TI. Isso corrige a omissão de TI observada na extração geral anterior. Uma resposta antiga do OpenRouter continha também os gerais dos códigos 01 a 07, 09 e 11. Essa resposta motivou a validação dos códigos no cabeçalho e não é considerada um resultado correto.

O servidor rejeita cargo inexistente no texto, referências fora do programa, intervalos inválidos ou sobrepostos e incompatibilidades explícitas entre códigos. Quando o OpenRouter devolve uma estrutura inválida, há uma tentativa de correção com o erro de validação, dentro do limite total já existente. O texto importado é sempre recomposto da fonte armazenada.

## Limites que permanecem

- Preservar o texto evita paráfrases, mas não prova que a IA encontrou todas as linhas e todos os anexos. A conferência com o PDF continua necessária.
- As regras de associação reconhecem cabeçalhos explícitos. Documentos com tabelas incomuns, retificações e referências indiretas ainda podem exigir correção do inventário ou nova resposta.
- O inventário pode omitir cargos. A pessoa deve conferir nome e código antes de prosseguir.
- Cotas gratuitas, indisponibilidade e timeout continuam acontecendo. A falha mantém o rascunho e permite usar outra IA pelo prompt.
- PDFs digitalizados sem texto não ganham OCR nesta alteração. Cada bloco importado começa como uma unidade de estudo; a divisão mais detalhada pode ser feita em Organizar estudos.

## Verificação da aplicação

- Backend: 113 testes, 332 asserções, todos aprovados, incluindo validação de fonte e correção limitada da resposta.
- API do novo fluxo: upload e repetição segura, conflito de revisão, CSRF, isolamento entre contas, erro sem perda de seleção, cópia literal e confirmação para aplicar.
- Navegador: fluxo manual completo, busca, retomada após recarregar, JSON inválido preservado e confirmação antes de importar. Três etapas conferidas em 1440, 390 e 320 px, sem transbordamento horizontal nem exceções JavaScript.
- Regressão: organização das unidades, cinco amostras estruturadas de PDFs e confiabilidade do estudo aprovadas. Os testes usam contas temporárias e não apagam o histórico do usuário.
- Modais existentes: seis fluxos em quatro tamanhos de tela, com foco, rolagem e ações preservados. Build TypeScript/Vite aprovado. A verificação estática de design das três superfícies alteradas não apontou ocorrências.

Os scripts reproduzíveis estão em `server/tests/api/job-import.mjs`, `job-import-browser.mjs` e `live-job-import.php`. O último realiza chamadas externas e deve ser executado deliberadamente. Respostas e capturas locais ficam em `server/writable/testing/`, ignorado pelo Git. Arquivos de sucesso de tentativas anteriores podem coexistir com o relatório mais recente de falha; o relatório da execução informa o resultado daquela rodada.
