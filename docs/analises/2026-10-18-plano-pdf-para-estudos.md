# Plano: do PDF ao plano de estudos

Objetivo: enviar o PDF, confirmar o cargo, conferir as matérias e definir a rotina, com retomada segura e dúvidas apresentadas em linguagem simples.

Legenda: `[x]` implementado e verificado; `[ ]` pendente. Itens existentes são identificados. A marcação será atualizada com evidências, sem confundir uma resposta estruturalmente válida com um programa completo.

## Decisão de implementação

Há duas alternativas: substituir a importação por um processamento inteiro em segundo plano, ou fortalecer as etapas atuais e introduzir a fila quando a leitura/OCR exigir. Seguiremos a segunda, para preservar a importação, testar os problemas conhecidos e evitar novas dependências antes de comprovar necessidade. Não haverá exclusão do histórico existente.

## 1. Base recuperável, crítica

- [x] Existente: PDF armazenado, texto original, rascunho no servidor e escolha do cargo preservados.
- [x] Existente: repetição segura do upload e da aplicação, controle de revisão, CSRF e isolamento entre contas.
- [x] Existente: fallback Gemini/OpenRouter com limites de tentativas e alternativa de IA externa.
- [x] Apresentar progresso, revisão pendente e falha temporária como estados distintos.
- [x] Manter resultados válidos ao corrigir somente uma parte da extração.

## 2. Conferência independente, crítica

- [x] Detectar conteúdo descoberto entre blocos, inclusive continuação após quebra de página.
- [x] Detectar final omitido antes do próximo perfil/cargo ou anexo reconhecível.
- [x] Bloquear aplicação enquanto houver pendências; reavaliar no servidor, sem confiar no navegador.
- [x] Mostrar páginas, trecho e contexto da pendência.
- [x] Permitir decisão explícita e registrada quando um trecho não pertencer ao cargo, sem exclusão automática pela IA.
- [x] Corrigir somente lacunas, conservando os blocos aceitos e o texto original.
- [x] Regressão com as omissões reais de DATAPREV e CNU e proteção contra incluir outro cargo.
- [x] Permitir reabrir uma decisão de aplicabilidade sem reenviar o conteúdo. A decisão pode ser reaberta diretamente na revisão, sem consulta à IA.
- [x] Medir limitações: a ausência de uma lacuna detectada não certifica completude.

## 3. Leitura e identificação, alta

- [x] Existente: limite de arquivo, validação de PDF, conversão local e páginas referenciadas.
- [x] Sinalizar páginas intermediárias sem texto e páginas com pouco texto legível, com orientação para conferir.
- [x] Diagnóstico de qualidade de todas as páginas físicas, incluindo imagens e páginas finais sem texto. Usa a contagem física do PDF, o modo de extração e alertas por página. Não certifica acurácia visual do OCR.
- [x] OCR para páginas digitalizadas, com limites de recursos e retomada. Avaliar ferramentas disponíveis antes de adicionar dependência.
- [x] Distinguir PDF integral, anexos e retificações; solicitar documento complementar quando necessário.
- [x] Confirmar prova de conhecimentos para evitar tratar títulos/experiência como programa.
- [x] Restringir o formato solicitado de identificadores no schema da IA, preservando nomes oficiais e compatibilidade com rascunhos anteriores.
- [x] Melhorar mensagens por opção e repetir CRECI/SP: inventário de dez cargos e conteúdo do Assistente Administrativo retornados pelo OpenRouter; ver relatório de 19/10.

## 4. Organização e rotina, alta

- [x] Dividir automaticamente em unidades sem inventar, resumir ou perder vínculo com a fonte.
- [x] Conferir cobertura e duplicações também após a divisão.
- [x] Levar a pessoa da revisão diretamente à rotina, preservando configurações existentes (caminho existente, confirmado no teste completo).
- [x] Existente: disponibilidade, duração dos blocos, plano diário e revisões.
- [x] Verificar o percurso completo de uma conta nova, do upload ao primeiro bloco de estudo.

## 5. Operação e verificação, alta

- [x] Processamento em segundo plano, cancelamento e retomada por etapa, sem depender de manter a requisição aberta.
- [x] Falhas de cota com orientação para retomar, sem repetir automaticamente chamadas que podem esgotar a conta.
- [x] Executar e registrar a regressão nos seis PDFs, por cargo e provedor. Houve falhas de disponibilidade/validação, sem aprovar os resultados inválidos; ver relatório de 19/10.
- [x] Testes da API, navegador em desktop/celular e publicação da versão validada para o lote 1.

## Evidências desta implementação

Lote 1, conferência e correção localizada, implementado e publicado. Página, rota de importação e arquivos da versão pública responderam HTTP 200; a API sem autenticação respondeu 401. Contas temporárias e contêiner de prévia removidos.

