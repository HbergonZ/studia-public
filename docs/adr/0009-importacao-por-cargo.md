# ADR 0009: importar o conteúdo depois de escolher o cargo

Data: 18/10/2026. Decisão autorizada pelo responsável pelo produto.

Extrair todos os cargos em uma resposta produziu omissões, texto reescrito e timeouts nos testes reais. Apenas acrescentar o nome do cargo ao prompt mantém descoberta, associação e transcrição concentradas na mesma chamada. A solução escolhida separa inventário, seleção e localização do conteúdo.

O PDF é convertido localmente em linhas numeradas. A primeira análise identifica cargos, evidências no documento e páginas do programa. Depois da escolha, a segunda análise localiza os intervalos de conteúdo geral e específico para aquele cargo. O servidor monta os textos a partir dessas linhas, sem aceitar transcrição reescrita da IA. A pessoa confere os trechos antes de gravar o catálogo.

O mesmo contrato de resposta é usado na API integrada e no prompt para IA externa. Rascunho e seleção ficam no servidor, com revisão para detectar conflitos e estado de processamento recuperável. Falha não remove progresso. Operações verificam propriedade, CSRF e ausência de conteúdo já importado.

Não há nova dependência nem fila de tarefas. As chamadas continuam limitadas pelo orçamento existente; o limite de saída é menor por etapa. A importação antiga de JSON e os editais existentes permanecem disponíveis. A importação por cargo cria uma opção selecionada e pode ser repetida em outro edital para estudar outro cargo.

Localização com referências e conferência humana reduz o risco, sem provar automaticamente a completude do documento. Os testes devem verificar Enfermeiro em Porto Velho e TI no ManausPREV, inclusive conteúdos compartilhados, fontes literais e exclusão dos específicos de outros cargos.
