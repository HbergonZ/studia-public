# Validação das melhorias do fluxo

Atualização: 18/10/2026. Referência: [M01 a M27](2026-10-17-melhorias-fluxo-usuario.md) e [ADR 0008](../adr/0008-confiabilidade-fluxo-estudo.md).

## Entrega

As 27 melhorias foram implementadas. Home mantém o plano diário com altura fixa e rolagem interna e o ritmo semanal dentro de um card. A entrega inclui proteção de histórico, correção de sessões, recuperação do cronômetro, rascunhos, retomada de importação, gestão de acesso, melhorias de teclado, datas e desempenho.

A proteção de conteúdo com histórico foi mantida mesmo após a autorização para apagar dados de teste. Nenhuma limpeza de registros do usuário foi necessária. Os testes usam contas temporárias próprias, removidas pelo utilitário de fixture.

## Evidências automatizadas

| Verificação | Resultado |
| --- | --- |
| PHP, `vendor/bin/phpunit --no-coverage` | 101 testes e 306 asserções passaram. |
| API de estudo diário | Capacidade, pausas, plano salvo, idempotência, conflitos e registros passaram. |
| API de unidades e editais reais | Organização, preservação da origem e importação dos cinco exemplos passaram. Nenhuma chamada paga de IA foi feita. |
| API administrativa e de confiabilidade | Isolamento entre contas, CSRF, validação, configuração atômica, pesos, correção auditada, bloqueio de remoção/reextração, revogação de acesso e limite de tentativas de login passaram. |
| Cálculos TypeScript | Fuso, virada de data, semana, revisão atrasada e precisão agregada por questões passaram. |
| Build de produção | TypeScript e Vite passaram; páginas secundárias divididas em arquivos carregados sob demanda. |
| Lint da interface | Zero erros e 12 avisos. Avisos envolvem sincronização de efeitos, dependências de hooks e organização de exports para Fast Refresh. Não equivalem a 12 falhas reproduzidas. |
| Diferenças dos arquivos | `git diff --check` passou. |
| Detector Impeccable | Zero achados na varredura final de `app/src`. |

As suítes reproduzíveis estão em `server/tests/api/`, `server/tests/unit/` e `app/tests/study-calculations.cjs`. Os testes de navegador usam Edge isolado via CDP e dados temporários; não automatizam o navegador pessoal do usuário.

## Navegador e interface

- Percurso de sete rotas em 1440, 390 e 320 px, sem transbordamento horizontal nem exceções JavaScript.
- Plano com altura fixa e rolagem interna em dias normais, vazios e cheios, em nove combinações de dia e viewport.
- Seis fluxos de modal em quatro tamanhos, incluindo 320 px e paisagem de 844 px, com textos extensos, conteúdo rolável e rodapé acessível.
- Contenção de Tab, Escape, fundo inerte e retorno ao controle que abriu o modal.
- Quatro abas móveis com nomes visíveis, busca sem acentos e paginação de 30 unidades.
- Rotina não salva preservada após navegação; edição com falha de rede e nova tentativa.
- Cronômetro recuperado após voltar pelo navegador, sem criar sessão automaticamente.
- Registro e correção de sessão; formulário preservado após logout, reautenticação e nova tentativa.
- Resposta de criação de edital perdida depois do commit: retry reutiliza o edital, sem duplicação.
- Navegador em Pacific/Kiritimati com perfil em America/Manaus: calendário respeita o perfil.
- Texto ampliado a 200% em Home, Tópicos e Configurar, nos três tamanhos.
- Organização de unidades preserva o histórico da origem; falha de aplicação da proposta mantém a possibilidade de retomar.
- Gráfico com sete linhas na tabela de valores diários e redefinição de acesso pela tela administrativa passaram no navegador.
- Login imediato e restauração de sessão passaram em desktop e celular, sem apagar campos digitados durante resposta tardia. Indicador único de carregamento, falha, retry e atualização em segundo plano passaram.
- Navegação e troca obrigatória de senha passaram sem flash da tela de login. Conta vazia mostra o primeiro acesso sem fingir um plano carregado; conta ativa aguarda seus dados reais.

