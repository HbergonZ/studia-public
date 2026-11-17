# Testes reais de Gemini e OpenRouter com os PDFs de exemplo

Data: 18/10/2026, aproximadamente 03h13 a 03h24, America/Manaus.

## Resultado

As chaves foram aplicadas aos serviços e os seis PDFs foram testados primeiro com Gemini e depois com OpenRouter, começando por `ilovepdf_merged (1).pdf` nas duas rodadas. Nenhuma chave aparece neste relatório.

O Gemini não concluiu nenhuma das seis análises. O OpenRouter produziu três respostas aceitas pela validação estrutural. A revisão documental encontrou omissões graves em uma dessas respostas e uma reescrita em outra. Portanto, estes resultados não aprovam a extração integral automática sem conferência.

| PDF | Páginas com texto | Caracteres extraídos | Gemini configurado | OpenRouter | Revisão do resultado |
| --- | ---: | ---: | --- | --- | --- |
| `ilovepdf_merged (1).pdf` | 88 | 359.072 | HTTP 503 | Falhou | Dots retornou 400; Nemotron excedeu 90 s; alternativas Gemma retornaram 429. |
| `edital-retificado-dataprev.pdf` | 64 | 243.869 | HTTP 503 | Falhou | Dots respondeu com aplicabilidade contraditória; Nemotron excedeu 90 s; Gemma retornou 429. |
| `edital2.pdf` | 51 | 236.676 | HTTP 503 | Formato aceito | CRECI/SP: 10 opções, 14 grupos, 14 matérias e 99 tópicos. Há reescrita de texto, descrita abaixo. |
| `edital3.pdf` | 39 | 210.190 | HTTP 429 | Formato aceito, conteúdo incompleto | ManausPREV: 13 opções, mas conhecimentos específicos somente para Administrativa. Não aprovado na conferência documental. |
| `edital4.pdf` | 64 | 291.563 | HTTP 429 | Resultado conferido | NAV Brasil: Nemotron identificou corretamente seleção por títulos e experiência, sem programa de prova de conhecimentos. |
| `edital5.pdf` | 66 | 317.262 | HTTP 429 | Falhou | Dots respondeu com aplicabilidade contraditória; Nemotron excedeu 90 s; Gemma retornou 429. |

Todos os arquivos ficaram abaixo do limite local de 500 mil caracteres. Nenhum texto foi cortado para caber na análise.

## Configuração efetivamente testada

- Gemini principal: `gemini-3.6-flash`, conforme o ambiente preenchido.
- OpenRouter preferido: `dots-studio/dots-3-note-preview:free`.
- Prazo por chamada: 90 segundos. Prazo total por PDF: 300 segundos. Até quatro tentativas por PDF no OpenRouter.
- OpenRouter manteve o filtro de preço zero e a exigência de parâmetros compatíveis. Na rodada principal, foram realizadas 16 tentativas de geração.
- Os testes isolaram os provedores. Uma falha do Gemini não foi contada como sucesso por usar fallback do OpenRouter.

O código de produção e os modelos do `.env` não foram alterados durante os testes. Os contêineres PHP, web e Tailscale foram recriados para carregar as chaves fornecidas pelo responsável.

## Gemini

A consulta de modelos respondeu HTTP 200 e requisições mínimas de texto responderam `OK` com Gemini 3.6 e 3.8. Isso confirma acesso básico com a chave; não confirma capacidade disponível para documentos longos.

Na rodada dos PDFs, as primeiras três chamadas receberam 503 e as três seguintes receberam 429. Em teste complementar do primeiro PDF, tanto Gemini 3.8 quanto uma repetição posterior de Gemini 3.6 receberam 503, com a mensagem do provedor informando alta demanda e indisponibilidade temporária.

Também foi verificado Gemini 2.5 Flash no primeiro PDF. A API respondeu 404 e informou que o modelo não está mais disponível para novos usuários, orientando migrar para Gemini 3.8. Sua presença na listagem de modelos não garantiu acesso de geração nesta conta.

Não foi identificado erro de autenticação nessas chamadas. Os resultados não permitem afirmar que a troca de modelo resolverá o processamento integral.

## OpenRouter e fidelidade ao documento

### Porto Velho e DATAPREV

Porto Velho não teve resposta aceita. DATAPREV retornou um JSON com 13 opções e somente um grupo geral. Esse grupo usou simultaneamente `applies_to_all=true` e uma lista explícita de aplicabilidade. A validação recusou a contradição. O modelo também não entregou os blocos específicos necessários para todos os perfis.

### CRECI/SP, `edital2.pdf`

Dots concluiu em cerca de 70 segundos. A resposta passou na validação e manteve os 10 cargos na estrutura. Em comparação parcial com 63 trechos de referência já existentes para Assistente Administrativo e Técnico de TI, 62 foram encontrados após normalização de espaços, pontuação e acentos.

