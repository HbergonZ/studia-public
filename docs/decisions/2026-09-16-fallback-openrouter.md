# Tentativas de importação com modelos gratuitos

## Problema

A extração dependia de uma única chamada ao modelo configurado. Indisponibilidade, limite do provedor ou uma resposta inválida encerravam a importação.

## Alternativas e decisão

O roteador `openrouter/free` escolhe modelos automaticamente, mas não permite controlar a ordem nem validar o conteúdo antes de trocar de modelo. O fallback nativo do OpenRouter cobre falhas de requisição, mas não a validação de uma resposta recebida com sucesso.

O Studia passa a controlar tentativas sequenciais de modelos distintos, usando cURL e o validador existentes, sem novas dependências. A execução continua síncrona: 300 segundos no total, 90 por tentativa e até 4 modelos. O orçamento total é limitado a 540 segundos, abaixo dos 630 segundos do Nginx, e abrange descoberta, chamadas, esperas e validação. Extração local do PDF e gravação no banco acontecem fora do orçamento das chamadas de IA.

## Seleção e validação

- Consultar o catálogo atual para verificar preço, capacidades e contexto. Não confiar apenas no sufixo `:free` ou numa lista fixa.
- Priorizar o modelo configurado e a lista opcional de preferências, desde que elegíveis. Completar a seleção com o catálogo gratuito.
- Usar preço máximo zero na requisição e exigir suporte aos parâmetros enviados.
- Reservar espaço para a resposta e respeitar os limites de saída de cada modelo. Estimar a entrada por dois bytes UTF-8 por token, incluindo mensagens, schema e margem de enquadramento. É uma aproximação para documentos em português, não um tokenizer universal; o provedor pode rejeitar o contexto e provocar nova tentativa. Nenhum trecho é truncado para caber. A estimativa anterior de um token por caractere excluía indevidamente modelos de 262 mil tokens para o edital4.
- Rejeitar truncamento, JSON inválido, tipos incorretos, referências inválidas, aplicabilidade ambígua, itens descartáveis e extração declarada incompleta.
- Manter a compatibilidade da importação manual de respostas antigas.
- Gravar a estrutura somente após aprovação. Registrar modelo, duração e motivo de cada tentativa, sem credenciais ou texto do documento nos diagnósticos.
- Encerrar erros de autenticação/configuração e cotas sem janela de liberação utilizável. Respeitar `Retry-After` dentro do orçamento restante, com espera de no máximo 30 segundos.

As verificações não demonstram fidelidade integral ao documento. A revisão do conteúdo antes da ativação continua necessária. Sem resposta aprovada, o edital recebe o estado de falha e uma mensagem explicativa.

## Referências

- https://openrouter.ai/docs/guides/routing/model-fallbacks
- https://openrouter.ai/docs/guides/routing/provider-selection
- https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties
- https://openrouter.ai/docs/api_reference/limits