## Publicação

Compilação publicada em o endereço público do Tailscale, com recriação conjunta dos serviços web e Tailscale. Página e arquivos novos responderam HTTP 200; dashboard sem autenticação respondeu HTTP 401. Configuração do Nginx validada e PHP saudável.

JavaScript público servido com gzip. Respostas de conta anônima usam `no-store`. A regressão final de confiabilidade da API também passou após a publicação; contas e credenciais temporárias foram removidas.

Identificação dos arquivos principais desta entrega: `index-EiicBqgS.js` e `index-MCSViFpT.css`. As suítes de navegador executaram a mesma imagem em prévia local isolada antes da publicação.

Capturas de trabalho ficam em `server/writable/testing/layout-qa/`, ignoradas pelo Git. A inspeção visual conferiu a biblioteca em desktop e a configuração em celular, além dos cards e modais verificados nos testes anteriores desta entrega.

## Conta grande

Medição local com PostgreSQL, PHP e navegador em contêineres/host deste ambiente. Não representa um teste de carga de múltiplos usuários.

| Medida | Resultado |
| --- | --- |
| Volume | 5.000 unidades e 10.000 sessões |
| Montagem do dashboard, cinco execuções | 336,3; 146,4; 133,5; 119,6; 134,6 ms |
| Resposta JSON sem compressão | 2.880.091 bytes |
| Abertura da biblioteca no navegador | Cerca de 1,6 s |
| Elementos de estudo renderizados na página | 30 |
| Busca pela última unidade | Encontrada, sem exceções JavaScript |

O servidor passou a consultar dados em lote e o Nginx comprime JSON, JavaScript, CSS e fontes. A resposta ainda inclui o histórico necessário às telas; uma futura paginação da API pode reduzir transferência em volumes muito maiores. Não foi introduzido cache de dados privados.

## Backup

Backup anterior às migrações: `server/writable/backups/2026-10-17-before-improvements.dump`. Restauração concluída em banco isolado `studia_restore_check_20261017`, sem substituir o banco em uso. SHA-256: `536B00AC84C61FE19CC9112690E3BD9C60BF43A834A83EA650B98CA158F85940`.

Procedimento e responsabilidades em [Backup e restauração](../uso/backup-e-restauracao.md). Não foi configurada cópia automática externa: o destino e a retenção operacional ainda precisam ser definidos.

## Limites da validação

Os resultados cobrem os cenários descritos, sem prometer ausência de defeitos. Não foram executados teste de invasão, leitor de tela físico, gestos em aparelho real, uso simultâneo em aparelhos físicos ou teste de carga distribuída. Duas sessões de API verificam conflitos e isolamento; isso não substitui todos os cenários possíveis entre dispositivos.

Provedores externos de IA não foram acionados. Proteção contra reextração, importação de respostas, processamento em andamento e recuperação de falha foram testados localmente. Disponibilidade, tempo e qualidade de respostas futuras dos provedores permanecem condições externas.

Os checkpoints e rascunhos ficam no navegador da conta. Limpar o armazenamento do navegador remove esses dados ainda não registrados. O cronômetro recupera pausado e não acrescenta tempo enquanto a página esteve fechada.

## Refinamento do editor de bloco após uso

O responsável pelo produto apontou que o modal de ajuste era pequeno e a busca inicial não tinha uma função clara. O editor passou a usar largura máxima de 768 px e altura limitada à tela, com assunto atual e duração apresentados primeiro. “Trocar assunto” revela uma busca que filtra resultados visíveis, com matéria e título completo; selecionar um resultado atualiza o bloco em edição. Cancelar fecha sem salvar. Rodapé fixo, foco e rolagem interna foram preservados.

Verificações adicionais: build de produção aprovado; lint dos dois componentes alterados sem avisos nem erros; inspeção visual em desktop e celular; teste de resultado vazio, seleção, gravação de assunto e duração e dimensões dos modais em 1440, 390, 320 px e paisagem de 844 px. O teste também verifica que o resultado encontrado fica visível sem rolar no desktop.
