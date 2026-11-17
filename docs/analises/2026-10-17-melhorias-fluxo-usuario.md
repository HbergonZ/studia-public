# Melhorias do fluxo do usuário

Data da análise: 17/10/2026. Atualização de implementação: 18/10/2026. Estado: melhorias autorizadas e implementadas; ver resultados de validação abaixo.

Esta análise considera a interface Agenda, o plano diário salvo e as unidades de estudo. O diagnóstico original foi preservado abaixo como referência dos problemas encontrados. Após autorização do responsável pelo produto, as melhorias M01 a M27 foram implementadas conforme a [ADR 0008](../adr/0008-confiabilidade-fluxo-estudo.md). As evidências da entrega estão em [Validação da implementação](2026-10-18-validacao-melhorias.md).

## Situação da implementação

| Itens | Resultado implementado |
| --- | --- |
| M01 a M03 | Consistência da Agenda, recuperação em rota desconhecida ou falha de página e título longo com rolagem na sessão de foco. |
| M04 e M05 | Biblioteca com busca sem acentos, filtros e 30 unidades por página; cadastro manual disponível no primeiro acesso. |
| M06 | Retomada do mesmo edital, identificação de processamento e chave de idempotência para evitar duplicação após perda de resposta. |
| M07 a M09 | Distinção entre sugestão e plano salvo, ação “Retirar do dia”, explicação das prioridades e aviso de revisões atrasadas. |
| M10 e M11 | Registro também em conteúdo concluído; histórico recente primeiro e paginado; correção com motivo, auditoria e recálculo transacional. |
| M12 e M13 | Acerto semanal calculado pelo total de questões; padrão do cargo separado do peso pessoal, com restauração do padrão. |
| M14 e M15 | Histórico da origem preservado e consultável; consultas em lote, páginas carregadas sob demanda e listas limitadas. |
| M16 e M17 | Foco inicial, contenção e devolução nos modais; fundo inerte; abas móveis identificadas e alvos ampliados. |
| M18 | Cronômetro com checkpoint local por conta, edital e bloco; recuperação pausada ou descarte explícito. |
| M19 e M20 | Edições de texto confirmadas ao sair do campo, fila de gravação e retry; autenticação expirada recuperável com rascunho preservado. |
| M21 e M22 | Rotina em rascunho separado até salvar; dia definido pelo fuso do perfil e preservado durante a sessão iniciada. |
| M23 e M24 | Validação dos limites no servidor, configuração atômica, CSRF uniforme, respostas privadas sem cache e limitação de tentativas de login. |
| M25 | Redefinição administrada de acesso de usuários comuns, senha temporária e revogação das sessões anteriores. |
| M26 e M27 | Remoção de conteúdo vinculado bloqueada no servidor; reextração de edital preenchido proibida, inclusive antes de chamar o provedor. |

Todos os itens foram implementados. As limitações de validação e de operação estão registradas no documento de evidências. A autorização posterior para apagar históricos de teste não exigiu remover registros do usuário.

## Diagnóstico original de 17/10

## Leitura e prioridades

O caminho principal já está conectado: entrar, importar ou cadastrar edital, escolher cargos, conferir conteúdo, definir rotina, receber um plano, estudar, registrar e acompanhar revisões. Os maiores riscos atuais estão na preservação do histórico, na recuperação do tempo ainda não registrado e na confiabilidade das edições.

Os itens estão apresentados dos ajustes mais simples aos riscos críticos. A ordem recomendada de execução aparece ao final e começa pela preservação dos dados.

| Prioridade | Significado | Quantidade |
| --- | --- | ---: |
| P3, acabamento | Consistência visual ou textual, sem bloqueio do estudo | 1 |
| P2, melhoria funcional | Dificuldade com alternativa disponível ou comportamento que precisa ser esclarecido | 14 |
| P1, alta | Risco de perder trabalho, orientar o estudo incorretamente ou impedir acesso por teclado e tecnologia assistiva | 10 |
| P0, crítica | Caminho existente capaz de apagar histórico sem uma proteção adequada | 2 |
| Total | Pendências propostas | 27 |

Esforço é uma estimativa relativa: pequeno, médio ou grande. Não é prazo. “Confirmado no código” descreve um caminho verificável na implementação; “reproduzido” significa execução nesta auditoria com dados temporários. Uma recomendação de produto não equivale a um defeito comprovado.

O diagnóstico usou os estados **pendente de análise → aprovado → em implementação → verificado → concluído**. A tabela de implementação acima substitui o estado inicial de pendência; os textos seguintes descrevem a situação encontrada na auditoria original.

## Escopo, método e limites

Foram examinados as rotas da aplicação, autenticação e troca obrigatória de senha, contexto de estudo, importação manual e por API, validação de conteúdo, seleção de cargos, organização de unidades, disponibilidade, metas, sugestões e persistência do plano diário, cronômetro, registro, cálculo de revisões, calendários, tópicos, progresso e administração de contas. A leitura incluiu componentes, cliente HTTP, controladores, serviços, filtros e relacionamentos do banco.

Foi usada a skill Impeccable para a avaliação técnica da interface. O teste em Edge com conta temporária percorreu Hoje, Planejamento, Progresso, Tópicos, Editais, Enviar edital e Configurar. Conferiu o card em 1440, 390 e 320 px; as outras seis rotas foram percorridas em 390 px. Reproduziu a saída do foco de um modal, os nomes ausentes nas abas móveis, a exclusão de uma sessão ao remover seu tópico, uma conclusão sem tempo nem questões e a página vazia em URL desconhecida. Nenhuma exceção JavaScript ocorreu nesse percurso.

