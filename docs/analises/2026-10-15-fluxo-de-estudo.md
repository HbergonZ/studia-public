# Análise do fluxo de estudo do Studia

Data: 15/10/2026.

## Conclusão

A proposta é coerente: transformar um edital em orientação prática de estudo, registrar o que foi feito e organizar revisões. A implementação já oferece importação, revisão humana do conteúdo, disponibilidade, registro de sessões e histórico. A lacuna principal está entre cadastrar o conteúdo e decidir o que realmente cabe no dia.

Hoje há uma fila de tópicos elegíveis, uma distribuição semanal de horas e um calendário de revisões. Essas três representações não formam um plano de execução único. A interface chama parte dessa fila de plano do dia e acaba transmitindo uma obrigação maior do que a capacidade informada pelo usuário.

A recomendação é implementar um plano diário limitado pelo tempo, sugerido pelo sistema e editável pelo usuário. Corrigir primeiro as inconsistências de revisão e de confirmação de registros. Preservar o conteúdo completo, o calendário, o histórico e o quadro de revisões, com papéis mais claros.

## Escopo e evidência

Foram examinados o planejamento original, a entrada de editais, a confirmação de conteúdo, a configuração, a mesa de estudo, a fila, o calendário, a distribuição semanal, o cronômetro, o registro e os cálculos de revisão no cliente e no servidor. Foi usada a skill frontend-design para avaliar hierarquia de informação e clareza das ações.

Foram executadas simulações com as funções reais de cronograma, distribuição de tempo e revisão, usando dados fictícios, sem consultar ou modificar registros pessoais. Não foi realizada uma pesquisa com usuários nem uma auditoria completa de segurança. As propostas de organização abaixo são recomendações de produto, ainda não são decisões implementadas.

## Achados, por prioridade

### 1. Crítico: o servidor e a interface podem discordar sobre a próxima revisão

O servidor ajusta a posição da curva ao salvar a sessão. O dashboard devolve essa posição já ajustada e os acertos e erros acumulados. A interface aplica novamente um ajuste de desempenho antes de calcular a data. Além disso, usa o resultado acumulado, enquanto o servidor usa o resultado da sessão enviada.

Reprodução isolada: posição inicial 0, sessão em 15/10/2026, 10 acertos e nenhum erro. O servidor retorna posição 1 e revisão em 22/10/2026. Ao receber posição 1 e esses resultados, a interface apresenta revisão em 31/10/2026.

Consequência: calendário, fila e detalhes podem orientar uma revisão diferente da gravada no banco. Antes de melhorar a organização visual, o sistema precisa oferecer uma data confiável.

Recomendação: adotar o cálculo do servidor como fonte única e devolver explicitamente a próxima revisão no dashboard. Definir também qual resultado deve influenciar a curva, sem aplicar a transição duas vezes.

Evidências: `server/app/Services/ReviewScheduleService.php`, `server/app/Controllers/Api/V1/SessionsController.php`, `server/app/Controllers/Api/V1/DashboardController.php`, `app/src/lib/curva.ts`.

### 2. Alta: a lista de hoje contém todo o conteúdo ainda não iniciado

`montarCronograma` coloca qualquer tópico sem última revisão com status `novo` e data prevista igual a hoje. `itensDoDia` inclui todos os novos. A disponibilidade não participa dessa escolha.

O painel diário estima um tópico por hora, mas apenas coloca um pequeno ícone nos itens além dessa capacidade. Não limita a lista. A simulação com 30 tópicos novos e 2 horas disponíveis produziu 30 itens para hoje e uma capacidade exibida de 2 tópicos. Mesmo um dia com disponibilidade zero pode continuar mostrando uma lista de estudos.

Consequência: a tela transmite que todo o edital está pendente agora. Não há uma separação suficientemente clara entre conteúdo disponível para estudar e compromisso assumido para o dia.

