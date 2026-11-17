# ADR 0010: conferir lacunas antes de importar

Data: 18/10/2026.

DATAPREV e CNU demonstraram que `complete=true` pode acompanhar uma localização incompleta. A conferência será local e independente da resposta: procurar texto relevante entre seções próximas e no final de seções antes de um próximo cargo/perfil ou anexo reconhecido. Cabeçalhos repetidos, marcadores de página e rodapés não devem gerar pendência sozinhos.

Uma conferência global de todas as páginas do programa incluiria específicos de outros cargos. Por isso, a primeira versão examina vizinhanças delimitadas e registra seu limite: não certifica a completude de todo o edital nem substitui a revisão.

Pendências impedem aplicar o catálogo. A IA pode acrescentar somente intervalos pendentes, sem remover ou reescrever blocos aceitos. A pessoa pode declarar explicitamente que um trecho não pertence ao cargo; essa decisão fica ligada ao intervalo e ao texto original. Trocar o conteúdo invalida decisões que já não correspondam às mesmas lacunas.

O rascunho JSON existente guarda decisões e resultados, sem nova tabela ou dependência. A aplicação recalcula a conferência ao ler e ao gravar. Testes devem reproduzir as duas omissões reais e garantir que outro cargo não seja anexado por uma correção.