Os dados de teste foram separados dos registros pessoais. Não foram contratados serviços de IA nem enviadas mensagens. Não foram executados teste de invasão, teste de carga, restauração de backup, pesquisa com usuários, leitor de tela real, gestos em aparelho físico ou execução completa de todos os testes antigos. A importação automática e os cenários concorrentes foram avaliados por código, sem acionar provedores externos. Os testes anteriores do projeto são evidência complementar, não uma nova execução nesta auditoria.

Artefatos locais da verificação, quando disponíveis: `server/writable/testing/audit-flow-browser.mjs`, `server/writable/testing/layout-qa/weekly-card-*.png` e `server/writable/testing/layout-qa/audit-settings-mobile.png`. São arquivos de trabalho ignorados pelo Git; os resultados relevantes estão registrados neste documento para não depender deles.

### Avaliação técnica da interface

| Dimensão | Nota provisória, de 0 a 4 | Evidência principal |
| --- | ---: | --- |
| Acessibilidade | 1 | Foco escapa de modais; quatro abas móveis sem nome acessível. Há labels, regiões e navegação por teclado em outras áreas. |
| Desempenho | 2 | Dashboard faz consultas por tópico e carrega o histórico inteiro; ainda falta medição com contas grandes. |
| Temas e tokens | 3 | Agenda tem tokens e fonte local; permanecem estilos e cores de uma interface anterior. Modo escuro não foi tratado como requisito. |
| Responsividade | 2 | Rotas percorridas sem transbordamento em 390 px; texto extenso pode afastar controles e há alvos pequenos. Toque real e zoom de 200% não foram certificados. |
| Integridade da implementação visual | 3 | Identidade Agenda reconhecível, mas componentes antigos ainda usam tratamentos diferentes. |
| Total | **11/20** | Avaliação parcial da qualidade técnica, sem equivaler a certificação WCAG ou nota de confiabilidade do backend. |

**Integridade visual: aprovada quanto à coerência geral da Agenda, com pendências.** O detector de código retornou um aviso em `app/src/styles/mesa.css:72`, uma borda lateral de 3 px. Esse aviso isolado não comprova impacto funcional nem justifica um redesenho. Foi classificado como sinal de revisão visual em M01, sem elevar sua severidade. A varredura específica da alteração do card não retornou avisos. Resultado integral local: `.impeccable/user-flow-audit-detector.json`.

## Mapa do fluxo atual

| Etapa | Comportamento existente | Principal ponto de atenção |
| --- | --- | --- |
| Acesso | Conta fornecida pelo administrador; troca obrigatória da senha temporária | Recuperar acesso e lidar com sessão expirada |
| Entrada de conteúdo | Prompt e resposta JSON, PDF por API ou cadastro manual | Retomar falhas sem criar outro rascunho; expor o caminho manual |
| Conferência | Cargo filtra conhecimentos gerais e específicos; matérias e tópicos editáveis | Salvar edições com confirmação e preservar histórico nas remoções |
| Organização | Prévia das unidades e validação de cobertura do texto recebido | Manter histórico da origem consultável; não confundir cobertura do JSON com completude do edital |
| Rotina | Disponibilidade, blocos, pausas, metas, dificuldade e importância | Distinguir rascunho de dados salvos e respeitar pesos do cargo |
| Planejamento | Sugestão limitada por capacidade; salvar, ajustar, reordenar e adiar | Explicar sugestão versus compromisso e o destino dos adiamentos |
| Estudo | Bloco selecionado, cronômetro e modo de foco | Recuperar tempo; impedir que texto extenso afaste os controles |
| Registro | Tempo, questões, dificuldade, continuar ou concluir; confirmação pelo servidor | Corrigir registros e permitir novo estudo de assuntos já concluídos |
| Retorno | Revisões, atividade, metas e progresso | Alertas de atraso, datas consistentes e indicadores claros |
| Administração | Criar conta com senha temporária e mensagem para copiar | Redefinir acesso sem depender da mensagem original |

## Ajustes simples e melhorias funcionais

### M01 · P3 · Concluir a consistência visual e textual

**Tipo:** melhoria de interface. **Esforço:** pequeno. **Categoria:** temas e integridade visual.

**Evidência:** `UploadEdital.tsx` ainda utiliza emoji como ícone e ilustração de carregamento com cores próprias; `VisaoGeral.tsx` mantém o texto auxiliar “Progresso do edital” acima de “Tópicos”; `CronogramaSecao.tsx` e `GraficoSemana.tsx` ainda têm tratamentos antigos. O detector sinalizou a borda lateral em `styles/mesa.css:72`.

**Impacto:** transições entre páginas parecem pertencer a interfaces diferentes. É acabamento, sem motivo para atrasar correções de dados.

**Proposta e aceite:** alinhar ícones, títulos e superfícies ao `DESIGN.md`, preservando a identidade aprovada. Comparar as rotas com dados reais em desktop e celular, incluindo loading, vazio e erro. Não refazer o layout inteiro por causa do aviso do detector. Comando útil: `$impeccable polish`.

### M02 · P2 · Tratar rotas desconhecidas e oferecer recuperação

**Tipo:** defeito reproduzido. **Esforço:** pequeno. **Categoria:** navegação.

**Evidência:** `app/src/App.tsx` não possui rota `*`. Ao acessar `/missing-page-audit`, o texto de `document.body` ficou vazio.

**Impacto:** link antigo, erro de digitação ou caminho incompleto leva a uma tela sem orientação.

**Proposta e aceite:** criar uma página de endereço não encontrado com ações para Hoje e Editais. Preservar o tratamento de acesso protegido. Testar URL inexistente, edital inexistente e link válido aberto diretamente. A rota inexistente deve sempre mostrar uma saída compreensível.

### M03 · P2 · Conter títulos extensos na sessão de foco