Recomendação: separar biblioteca de conteúdo, fila de prioridades e plano do dia. Conteúdo novo só recebe uma data de execução ao entrar no plano. O restante continua disponível, sem ser apresentado como obrigação diária.

Evidências: `app/src/lib/cronograma.ts`, `app/src/components/AlertaHoje.tsx`.

### 3. Alta: planejamento semanal, fila e plano diário usam critérios diferentes

O planejamento semanal distribui cada dia entre todas as matérias, proporcionalmente ao peso. Dentro de cada matéria, sugere até três tópicos por dificuldade. O plano diário ordena por status e peso e assume uma hora por tópico. A fila superior simplesmente mostra os quatro primeiros itens do cronograma, inclusive revisões futuras se não houver itens anteriores suficientes.

Nenhuma dessas representações compõe um plano diário salvo e compartilhado pelas demais. Com a mesma disponibilidade em dois dias, a distribuição semanal pode repetir as mesmas sugestões, sem descontar o tempo já registrado. O arredondamento também pode gerar pequenos blocos ou tempos por tópico iguais a zero quando há pouco tempo.

Consequência: o usuário pode seguir a fila, a lista de hoje ou o planejamento semanal e receber orientações diferentes. O calendário também herda a concentração dos conteúdos novos em hoje, em vez de mostrar uma distribuição real dos primeiros estudos.

Recomendação: uma única decisão de planejamento deve alimentar a fila, a mesa e o calendário. O planejamento semanal precisa mostrar a programação resultante, com indicação do que é estimativa e do que foi confirmado.

Evidências: `app/src/lib/planejamento.ts`, `app/src/components/PlanejamentoSecao.tsx`, `app/src/pages/Dashboard.tsx`, `app/src/components/CalendarioSecao.tsx`.

### 4. Alta: falta distinguir uma sessão de estudo da conclusão do primeiro estudo

Qualquer registro atualiza a última revisão e agenda a próxima. Não existe uma ação para dizer que houve apenas um bloco de estudo e que o assunto precisa continuar. Isso é especialmente problemático quando um tópico extraído representa um conteúdo amplo.

O cronômetro funciona separado desse registro: o modal começa com tempo zero e não recebe automaticamente o tempo realizado. O botão com ícone de play na lista diária abre o registro, enquanto o botão iniciar na mesa abre o cronômetro. A pessoa precisa aprender duas interpretações para uma ação visual parecida.

Recomendação: unificar a sequência selecionar bloco, iniciar, encerrar e confirmar registro. Permitir registrar estudo sem cronômetro. No encerramento, distinguir continuar o assunto de concluir o primeiro estudo e, quando aplicável, revisar. O registro deve sugerir o tempo medido, permitir correção e não gravar automaticamente sem confirmação.

Evidências: `app/src/components/SessaoFoco.tsx`, `app/src/lib/pomodoro.ts`, `app/src/components/RegistrarSessaoModal.tsx`, `app/src/components/AlertaHoje.tsx`, `server/app/Controllers/Api/V1/SessionsController.php`.

### 5. Alta: o registro pode parecer concluído antes de ser confirmado pelo servidor

`registrarSessao` retorna `void` e inicia a chamada assíncrona. O modal chama os callbacks de sucesso e fecha imediatamente. A lista diária pode marcar um item como finalizado antes da resposta. O erro é guardado no contexto, mas a mesa não o apresenta.

Consequência: uma falha de gravação pode ser percebida como sucesso. Isso prejudica a confiança no histórico e no planejamento.

Recomendação: aguardar a confirmação, bloquear cliques repetidos durante o envio, manter o formulário aberto em caso de erro e atualizar o plano somente depois da gravação confirmada.

Evidências: `app/src/context/EstudoContext.tsx`, `app/src/components/RegistrarSessaoModal.tsx`, `app/src/components/AlertaHoje.tsx`, `app/src/pages/Dashboard.tsx`.

### 6. Média: configurar não produz a programação que o texto promete