- Backend: 122 testes, 354 asserções, todos aprovados.
- Regressão local das respostas capturadas: detectou a lacuna da DATAPREV nas linhas 1493 a 1499 e do CNU nas linhas 3407 a 3415. Porto Velho e ManausPREV não geraram pendências nesse recorte.
- Chamadas reais de correção: entradas de 1.567 caracteres (DATAPREV) e 1.578 (CNU). OpenRouter corrigiu ambos em aproximadamente 3,9 e 3,3 segundos. Gemini corrigiu DATAPREV em 1,6 segundo e falhou na validação do CNU. Esses tempos são das correções isoladas, não de uma importação integral.
- API: bloqueou aplicar conteúdo pendente; preservou os blocos após uma correção inválida; rejeitou decisões forjadas na resposta da IA; exigiu confirmação e motivo para uma decisão humana; invalidou decisões ao substituir o conteúdo; corrigiu os dois exemplos mantendo fonte e cargo selecionado.
- Navegador: fluxo existente e fluxo de pendências/correção, em 1440, 390 e 320 px, com recarga e confirmação para aplicar; sem exceções JavaScript e sem transbordamento horizontal. Build TypeScript/Vite aprovado.
- Diagnóstico de leitura: páginas intermediárias ausentes ou com menos de 40 letras são sinalizadas. Isso não equivale a OCR ou a uma avaliação visual do PDF inteiro.

Executores: `server/tests/api/job-import-coverage.php` (offline), `live-job-import-storage.mjs` (API sem IA), `job-coverage-browser.mjs` (navegador) e `live-job-repair.php` (chamadas externas deliberadas). Artefatos locais ficam em `server/writable/testing/live-job-import/`, ignorado pelo Git. Nenhum histórico do usuário foi alterado.

## Limites e sequência dos próximos lotes

A conferência examina intervalos de até 100 linhas próximos às seções encontradas. Cabeçalhos de outros cargos e anexos interrompem a busca; cabeçalhos e rodapés repetidos são desconsiderados. A correção não pode modificar blocos aceitos, sair da lacuna nem cortar uma parte não vazia de uma lacuna que começou a corrigir.

Ainda pode passar despercebida uma disciplina inteira distante das seções encontradas, uma página omitida pelo inventário ou uma classificação incorreta de títulos como programa. Por isso a interface diz “pronto para sua conferência”, sem certificar completude. As correções reais resolveram as duas omissões conhecidas, mas não são uma nova aprovação integral dos seis documentos.

## Lote 2, atualização de 19/10/2026

Os itens de implementação restantes foram entregues e verificados. O mapa local mostra as seções de programa e suas páginas. A identificação de retificações/anexos é uma heurística com confirmação humana, não uma prova de que todos os documentos necessários estão presentes. A conferência de lacunas continua local e conservadora, com bloqueio de escolaridade/perfil incompatível quando há cabeçalho explícito.

- OCR local com Tesseract e Poppler, incluindo teste de PDF inteiramente em imagem e página final vazia. Uma fonte de substituição foi necessária para renderizar PDFs sem fonte incorporada.
- Fila PostgreSQL, serviço `worker`, cancelamento, retomada e expiração de tarefa interrompida. Limites: 15 MB, 200 páginas, resolução de 2200 px, prazos por processo, dez minutos por leitura, um worker com 768 MB e uma CPU. Cache de páginas reaproveitado.
- Unidades literais, títulos únicos e validação da cobertura antes da gravação. Fontes, unidades, histórico e rotina existente preservados nos testes da API.
- Reabrir conferência de uma decisão sem reenviar o conteúdo, testado pela API e pelo navegador.
- Uma conta nova percorreu o upload pelo navegador até o primeiro plano, em desktop e celular. Backend: 128 testes e 372 asserções aprovados. Testes de organização e confiabilidade existentes também aprovados.
- Rodada real dos seis PDFs repetida com Gemini e OpenRouter, com registro por arquivo. Nem todas as respostas foram aprovadas. O relatório distingue disponibilidade, formato e conferência documental.

Resultados e limitações: [cotas e regressão final de 19/10](2026-10-19-cotas-e-regressao-final.md). Não há garantia de extração integral de qualquer documento ou disponibilidade permanente da cota gratuita. Os limites e os estados de pendência fazem parte do fluxo.

Publicação do lote 2 concluída: página, rota e arquivos JavaScript/CSS públicos responderam 200; API sem autenticação respondeu 401. Serviços PHP, PostgreSQL, worker, web e Tailscale em execução. Contas temporárias e contêiner de prévia removidos. Nenhum histórico do usuário foi excluído.