**Tipo:** problema visual reproduzido com conteúdo de estresse. **Esforço:** pequeno a médio. **Categoria:** responsividade.

**Evidência:** `SessaoFoco.tsx` imprime o nome inteiro em `h2`, sem limite de altura. Com um tópico de cerca de 2 mil caracteres cadastrado manualmente, o card cresce por várias telas e afasta “Iniciar sessão” e “Registrar estudo”. O conteúdo original já possui rolagem própria; o título não.

**Impacto:** o plano ficou estável em 640 px, mas a área de estudo ainda pode dominar a página, especialmente no celular.

**Proposta e aceite:** manter o conteúdo completo disponível em uma região interna acessível e preservar os controles em uma área previsível. Validar títulos curtos, 180 caracteres e conteúdo legado muito maior, em 320 px e com texto ampliado. Não cortar silenciosamente a informação. Comandos úteis: `$impeccable layout` e `$impeccable adapt`.

### M04 · P2 · Facilitar a consulta a editais grandes

**Tipo:** melhoria de uso. **Esforço:** médio. **Categoria:** localização de conteúdo.

**Evidência:** `VisaoGeral.tsx` busca apenas pelo nome do tópico, sem normalizar acentos nem pesquisar a matéria; filtros são Todos, Pendentes e Concluídos. A seleção de cargos em `RevisarExtracao.tsx` já normaliza acentos. O seletor de assunto do plano é um `select` com todas as unidades.

**Impacto:** localizar uma unidade específica fica trabalhoso em programas extensos e cargos com disciplinas semelhantes.

**Proposta e aceite:** busca consistente por matéria e unidade, filtros de em andamento e revisões vencidas, contagem dos resultados e estado sem resultados. Seguir o padrão aprovado de card estável com lista rolável e título visível onde houver listas longas. Para o seletor do plano, avaliar busca antes de introduzir outro componente. Testar termos com e sem acento e mais de mil unidades.

### M05 · P2 · Tornar o cadastro manual encontrável no primeiro acesso

**Tipo:** melhoria de onboarding. **Esforço:** pequeno. **Categoria:** primeira utilização.

**Evidência:** a home sem matérias oferece “Escolher edital”; em Editais, o acesso principal é “Importar edital”. O cadastro manual fica no final de `UploadEdital.tsx`. Na revisão vazia, o texto manda adicionar a matéria “acima”, mas o formulário está dentro de “Ajustar dados do edital”, abaixo.

**Impacto:** quem quer montar o próprio plano pode concluir que precisa de PDF ou IA, ou não encontrar como adicionar a primeira matéria.

**Proposta e aceite:** expor importar e cadastrar manualmente como caminhos claros, corrigir a orientação da revisão vazia e apresentar a próxima ação após cada etapa. Verificar conta sem edital, rascunho sem matéria e edital com cargos ainda não selecionados. Não obrigar a configurar todos os tópicos para começar. Comando útil: `$impeccable onboard`.

### M06 · P2 · Retomar importações e organizar a recuperação de falhas

**Tipo:** lacuna confirmada no código. **Esforço:** médio; grande se houver processamento assíncrono. **Categoria:** importação e erros.

**Evidência:** `iniciarProcessamento` e `importarRespostaIa` criam o edital antes de enviar a análise. Se a segunda operação falha, o usuário permanece na entrada sem receber o ID criado. A lista exibe falha ou rascunho, mas não oferece retomar a mesma importação. PDF usa uma requisição longa; `RevisarExtracao.tsx` mostra o estado de processamento sem consultar novamente seu progresso.

**Impacto:** repetir a tentativa pode criar rascunhos extras. Uma interrupção deixa a pessoa sem saber se deve aguardar ou reenviar.

**Proposta e aceite:** conservar ID e entrada, mostrar motivo e ação de retomada, evitar duplicação por retry e identificar processamento interrompido. Mostrar limite de 15 MB e ausência de API antes de iniciar PDF. Decidir entre requisição síncrona com recuperação e tarefa em segundo plano antes de uma mudança estrutural. Testar JSON inválido, PDF acima do limite, timeout e recarga durante processamento. Não chamar provedores pagos nos testes.

### M07 · P2 · Explicar quando o plano é sugestão e o que significa adiar

**Tipo:** melhoria de produto. **Esforço:** pequeno a médio. **Categoria:** planejamento.

**Evidência:** `DailyStudyData::present` gera uma sugestão quando não há plano salvo; `PlanoDiario.tsx` oferece “Usar este plano”, e iniciar a sessão também salva a sugestão. `Adiar` muda o status para `deferred`, sem escolher uma nova data. Planos futuros salvos excluem trabalho já reservado em dias anteriores.

**Impacto:** a pessoa pode interpretar uma prévia como compromisso já salvo, ou acreditar que adiar transferiu o bloco para amanhã.

**Proposta e aceite:** sinalizar “sugestão” e “salvo”, confirmar o efeito de adiar e explicar a diferença entre retirar do dia e agendar em outra data. Se for aprovado transferir, tratar origem e destino juntos e respeitar capacidade. Testar recarga antes e depois de salvar, adiamento, restauração e dois dias futuros. Não criar automaticamente compromisso para amanhã sem decisão de produto.

### M08 · P2 · Alinhar a explicação das prioridades à regra executada

**Tipo:** divergência confirmada. **Esforço:** pequeno para clareza; médio se mudar a regra. **Categoria:** planejamento e revisões.

**Evidência:** `DailyPlanner::suggest` alterna até duas revisões com um conteúdo novo quando ambos existem. O quadro em `CronogramaSecao.tsx` explica uma sequência estrita: atrasadas, hoje e depois conteúdo novo. A ordenação do quadro também não equivale à seleção diária por tempo e equilíbrio entre matérias.

