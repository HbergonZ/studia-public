# Layout Agenda no sistema

Data: 17/10/2026. Decisão aprovada pelo usuário após os mockups do Impeccable.

Aplicar a proposta Agenda de `prototypes/impeccable`, selecionada na comparação e
autorizada para o sistema. Preservar autenticação, administração, importação,
seleção de cargos, sessões, revisões e regras de planejamento existentes.

A composição usa navegação superior, calendário compacto, plano central e sessão
lateral. As demais páginas compartilham cores, tipografia e controles. Em telas
menores, as áreas passam para uma coluna. Reutilizar componentes e APIs atuais.
O calendário compacto usa o histórico carregado, sem requisição adicional.
Usar Public Sans local com sua licença e dados reais, sem valores dos mockups.

A navegação no celular usa o botão Menu, com estado expandido acessível e todas
as rotas preservadas. A escolha do cargo antecede os ajustes administrativos do
edital, recolhidos em uma área secundária.

Validação: compilação TypeScript e Vite; oito rotas em quatro larguras (1440,
1024, 390 e 320 pixels); ajuste e persistência de bloco; registro de estudo;
navegação por data e recarga; menu e conta no celular. Sem transbordamento
horizontal ou exceções JavaScript na verificação automatizada em navegador.

Os modais compartilham dimensões predefinidas, corpo com rolagem e rodapé fixo
para ações de formulário. Testados registro, ajuste de bloco, ação de edital,
histórico e importação (entrada e prévia) em quatro dimensões, incluindo tela
de 320 pixels e orientação horizontal. A expansão do conteúdo não altera o
tamanho do painel. Essa preferência está registrada no DESIGN.md.

## Direction contract

THESIS: separar conteúdo total, compromisso diário e sessão, sem apresentar todo o
edital como tarefa imediata.

OWN-WORLD: navegação dourada #E6C85E, fundo #F6F5EF, branco #FFFFFF, texto #303127
e ação #635018; Public Sans local e listas com divisórias.

STORY: escolher cargo, ajustar o plano ao tempo disponível, estudar e registrar
continuação ou conclusão, preservando histórico e revisões existentes.

FIRST VIEWPORT: navegação superior, contexto do edital, data, calendário à esquerda,
plano no centro e sessão à direita. No celular, sessão e plano em uma coluna.

FORM: Agenda aprovada, referência rw-timetable-slide-rack adaptada a Operate.
seed:5334e23a8dd4b59f. Sem barra de comparação ou dados fictícios no produto.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