A confirmação do conteúdo encaminha corretamente para configuração, mas disponibilidade e metas podem permanecer zeradas. A ação “Gerar cronograma” salva essas preferências e retorna à mesa. Não cria uma distribuição de tópicos novos nos dias. A animação de geração reforça uma expectativa que a saída não atende.

Há ainda uma diferença entre o planejamento original e a implementação: a dificuldade inicial deveria determinar a entrada na curva. Existem funções para isso, mas os caminhos examinados de criação e atualização de tópicos não usam essa inicialização; a posição no banco começa em zero.

Recomendação: após revisar o conteúdo, pedir uma rotina mínima e apresentar uma prévia concreta do plano. Evitar exigir a avaliação de cada tópico para começar; oferecer valores iniciais simples e refinamento posterior. Explicar se dificuldade é apenas uma informação ou se realmente muda a programação.

Evidências: `planejamento.md`, `app/src/pages/RevisarExtracao.tsx`, `app/src/pages/Configuracao.tsx`, `app/src/context/EstudoContext.tsx`, `server/app/Controllers/Api/V1/CatalogController.php`, `server/app/Database/Migrations/2026-08-30-000001_CreateStudiaTables.php`.

### 7. Média: não existe um limite claro para terminar o dia ou lidar com excesso de revisões

A disponibilidade não é usada para descontar o tempo estudado nem para encerrar a lista diária. As revisões atrasadas sempre precedem as demais, sem uma política explícita de recuperação quando o acúmulo cresce. Em uma carga grande, isso pode impedir por muito tempo o avanço no conteúdo novo.

Recomendação: mostrar tempo planejado, realizado e restante. Ao concluir o plano, apresentar um encerramento claro e a opção de estudar algo extra. Para dias perdidos, oferecer uma proposta de redistribuição que respeite a capacidade, sem transformar todo conteúdo não iniciado em atraso. A proporção entre revisão e conteúdo novo precisa ser decidida e testada, não imposta como um percentual arbitrário nesta análise.

### 8. Média: a mesa pede muitas decisões ao mesmo tempo

Sessão, fila, lista diária, calendário, quadro de revisões, planejamento semanal, metas e dois conjuntos de progresso ficam na mesma página. Vários repetem o conteúdo com agrupamentos diferentes. O usuário precisa reconciliar essas informações antes de saber por onde começar.

Recomendação: a mesa deve responder primeiro “o que faço agora?”, “quanto cabe hoje?” e “quando terminei?”. Manter calendário e quadro de revisões acessíveis em uma área de planejamento e progresso em outra, preservando as funcionalidades. O quadro atual é um agrupamento por situação, sem ações de organização de cartões; apresentá-lo como visão de revisões evita sugerir um planejador manual que ele ainda não oferece.

### 9. Média: alguns indicadores comunicam mais certeza do que os dados sustentam

“Dominado” usa a taxa acumulada de acerto a partir de 80%, sem quantidade mínima de questões. Um único acerto já satisfaz essa classificação. “Estudado” significa ter um registro, o que não garante que o conteúdo inteiro foi coberto.

Há também um problema concreto no gráfico de tempo por matéria: as sessões do dashboard recebem `materiaId` vazio, mas o gráfico agrupa por esse campo. Portanto, a distribuição pode ficar vazia mesmo com sessões registradas.

Recomendação: separar cobertura, prática e desempenho. Até existir um critério acordado de domínio, usar um rótulo descritivo como “bom desempenho nas questões registradas”, mostrando a amostra. Corrigir a associação entre sessão e matéria antes de usar esse gráfico para orientar decisões.

Evidências: `app/src/pages/Dashboard.tsx`, `app/src/lib/curva.ts`, `server/app/Controllers/Api/V1/DashboardController.php`, `app/src/components/GraficoSemana.tsx`.

## Alternativas de organização