**Impacto:** um conteúdo novo no plano pode parecer um erro quando ainda existem revisões atrasadas.

**Proposta e aceite:** explicar que o quadro mostra o estoque e o plano seleciona uma parte, inclusive a política atual de equilíbrio. Validar com o responsável se a proporção deve permanecer. Cobrir vários atrasos, conteúdo novo e dias curtos; a justificativa exibida deve corresponder à decisão real do planejador.

### M09 · P2 · Mostrar atrasos na continuidade da home

**Tipo:** lacuna confirmada. **Esforço:** pequeno. **Categoria:** retorno ao estudo.

**Evidência:** `ContinuidadeEstudo.tsx` filtra “Próximas revisões” por data maior ou igual a hoje. Se só houver revisões vencidas, essa coluna fica vazia e orienta concluir uma unidade para programar revisão, apesar de já existirem revisões. O plano inclui apenas o que cabe na capacidade.

**Impacto:** quem retorna depois de alguns dias pode não perceber o tamanho do atraso nem a necessidade de reorganizar o restante.

**Proposta e aceite:** resumo separado de revisões vencidas, com número e acesso ao planejamento; corrigir o texto vazio conforme o estado real. Não apresentar todas como obrigação para o mesmo dia. Testar somente atrasadas, somente futuras, mistura e dia sem disponibilidade.

### M10 · P2 · Permitir novo registro a partir de um assunto concluído

**Tipo:** limitação confirmada. **Esforço:** pequeno a médio. **Categoria:** registro.

**Evidência:** `VisaoGeral.tsx` troca o botão “Registrar estudo” por “Primeiro estudo concluído” quando há `ultimaRevisao`. O modal de detalhes não oferece uma nova sessão. Há alternativas no plano e no quadro, mas não naquele ponto de consulta.

**Impacto:** revisar antecipadamente ou estudar novamente exige procurar outra tela.

**Proposta e aceite:** manter a indicação de cobertura e oferecer novo registro nos detalhes, com ação distinguível de concluir o assunto. Testar primeiro estudo, continuação, revisão antecipada e revisão vencida. O novo registro deve manter o histórico anterior e recalcular revisão apenas conforme a conclusão escolhida.

### M11 · P2 · Corrigir a leitura do histórico e definir a política de correção

**Tipo:** mistura de divergência técnica e decisão de produto. **Esforço:** médio. **Categoria:** histórico e datas.

**Evidência:** `VisaoGeral.tsx` chama a primeira sessão de “1º estudo”, ainda que seja uma continuação sem conclusão; ordena apenas por data. `formatarData` usa `new Date(iso)`, enquanto as datas de calendário têm tratamento próprio em `lib/datas.ts`. Para `YYYY-MM-DD`, interpretar como instante UTC pode exibir o dia anterior em fusos brasileiros. Não há endpoints de editar ou desfazer sessão nas rotas atuais. O teste também confirmou que uma conclusão com zero minutos e zero questões é aceita pelo servidor.

**Impacto:** histórico pode misturar primeiro contato com primeira conclusão; erro de digitação em tempo ou questões não tem correção pela interface.

**Proposta e aceite:** distinguir sessões de continuação e conclusão, ordenar também por identificador quando a data coincide e formatar dias sem conversão UTC. Decidir se conclusão sem atividade deve ser permitida e explicada. Antes de permitir editar/excluir registro, definir recálculo de curva, capacidade e blocos concluídos. Testar registro retroativo e correção sem apagar as sessões posteriores.

### M12 · P2 · Esclarecer e corrigir o desempenho agregado da semana

**Tipo:** ambiguidade numérica confirmada. **Esforço:** pequeno. **Categoria:** progresso.

**Evidência:** `GraficoSemana.tsx:90` calcula a média simples dos percentuais dos dias com questões. Exemplo: 1/1 em um dia e 0/100 em outro gera 50%; o total de acertos dividido pelo total de questões é aproximadamente 1%.

**Impacto:** o texto “desempenho médio” pode sugerir uma taxa global diferente da apresentada em outros indicadores.

**Proposta e aceite:** usar taxa global ponderada por questões ou rotular explicitamente “média dos percentuais diários”, conforme decisão de produto. Mostrar a amostra. Testar dias com quantidades muito diferentes e dias sem questões. Não exibir desempenho zero como equivalente à ausência de dados.

### M13 · P2 · Explicar o peso do cargo e o peso ajustado pelo usuário

**Tipo:** inconsistência confirmada no código. **Esforço:** médio. **Categoria:** configuração e prioridade.

**Evidência:** `DashboardController` e `DailyStudyData` preferem o maior peso não nulo dos vínculos dos cargos selecionados. A edição em `atualizarPesoMateria` grava `subjects.weight`. Quando há peso no vínculo, a tela pode aceitar a edição local, mas a próxima carga volta a exibir o peso do cargo e o planejador continua usando esse valor. A revisão admite até 100; o slider de Configurar vai até 10.

**Impacto:** a pessoa pode acreditar que alterou a prioridade, sem que sua preferência tenha efeito persistente.

**Proposta e aceite:** decidir se peso do edital e preferência pessoal são campos distintos ou se o usuário pode sobrescrever o peso efetivo. Informar a origem e unificar a escala. Testar cargo com peso explícito, peso ausente, múltiplos cargos e recarga. A prioridade usada pelo servidor deve corresponder ao valor comunicado.

### M14 · P2 · Dar acesso ao histórico da origem após dividir unidades

**Tipo:** limitação confirmada, sem evidência de exclusão. **Esforço:** médio. **Categoria:** organização e progresso.

