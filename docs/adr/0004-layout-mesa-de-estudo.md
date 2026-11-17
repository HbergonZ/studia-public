# Layout Mesa de estudo

O usuário avaliou as propostas em `prototypes/layouts`, escolheu Mesa de estudo
e autorizou sua aplicação ao site. A revisão do protótipo acrescentou atividade
anual, calendário mensal/anual, metas e as quatro categorias de revisão.

A implementação usa React, Tailwind e os componentes existentes, sem dados ou
ações simuladas. Navegação lateral no desktop e superior no celular. O painel
destaca o assunto selecionado e o cronômetro, seguido do acompanhamento.

Tokens semânticos definem fundo, superfícies, texto, bordas e ações. A tela de
foco conserva sua superfície escura, vídeos, pausas, controle de tempo e atalhos.
Calendário, gráficos, planejamento, cadastro administrativo, importação e
operações sobre editais mantêm seus contratos.

A alternativa de sobrescrever classes antigas com CSS global foi descartada
para evitar conflitos de contraste. As telas usam tokens comuns e o painel
recebe uma composição própria. Nenhuma dependência nova é necessária.

O título HTML passa de `app` para `Studia`, com idioma `pt-BR`.
