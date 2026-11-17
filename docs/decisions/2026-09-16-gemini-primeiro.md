# Gemini como primeira tentativa

## Decisão

Usar `GEMINI_API` para tentar `GEMINI_MODEL` (padrão `gemini-3.6-flash`) antes do OpenRouter. Sem a chave Gemini, preservar o fluxo anterior. Falhas do Gemini, incluindo autenticação, cota, timeout e resposta inválida, permitem seguir para o OpenRouter dentro do orçamento restante.

Uma alternativa seria misturar os dois provedores no seletor de modelos gratuitos do OpenRouter. Isso confundiria autenticação, catálogo e regras de preço. Um coordenador pequeno mantém cada provedor separado, com um único prazo e número máximo de tentativas. Schema, prompt, validador e transporte HTTP são compartilhados, sem dependências novas.

O endpoint de compatibilidade OpenAI do Google aceita as mensagens e o JSON Schema usados pela aplicação. A chave vai apenas no cabeçalho de autorização para o endereço fixo do Google. Diagnósticos não incluem chaves nem mensagens brutas de erro do provedor. Tentativas anteriores são preservadas quando outro provedor conclui a importação.

O nível gratuito do Gemini tem cotas próprias. Diferentemente do OpenRouter, a API direta não tem restrição `max_price=0`; a cobrança depende do plano do projeto Google associado à chave. A integração não altera esse plano.

## Verificação

No teste real, o Google recusou `gemini-2.5-flash` para novas contas, apesar de listá-lo no catálogo, e indicou `gemini-3.6-flash`. O padrão foi ajustado para esse modelo. O upload de `edital4.pdf` pela API concluiu na primeira tentativa Gemini em 8,5 segundos, salvando o nome e a ausência de conteúdo programático. Não foi necessário chamar o OpenRouter nessa execução. A suíte unitária passou com 68 testes e 259 verificações.

## Referências

- https://ai.google.dev/gemini-api/docs/openai
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