**Evidência:** `StudyUnitsController::apply` preserva sessões na origem, transforma-a em `is_source` e cria unidades novas. `DashboardController` exclui origens da lista de tópicos, mas mantém suas sessões nos totais da matéria. `OrganizarEstudos` informa a quantidade de registros anteriores, sem detalhá-los.

**Impacto:** o tempo continua nos totais, mas o usuário pode não conseguir localizar os registros nos detalhes das novas unidades. A cobertura começa do zero, como a tela já avisa, e precisa ser compreensível depois da operação.

**Proposta e aceite:** oferecer histórico da origem junto das unidades, sem repartir artificialmente minutos ou questões. Mostrar o que foi preservado e o que começa com progresso próprio. Testar origem com sessões e plano salvo antes da divisão; os totais devem permanecer iguais e cada registro antigo deve continuar consultável.

### M15 · P2 · Medir e reduzir o custo de contas grandes

**Tipo:** risco de escala confirmado por estrutura de código; lentidão não medida. **Esforço:** médio. **Categoria:** desempenho.

**Evidência:** `DashboardController` busca vínculos por matéria e soma questões em uma consulta por tópico. Carrega todas as sessões do edital; o contexto completo é recarregado após registro e seleção de cargo. `VisaoGeral` renderiza todos os resultados e o plano devolve o catálogo de unidades junto da resposta diária. O build atual gerou JS de cerca de 401 kB, 119 kB gzip, sem divisão de rotas em `App.tsx`.

**Impacto:** número de consultas, volume transferido e renderização crescem com o uso e podem piorar o primeiro acesso e o retorno após salvar.

**Proposta e aceite:** medir tempo de resposta, consultas e tamanho de payload com 100, 1.000 e 5.000 unidades e histórico extenso. Priorizar agregações em lote, separar consultas necessárias por tela e paginar histórico. Avaliar divisão de bundle só após medição. Definir orçamento de desempenho com o responsável; não introduzir cache que deixe revisões ou sessões desatualizadas. Comando útil: `$impeccable optimize`.

## Melhorias de alta prioridade

### M16 · P1 · Completar a gestão de foco dos modais

**Tipo:** defeito reproduzido. **Esforço:** médio. **Categoria:** acessibilidade.

**Evidência:** `Modal.tsx` bloqueia a rolagem, trata Escape e declara `aria-modal`, mas não transfere foco, não o contém e não o devolve. No teste do modal Renomear, o foco inicial estava fora; ao usar Tab, alcançou elementos de fundo.

**Impacto:** usuários de teclado e leitores de tela podem interagir com uma tela que aparenta estar bloqueada. Referências de aceite: WCAG 2.1.1, 2.4.3 e comportamento esperado de diálogo modal.

**Proposta e aceite:** definir foco inicial adequado, conter Tab/Shift+Tab, tornar fundo inerte e restaurar foco no acionador. Verificar todos os modais, inclusive erro e envio em andamento. Preservar rodapé fixo e rolagem interna já aprovados. Testar Escape sem descartar gravação ativa e leitura do título. Comando útil: `$impeccable harden`.

### M17 · P1 · Identificar controles móveis e ampliar alvos pequenos

**Tipo:** defeito reproduzido nas abas; outros alvos confirmados no código. **Esforço:** pequeno a médio. **Categoria:** acessibilidade e responsividade.

**Evidência:** em 390 px, os quatro botões de abas de `Configuracao.tsx` ocultam o texto com `hidden sm:inline` e não possuem `aria-label`; os SVGs não fornecem nome. A inspeção encontrou texto visível vazio nas quatro abas. Os botões +/− de disponibilidade têm 26×26 px. A busca e alguns campos editáveis de `RevisarExtracao` dependem de placeholder ou contexto visual, sem label próprio.

**Impacto:** a pessoa não sabe qual seção abrir e controles ficam difíceis de acionar. Nome acessível: WCAG 4.1.2; labels: 3.3.2. Adotar 44 px como alvo de projeto para toque, sem confundir isso com o mínimo de 24 px da WCAG 2.2 AA.

**Proposta e aceite:** nomes acessíveis, identificação visual das abas no celular, estado selecionado e labels para os campos. Testar teclado, árvore de acessibilidade, zoom de 200% e toque em dispositivo real, sem depender exclusivamente de viewport emulado. Comandos úteis: `$impeccable adapt` e `$impeccable harden`.

### M18 · P1 · Recuperar o estudo ainda não registrado

**Tipo:** risco confirmado no código; caminhos de navegação precisam de teste dedicado. **Esforço:** médio a grande. **Categoria:** continuidade e preservação de trabalho.

**Evidência:** `usePomodoro` mantém tudo em estado React local, sem checkpoint. `Dashboard.tsx:46` protege `beforeunload` e cliques em links, mas não usa bloqueio de transição do roteador para o botão Voltar do navegador. O efeito que depende de ID e duração do bloco reinicia o tempo quando o bloco muda. “Reiniciar tempo” também apaga segundos estudados sem confirmação.

**Impacto:** fechamento do aplicativo, travamento, navegação pelo histórico ou atualização do bloco pode descartar uma sessão ainda não registrada. No celular, `beforeunload` não é uma estratégia suficiente de recuperação.

**Proposta e aceite:** guardar um rascunho por usuário, edital e bloco, com checkpoint e opção explícita de recuperar ou descartar. Impedir mistura entre contas e duplicação de registro. Comparar armazenamento local mínimo e rascunho no servidor antes de escolher. Testar pausa, recarga, Voltar, troca de conta, encerramento do navegador e bloco modificado em outra aba. Não gravar sessão concluída automaticamente.

### M19 · P1 · Garantir que edições sejam salvas na ordem correta e avisar falhas

