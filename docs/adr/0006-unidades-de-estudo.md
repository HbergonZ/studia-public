# Unidades de estudo com origem preservada

Decisão: manter o fluxo de copiar prompt e importar JSON, sem nova dependência ou chamada a uma API de IA. Separar a extração documental da organização em unidades menores. A alternativa de cortar por pontuação perde contexto; apenas mudar o prompt de extração não atende editais existentes.

Tópicos originais permanecem no banco e conservam suas sessões e planos salvos. Quando organizados, tornam-se fontes, saem das novas sugestões e recebem unidades filhas com títulos curtos e trechos de origem. Cada filha tem progresso e revisão próprios. Tempo e questões anteriores não são distribuídos artificialmente.

O novo JSON aceita tópicos com title, source e units. Strings antigas continuam válidas. A concatenação dos trechos das unidades deve reproduzir o original, ignorando apenas espaços. A validação comprova cobertura do texto recebido, não a fidelidade da resposta ao PDF que não foi fornecido ao sistema. A interface pede essa conferência.

Importações novas têm prévia antes de criar o edital. Editais existentes têm exportação de prompt, prévia sem escrita e aplicação transacional com revisão do conteúdo e bloqueio concorrente por usuário. IDs permanecem na matéria e no cargo de origem. Reimportar uma estrutura completa em edital já preenchido é bloqueado para preservar o histórico.

Fontes permanecem disponíveis para consulta. Unidades podem ser renomeadas e reorganizadas novamente. Planos salvos continuam válidos e novos planos usam apenas unidades ativas. Uma sessão de 25 minutos não implica concluir uma unidade.

O fluxo padrão entrega a divisão no próprio prompt de importação. Para editais existentes, os assuntos ainda não organizados entram automaticamente no prompt, em lotes de até 20 assuntos e aproximadamente 20 mil caracteres de origem. Um assunto acima desse tamanho ocupa um lote sozinho. Após aplicar, o próximo lote é selecionado sem exigir configuração. A seleção manual fica como ajuste opcional; unidades já organizadas não são selecionadas novamente por padrão.
