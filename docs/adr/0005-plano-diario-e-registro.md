# 0005. Plano diário sugerido e editável

## Decisão

Após a análise de 15/10/2026 e a autorização para executar as melhorias, adotamos o modelo sugerido e editável. O automático integral restringe ajustes pessoais; o manual integral transfere a organização ao estudante. Um plano diário persistido por usuário, edital e data fornece uma única lista para executar e consultar no calendário.

O servidor gera blocos usando a disponibilidade, desconta o estudo já registrado e reserva pausas entre blocos. Duração inicial de 25 minutos e pausa de 5 minutos são editáveis. Dias sem disponibilidade não recebem tarefas. O conteúdo ainda não iniciado permanece na biblioteca, sem uma obrigação de fazê-lo hoje. Revisões mantêm sua data de vencimento independentemente do adiamento de um bloco.

Ao sugerir dias futuros, não reservar automaticamente um assunto que já possui um bloco pendente em um plano anterior ainda vigente. Reservas anteriores contam na distribuição semanal de matérias. Quando um dia passa sem execução, seus assuntos voltam a ser elegíveis para a nova sugestão, respeitando a capacidade. O usuário ainda pode escolher repetir um assunto manualmente.

A sugestão prioriza revisões vencidas e de hoje, mas, havendo conteúdo novo ou continuação, intercala um desses blocos a cada dois de revisão. Dentro de cada grupo, alterna matérias considerando importância e minutos já estudados na semana. Trata-se de uma regra inicial explícita, não de um modelo de aprendizagem validado. O usuário pode trocar, reordenar, adiar e ajustar os blocos. O plano salvo não se reorganiza sozinho durante uma sessão.

Registrar um bloco pode significar continuar o assunto ou concluir o estudo/revisão. Continuar registra esforço e dificuldade, sem avançar a curva. Concluir recalcula uma única vez, no servidor, com o resultado da sessão. A dificuldade inicial é aplicada na primeira conclusão; mudar dificuldade depois não apaga o histórico nem reposiciona a curva automaticamente. Datas históricas não substituem uma conclusão mais recente.

O registro deve aguardar sucesso, aceitar uma chave de repetição para evitar duplicação em tentativas e manter o formulário quando falhar. Alterações do plano usam versão para detectar conflitos entre dispositivos. Sessões e blocos concluídos são preservados.

## Interface

Mantemos Manrope, a paleta azul e o destaque dourado da mesa. Textos principais de 16 px, secundários de pelo menos 14 px. A mesa mostra uma próxima ação e o plano de hoje; planejamento reúne semana, calendário e revisões; progresso reúne gráficos, metas e cobertura. Todos os recursos continuam acessíveis. O cronômetro sugere o tempo medido no registro e só grava após confirmação. Há um registro manual para estudos feitos fora dele.

## Validação

Testar geração com edital extenso, disponibilidade zero e curta, demanda de revisões acima da capacidade, continuação, datas anteriores, edição persistente, confirmação e repetição de registro, conflitos de versão e isolamento entre usuários. Verificar fluxo de uso e apresentação em desktop e celular antes de publicar.

Validação realizada: 75 testes unitários (275 asserções); integração HTTP de planos e sessões, incluindo autenticação, CSRF, versões, propriedade dos assuntos, repetição de solicitações e entradas históricas; regressão do cadastro administrativo e troca obrigatória de senha; fluxo no navegador com falha simulada de gravação, persistência de ajustes, reservas futuras e encerramento do cronômetro com registro; sete páginas em larguras de 1440, 390 e 320 pixels, sem erros de JavaScript nem rolagem horizontal da página. Os dados usados nesses testes pertencem exclusivamente às contas temporárias da fixture.

## Migração

Mudanças aditivas. Sessões anteriores continuam sendo conclusões. Datas já gravadas de próximas revisões passam a ser consumidas diretamente pela interface; não recalculamos retroativamente o histórico. Novos planos têm chaves estrangeiras para usuário e edital. Não adicionar bibliotecas.

## Carregamentos e navegação

O contexto de estudos é montado somente na área autenticada. Em uma primeira visita sem indício de sessão anterior, o formulário de login aparece imediatamente e a consulta de sessão ocorre em segundo plano. Após um acesso confirmado pela API, o navegador guarda apenas o indicador studia:session-known=1, sem dados pessoais ou credenciais. Esse indicador permite manter a tela neutra durante a restauração e evitar flash de login no F5. Ele nunca autoriza acesso: a API continua validando a sessão. Logout e resposta 401 atual removem o indicador; falha de armazenamento não impede o login. Respostas antigas da consulta não substituem um login mais recente nem removem seu indicador. A troca obrigatória de senha continua anterior ao acesso aos estudos.

O menu permanece montado durante a primeira carga dos estudos. Somente rotas que dependem deles aguardam essa carga dentro da área de conteúdo. Editais, importação e administração de usuários têm carregamentos próprios e não aguardam o dashboard.

Atualizações de um plano já visível preservam o conteúdo e o cronômetro, bloqueando apenas ações conflitantes enquanto chegam os dados. Em caso de falha, o plano anterior continua disponível com a opção de tentar novamente. A rotina usa feedback nos botões durante o salvamento, sem substituir a página por uma animação.

Validado no navegador com respostas de sessão, dashboard, plano e salvamento pausadas ou com erro simulado, incluindo entrada pela raiz, login público, preservação de campos, navegação independente e troca obrigatória de senha. Teste: `server/tests/api/loading-navigation-browser.mjs`.

Regressão de F5: observar inserções do formulário no DOM durante recargas autenticadas da raiz, de Progresso e da URL de login, com a verificação da sessão pausada. Nesses casos, nenhum formulário de login deve ser montado.

### Um indicador na carga inicial da página principal

Quando login/me confirmam `hasActiveNotice=false`, a rota inicial pode mostrar a orientação para começar sem aguardar o dashboard. Essa exceção vale apenas para a página inicial ainda no estado vazio; configurações e outras rotas dependentes continuam aguardando seus dados. O dashboard atualiza o contexto em segundo plano e os erros permanecem visíveis. Contas com edital ativo continuam usando a carga coordenada, sem mostrar uma orientação de conta vazia antes dos dados reais. Validado em `server/tests/api/empty-account-browser.mjs` com dashboard pausado, zero montagens de indicador depois do login e casos sem edital, rascunho e edital ativo.

Dados de estudo e plano do dia registram suas pendências em `CarregamentoPaginaProvider`. Um único indicador, montado acima das rotas, permanece entre essas etapas até que a última termine. A troca de responsável não remonta o círculo nem reinicia a animação. A primeira exibição continua tendo limiar de 750 ms para evitar flashes em respostas rápidas. O plano diário não monta seus componentes com indicadores individuais enquanto a carga inicial estiver pendente. Atualizações de dados já presentes não entram nesse carregamento inicial.

Validado por `server/tests/api/single-loading-browser.mjs`: a verificação de sessão pausada não mostra círculo; consultas demoradas de dashboard e plano compartilham o mesmo indicador, com no máximo uma montagem e sem flash de login, em desktop e celular. Falha do plano encerra a espera e permite tentar novamente; atualização em segundo plano não cria novo indicador.


Na recarga por F5, a verificação da sessão apresenta apenas a marca estática, sem indicador circular e sem expor dados privados ou montar o login antes de confirmar a sessão. Contas sem edital ativo seguem para a orientação inicial sem nenhum indicador; consultas de estudo rápidas também terminam antes do limiar visual de 750 ms. Esse limiar afeta somente a exibição do indicador, nunca a duração da consulta ou da navegação.