**Tipo:** falha de tratamento confirmada; corrida identificada no código. **Esforço:** médio. **Categoria:** confiabilidade.

**Evidência:** `EstudoContext.tsx:126–133` atualiza nomes, dificuldade e peso localmente e dispara requisições sem aguardar. A falha de vários desses caminhos apenas recarrega os dados, sem avisar que a edição foi rejeitada. `RevisarExtracao` envia mudança de nome a cada tecla; o slider também envia a cada valor. Não há versão nem fila para preservar a ordem das respostas.

**Impacto:** o texto pode voltar ao valor anterior sem explicação. Em rede lenta, uma requisição antiga pode persistir depois de uma nova. Confirmar o edital enquanto ainda há edições pendentes também pode validar uma estrutura diferente da vista.

**Proposta e aceite:** estado explícito de rascunho/salvando/salvo/erro, envio por confirmação ou debounce com serialização/versionamento e recuperação que preserve o texto digitado. Ativação deve aguardar mutações pendentes. Simular respostas fora de ordem, perda de rede, validação rejeitada e clique repetido. Aceite: a última edição confirmada prevalece após recarga.

### M20 · P1 · Recuperar autenticação expirada sem confundir com ausência de edital

**Tipo:** lacuna confirmada. **Esforço:** médio. **Categoria:** autenticação e erros.

**Evidência:** `lib/api.ts` tem evento para troca obrigatória de senha, mas não tem tratamento global de 401. `AuthContext` trata o 401 apenas na restauração inicial; falhas de rede nessa restauração vão para o console. `EstudoContext::carregar` limpa edital e matérias em qualquer erro. `Dashboard` então pode mostrar a orientação de primeiro acesso junto do erro.

**Impacto:** sessão vencida deixa a interface aparentando estar autenticada, enquanto ações falham; indisponibilidade temporária pode parecer perda de conteúdo. Entrar pela rota `/entrar` também redireciona sempre à home, sem preservar destino nessa página.

**Proposta e aceite:** diferenciar sem sessão, serviço indisponível e conta sem edital. Oferecer nova autenticação ou retry, preservar rascunhos e destino válido e descartar dados de conta anterior ao trocar usuário. Testar 401 em leitura e gravação, 500, offline e expiração durante cronômetro/registro. Não enviar novamente uma gravação de forma automática sem sua chave de idempotência.

### M21 · P1 · Separar a rotina em edição da rotina persistida

**Tipo:** inconsistência confirmada. **Esforço:** médio. **Categoria:** configuração.

**Evidência:** `Configuracao` altera diretamente disponibilidade, metas e duração no contexto compartilhado. Só `salvarConfiguracao` persiste esses valores. Ao navegar sem salvar, a home pode considerar uma rotina definida pelo estado local enquanto o plano usa a disponibilidade anterior do banco. Dificuldade e peso, na mesma tela, têm persistência imediata.

**Impacto:** partes da interface passam a usar configurações diferentes e não há um contrato claro para “Salvar rotina”.

**Proposta e aceite:** escolher rascunho local com salvar/cancelar ou salvamento automático consistente. Não misturar os dois sem comunicar por campo. Avisar alterações pendentes ao sair, manter dados em falha e sincronizar o contexto após sucesso. Testar configurar a primeira rotina, sair sem salvar, falhar ao salvar e alterar disponibilidade de um dia com plano já salvo.

### M22 · P1 · Unificar data atual, fuso e virada do dia

**Tipo:** divergência confirmada no código. **Esforço:** médio. **Categoria:** agenda e revisão.

**Evidência:** `DailyStudyData::today` usa o fuso do perfil, padrão `America/Manaus`. O contexto recebe esse “hoje”, mas `montarCronograma`, `CalendarioSecao`, `GraficoSemana`, `MetasSecao` e `Layout` ainda usam relógio/fuso do navegador. Vários congelam a data no primeiro render com `useMemo([])`. O contexto não agenda atualização na meia-noite ou ao retornar à aba.

**Impacto:** ao viajar, usar outro fuso ou deixar a aplicação aberta durante a noite, hoje, metas, atraso e plano podem divergir. Não é o problema antigo do cálculo duplo da curva, que já foi corrigido.

**Proposta e aceite:** definir um dia de estudo canônico com o fuso do perfil e atualizar na virada/retorno à aba, preservando a data de uma sessão em andamento. Testar 23h59→00h01, mudança de semana e ano, e navegador em fuso diferente do perfil. O plano, os indicadores e a validação do servidor devem concordar.

### M23 · P1 · Validar o catálogo e salvar configuração de forma atômica

**Tipo:** lacunas confirmadas no código; erros de banco não foram provocados nesta auditoria. **Esforço:** médio. **Categoria:** integridade dos dados.

**Evidência:** `CatalogController::updateSubject/updateTopic` encaminha campos permitidos ao modelo sem verificar formato, tamanho ou limites como nos endpoints novos de plano e sessão. `ConfigurationController::save` valida bloco/pausa, mas converte metas diretamente e aceita timezone sem validar; grava perfil e dias sem transação. Restrições do banco não substituem mensagens de validação nem uma operação atômica.

**Impacto:** entrada inválida pode virar erro genérico, e falha no meio da configuração pode deixar parte dos dias salva. Fuso inválido pode afetar chamadas posteriores que constroem `DateTimeZone`.

**Proposta e aceite:** validar tipos, limites e campos aceitos antes de gravar; validar identificador de fuso; retornar 4xx compreensível; usar transação no conjunto da configuração. Cobrir arrays em campos escalares, nomes vazios/longos, metas negativas, dificuldade fora da faixa, JSON inválido e falha simulada na gravação de um dos dias. Falha deve preservar o estado anterior completo.