| Modelo | Como funciona | Limitação |
| --- | --- | --- |
| Automático | O sistema define todos os blocos e a pessoa executa | Exige boas estimativas e regras de recuperação; pode parecer rígido |
| Manual | A pessoa escolhe e organiza os estudos de cada dia | Transfere para ela a principal tarefa que o Studia promete resolver |
| Sugerido e editável, recomendado | O sistema propõe um plano que cabe no tempo; a pessoa pode trocar, reordenar ou adiar | Precisa explicar por que os itens foram escolhidos e manter os ajustes coerentes |

Não recomendo começar por um editor complexo de calendário ou por arrastar todo o edital para um quadro. Primeiro é necessário ter uma proposta diária confiável.

## Fluxo proposto para validação

1. **Importar e revisar:** confirmar edital, cargo e estrutura do conteúdo. Permitir dividir tópicos excessivamente amplos.
2. **Definir rotina:** disponibilidade por dia e duração preferida dos blocos. Metas e avaliações detalhadas podem ser ajustadas depois.
3. **Ver uma prévia:** apresentar blocos de estudo que cabem no dia, incluindo pausas quando fizerem parte da rotina. Explicar a prioridade de cada um e permitir ajustes.
4. **Estudar hoje:** destacar uma próxima ação e uma lista curta de blocos. Manter o conteúdo fora do plano em uma lista separada e recolhida.
5. **Registrar e continuar:** confirmar tempo e resultado, indicar se o primeiro estudo terminou ou precisa continuar, atualizar o plano e informar a próxima revisão.
6. **Encerrar ou reorganizar:** informar quando o plano terminou; permitir estudo extra e propor redistribuição quando algo não couber.

Exemplo ilustrativo para 2 horas: quatro blocos de 25 minutos, com três pausas de 5 minutos, totalizando 115 minutos. Um assunto pode ocupar dois blocos. O sistema deveria comunicar “quatro blocos planejados para hoje” e mostrar separadamente os outros tópicos do edital. Esse exemplo é uma hipótese de interação, não uma regra fixa de duração nem uma promessa de concluir um assunto em 25 minutos.

Uma explicação de prioridade pode ser curta e objetiva: “Revisão vencida ontem” ou “Próximo tópico de Português, dentro do tempo reservado à matéria”.

## Ordem recomendada de trabalho

1. **Confiabilidade:** unificar data de revisão, confirmar gravações antes de mostrar sucesso e corrigir a associação das sessões às matérias.
2. **Planejamento mínimo:** distinguir conteúdo disponível de plano diário, limitar pelo tempo, acompanhar o realizado e definir continuação do assunto.
3. **Fluxo de uso:** conectar cronômetro ao registro, oferecer ajustes simples ao plano e deixar explícito quando o dia terminou.
4. **Apresentação:** simplificar a mesa e organizar planejamento, calendário, quadro de revisões e progresso em acessos claros.
5. **Refinamento:** avaliar estimativas, recuperação de atrasos, diversidade de matérias e critérios de desempenho com uso real.

Antes da implementação estrutural, validar um protótipo com pelo menos estes cenários: primeiro acesso com edital extenso, dia com pouco tempo, dia sem disponibilidade, assunto que exige vários blocos, retorno após dias sem estudar e falha ao salvar uma sessão.

## Decisões pendentes

- Adotar o modelo sugerido e editável ou preferir planejamento predominantemente manual?
- Quais ajustes devem ser permitidos inicialmente: trocar, reordenar, adiar e alterar duração?
- Como equilibrar recuperação de revisões e avanço em conteúdo novo quando a demanda exceder a capacidade?
- O que conclui o primeiro estudo de um tópico e quais registros devem disparar revisão?
- Qual conjunto de resultados deve orientar a revisão: última sessão ou uma janela recente de questões?

Essas decisões devem ser tomadas antes de alterar a regra de negócio. Nenhuma mudança de comportamento foi aplicada durante esta análise.