No trecho de Windows, o PDF usa “área de trabalho”, enquanto o modelo devolveu “área de desktop”. A diferença foi confirmada no texto extraído do PDF. Mesmo com sentido próximo, isso descumpre a instrução de preservar literalmente o conteúdo. A comparação não é uma certificação dos 10 cargos completos nem substitui a revisão de aplicabilidade.

### ManausPREV, `edital3.pdf`

Dots concluiu em cerca de 58 segundos e marcou `extraction_complete=true`, sem avisos. Foram retornadas 13 opções, quatro grupos gerais e apenas um grupo específico, para Analista Previdenciário, Administrativa.

O PDF contém, entre outros, o bloco `08 – ANALISTA PREVIDENCIÁRIO – TECNOLOGIA DA INFORMAÇÃO`, seguido de “Projetos de tecnologia da informação e comunicação”. Esse bloco não consta na resposta. Também faltam os demais blocos específicos de Contabilidade, Economia e outros cargos.

Esta é uma falha de completude documental que a validação atual não detectou. Campos corretos, referências válidas e o indicador declarado pela IA não comprovam cobertura integral do PDF.

### NAV Brasil, `edital4.pdf`

A primeira resposta de Dots identificou ausência de conteúdo estudável, mas manteve 22 opções, contrariando o formato exigido. Foi rejeitada. A alternativa `nvidia/nemotron-3.5-super-vl:free` concluiu com `has_study_syllabus=false`, opções e grupos vazios e justificativa pelos itens 1.3 e 9. Esse resultado corresponde ao recorte documental de referência.

### CNU, `edital5.pdf`

Dots retornou 21 opções e somente um grupo geral com aplicabilidade contraditória. A resposta foi rejeitada. As alternativas não concluíram dentro do prazo ou estavam limitadas pelo provedor.

### Catálogo real e custos

O Qwen gratuito sugerido na pesquisa anterior não apareceu na consulta real de modelos do OpenRouter nesta execução. Uma tentativa complementar confirmou que ele não seria selecionado e foi encerrada para evitar repetir o fallback para Nemotron. A recomendação de Qwen não se confirmou no catálogo consultado.

As respostas concluídas do OpenRouter informaram `usage.cost=0`. A aplicação também restringiu os preços a zero. Não foram ativados modelos pagos ou faturamento. O faturamento da conta Google não foi consultado; os testes usaram o projeto associado à chave fornecida.

## Importação no sistema

As três estruturas aceitas foram importadas em conta temporária separada. Foram verificados:

- preservação dos tópicos retornados pela IA, sem alterações ao gravar e recarregar;
- quantidade de opções e matérias;
- seleção de cargo, ativação e geração do plano para os editais com conteúdo;
- bloqueio da ativação do edital sem conteúdo programático.

Esses testes passaram. Eles verificam a integração e a persistência, não corrigem omissões ou reescritas da IA. Nenhum edital ou histórico do usuário foi substituído. A conta e suas credenciais temporárias foram removidas ao final.

## Método, artefatos e reprodução

As chamadas reais usaram os serviços `PdfTextExtractor`, `GeminiEditalExtractor`, `OpenRouterEditalExtractor` e `EditalStructureValidator`. Não foram feitas chamadas duplicadas aos provedores para repetir os mesmos resultados pelo upload HTTP. A etapa de persistência utilizou os endpoints reais de importação, dashboard, seleção, ativação e plano.

Executores: `server/tests/api/live-ai-editais.php` e `server/tests/api/live-ai-import.mjs`. O primeiro faz chamadas externas e deve ser executado intencionalmente com as chaves configuradas, nunca como parte automática de uma suíte unitária.

```text
php tests/api/live-ai-editais.php gemini DIRETORIO_DOS_PDFS
php tests/api/live-ai-editais.php openrouter DIRETORIO_DOS_PDFS
```

Textos extraídos, respostas, estruturas e relatórios JSON estão em `server/writable/testing/live-ai-editais/`, ignorados pelo Git. Os relatórios principais são `gemini-results.json`, `openrouter-results.json` e `import-results.json`. A primeira coluna da tabela registra páginas que produziram texto, não uma contagem visual certificada de todas as páginas.

## Próximos ajustes recomendados

1. Identificar primeiro o inventário de cargos e os intervalos de conteúdo programático, antes de extrair todo o conteúdo.
2. Extrair por blocos ou cargos e conferir a cobertura contra esse inventário. Retomar somente as partes com falha.
3. Preservar trechos do PDF como fonte verificável e detectar reescritas ou omissões antes de confirmar o edital.
4. Diferenciar na interface indisponibilidade 503, cota 429, timeout e conteúdo incompleto. Esperar ou trocar de provedor não resolve todos esses casos.
5. Testar a abordagem em partes com Porto Velho e ManausPREV antes de considerar a importação automática confiável para todos os cargos.

Esses ajustes são propostas a partir dos testes. Não foram implementados silenciosamente nesta execução.