### M24 · P1 · Uniformizar a proteção das operações autenticadas

**Tipo:** lacuna de proteção confirmada; exploração entre sites não testada. **Esforço:** médio. **Categoria:** segurança da conta.

**Evidência:** `Config/Filters.php` deixa o CSRF global desativado. `Config/Routes.php` aplica `api-csrf` em sessões, planos, organização e criação de usuários, mas não em várias mutações de editais, catálogo, configuração ou logout. O login personalizado também não declara limitação de tentativas nessa rota. Cookies SameSite e eventuais controles externos precisam ser considerados; a ausência do filtro não comprova, sozinha, exploração de uma origem externa.

**Impacto:** o nível de proteção varia conforme a operação, inclusive nas que podem remover conteúdo. A rota de login precisa de proteção contra tentativas abusivas compatível com o ambiente publicado.

**Proposta e aceite:** inventariar mutações e aplicar uma política uniforme, adaptando verificação a multipart em PDF. Verificar limitação de tentativas efetiva antes de adicionar outra camada. Testar token ausente/inválido, sessão válida, expiração, upload válido e isolamento entre dois usuários. Não testar abuso contra contas reais. Esta recomendação não afirma que houve invasão ou exposição de dados.

### M25 · P1 · Oferecer recuperação de acesso para contas administradas

**Tipo:** lacuna do fluxo da aplicação. **Esforço:** médio. **Categoria:** administração e acesso.

**Evidência:** `Usuarios.tsx` e `UsersController` oferecem listar e criar conta. A senha temporária só é exibida na mensagem de criação. A interface de login não oferece recuperação; a área administrativa não permite emitir nova credencial. O framework tem configuração de magic link, mas isso não comprova um fluxo de recuperação funcional no produto publicado nem envio de e-mail configurado.

**Impacto:** perder a mensagem inicial ou esquecer a senha pode exigir intervenção técnica no banco/servidor para voltar a estudar.

**Proposta e aceite:** decidir entre recuperação por e-mail e redefinição administrada, respeitando o modelo de acesso já escolhido. Se administrada, gerar nova credencial temporária, exigir troca e definir invalidação de sessões antigas; registrar a ação sem guardar senha em log. Testar conta ainda não ativada pelo primeiro login, conta em uso e tentativa por usuário sem permissão. Nunca enviar mensagens automaticamente sem autorização.

## Riscos críticos de preservação do histórico

### M26 · P0 · Remover matéria ou tópico apaga sessões sem confirmação

**Tipo:** defeito reproduzido e confirmado no esquema. **Esforço:** médio a grande. **Categoria:** perda de dados.

**Evidência:** `RevisarExtracao.tsx` chama `removerMateria` ou `removerTopico` diretamente no clique. `CatalogController::deleteSubject/deleteTopic` executa exclusão física. A migration `2026-08-30-000001_CreateStudiaTables.php` define cascata de matéria para tópicos e de tópico para `study_sessions`. Na conta temporária, um tópico com uma sessão de 7 minutos passou de **1 sessão para 0** após DELETE; a sessão também desapareceu do dashboard.

**Impacto:** um clique durante a organização pode apagar tempo, questões e registros anteriores. Planos com referências ao tópico ficam sem contexto de conteúdo. A recuperação não está disponível pela aplicação.

**Contenção proposta:** impedir exclusão física quando houver histórico, e explicar isso na interface, até definir a solução definitiva. Uma confirmação isolada reduz acidente, mas não preserva dados.

**Alternativas para decisão:** arquivar conteúdo e retirá-lo das sugestões mantendo sua identidade e histórico; ou permitir exclusão definitiva apenas em um fluxo separado, com impacto explícito e política de recuperação. Arquivamento tende a combinar melhor com a promessa atual de preservar estudos, mas exige decisão e migração revisada.

**Aceite:** remover conteúdo sem histórico funciona; remover/arquivar conteúdo estudado preserva sessões, totais e consulta histórica. Cobrir matéria inteira, tópico com unidades, bloco salvo e chamadas diretas à API. Mostrar exatamente o impacto antes da confirmação. Validar migração e restauração antes de publicar a mudança.

### M27 · P0 · A extração por API pode substituir conteúdo já estudado

**Tipo:** risco confirmado no caminho de código; não executado contra provedor externo. **Esforço:** médio. **Categoria:** perda de dados.

**Evidência:** `NoticesController::importResponse` impede importação se já existem matérias e orienta usar Organizar estudos. `NoticesController::extract`, acessível por `POST /api/v1/editais/{id}/extrair`, verifica propriedade, mas não possui a mesma proteção. Após uma análise bem-sucedida, chama `replaceStructure`, que exclui grupos e recria a estrutura. As cascatas do banco alcançam matérias, tópicos e sessões.

**Impacto:** uma chamada de reextração para um edital existente pode apagar histórico. A interface atual de upload cria outro edital, por isso o caminho crítico está na API e em futuras tentativas de reaproveitar o endpoint; não foi observado no clique normal de importar novo edital.

**Contenção proposta:** rejeitar reextração em edital com conteúdo/histórico, com orientação para organização ou importação como outro edital. A proteção deve estar no servidor, não depender da tela atual.

**Aceite:** simular o extrator com resposta válida e comprovar que reextração proibida não altera nenhum grupo, tópico, sessão ou plano. Confirmar que edital vazio continua importável. Se no futuro for desejada atualização de edital, desenhar comparação/versionamento com preservação de identidade antes de permitir substituição. Não reaproveitar `replaceStructure` como atualização destrutiva silenciosa.

## O que já funciona e deve ser preservado

- A conta é separada por usuário, e os controladores examinados verificam propriedade. Administração valida o grupo no servidor; não depende só de esconder menu.
- Registro de sessão aguarda resposta do servidor, mantém erro no modal e usa chave de idempotência. Plano e sessão usam transação e bloqueio por usuário; o plano também valida versão.
- A próxima revisão vem do servidor. O cliente não aplica novamente a transição de desempenho para apresentar a data. O achado antigo de cálculo duplo não entra como pendência atual.
- O plano diário limita a sugestão por minutos disponíveis e pausas; diferencia concluir assunto de continuar; distingue conteúdo inteiro do compromisso diário.
- A validação das unidades compara a concatenação dos trechos com a origem recebida. Isso verifica a preservação desse texto, sem certificar que a IA incluiu tudo do PDF. A prévia já orienta comparar com o documento original.
- Cargos filtram conteúdos gerais e específicos; a busca de cargos aceita variação de acentos. Organização mantém os registros antigos na origem.
- Home e Planejamento já têm card diário de altura fixa, contagem e rolagem interna. Modais já limitam altura pela viewport e mantêm ações no rodapé. Essas melhorias não devem ser refeitas nem removidas.
- “Seu ritmo na semana” agora está em card branco com raio de 14 px e espaçamento interno de 24 px, verificado em 1440, 390 e 320 px, sem rolagem horizontal e com os sete dias preservados.

## Verificações que ainda precisam de evidência operacional

Estas são tarefas de validação, não defeitos comprovados nem incidentes conhecidos:

| Verificação | Por que importa | Evidência necessária antes de concluir |
| --- | --- | --- |
| Backup e restauração | Falhas de disco e exclusões exigem recuperação fora da interface | Inventário de backups, periodicidade, retenção, cópia separada e restauração ensaiada em ambiente isolado. A documentação examinada não fornece um procedimento completo. |
| Dois dispositivos e duas abas | Sessão, seleção de cargo e ativação podem mudar simultaneamente | Testes concorrentes de ativar editais, editar catálogo, alterar disponibilidade e iniciar/registrar o mesmo bloco; verificar um único edital ativo e respostas de conflito compreensíveis. |
| Ambiguidade após falha de rede | Resposta pode se perder depois que a gravação ocorreu | Simular timeout após commit e repetir a mesma request key. A resposta repetida de `SessionsController` retorna ID, mas não todos os campos da primeira resposta, como próxima revisão; avaliar a mensagem final. |
| Contas e ambiente publicado | Configuração pode diferir dos valores padrão dos arquivos | Verificar cookies efetivos, expiração de sessão, proteção de login, cache de dados privados e separação entre contas sem imprimir segredos. |
| Importação com fornecedor indisponível | Prazo longo e resposta cortada são diferentes de JSON inválido | Mock de timeout, 429, corte de resposta e extração incompleta; cada caso precisa de recuperação e nenhum pode substituir estrutura existente. |
| Acessibilidade completa | Viewport e inspeção de DOM não substituem o uso real | Leitor de tela, teclado completo, contraste medido por estado, zoom e dispositivo com toque; revisar gráficos e tooltips que dependem de hover. |
| Observabilidade | É preciso localizar falhas sem expor dados | Identificador de erro correlacionado entre cliente/servidor, logs sem senha/token e acompanhamento de falhas de importação e gravação. |

## Ordem sugerida para implementação após revisão

1. **Preservar dados:** M26 e M27. Verificar backup/restauração em paralelo. Criar regressões que tentem os caminhos destrutivos em dados isolados.
2. **Confiar no que foi salvo:** M19, M23 e M21. Depois, recuperação de sessão/autenticação em M20 e proteção uniforme em M24.
3. **Preservar estudo em andamento:** M18 e M22. Definir rascunho recuperável e dia de estudo antes de ampliar automações.
4. **Garantir acesso e operação:** M16, M17 e M25. Recuperação de conta e teclado podem bloquear pessoas mesmo com a regra de estudo correta.
5. **Orientar o estudo corretamente:** M07 a M14, com decisões explícitas sobre pesos, adiamento, indicadores e correção de registros.
6. **Reduzir esforço para começar e consultar:** M02 a M06 e M15, usando medições de contas grandes para decidir otimizações.
7. **Acabamento final:** M01; executar `$impeccable polish` depois das correções aprovadas, sem substituir as verificações funcionais.

Para cada entrega aprovada: registrar a decisão, implementar apenas o escopo combinado, verificar o cenário original e os estados de erro/vazio, e atualizar este arquivo com a evidência. Executar nova auditoria após os blocos de correções para reavaliar a nota técnica.

## Decisões de produto a registrar antes das mudanças estruturais

| Decisão | Itens relacionados | Alternativas a avaliar |
| --- | --- | --- |
| Destino de conteúdo removido | M26, M27 | Arquivar preservando histórico; exclusão definitiva em fluxo separado |
| Recuperação de tempo | M18 | Rascunho local; rascunho no servidor; combinação mínima dos dois |
| Salvamento de configuração e catálogo | M19, M21 | Confirmação explícita; salvamento automático ordenado com feedback |
| Prioridade das matérias | M08, M13 | Peso do edital e preferência pessoal separados; sobrescrita explicada; política de equilíbrio entre revisão e novo |
| Correção de sessão | M11 | Retificação com trilha de alteração; edição com recálculo; anulação com motivo |
| Recuperação de conta | M25 | Redefinição administrada; recuperação por e-mail configurado |
| Significado dos indicadores | M11, M12, M14 | Primeiro contato versus primeira conclusão; taxa global versus média diária; cobertura após divisão |

Nenhuma dessas decisões foi presumida como requisito aprovado. O arquivo permite escolher itens individualmente, em grupos ou em outra ordem, mantendo os riscos de perda de dados visíveis durante a priorização.
