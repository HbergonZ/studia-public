# Estudo de layouts do Studia

Experimento visual, sem integração com a API e sem alterar a aplicação publicada.
Usa conteúdo fictício de um concurso para comparar o mesmo trabalho nas três
opções. A skill aplicada é `frontend-design`, de `anthropics/skills`, instalada
com `skill-installer`. O fluxo da skill Sites é local, com HTML, CSS e JavaScript.

## O problema observado

O site atual repete contêineres arredondados, roxo saturado, indicadores de
progresso, muitas cores de matérias e títulos com peso semelhante. A tela
compete por atenção. O redesign deve tornar evidentes o que estudar agora,
as revisões pendentes e a relação com o edital.

## Biblioteca

Base `#F6F7F3`, superfície `#FFFFFF`, texto `#25382F`, verde `#365C49`,
linha `#DCE3DC`, secundário `#64736A`. Public Sans para controles e texto;
Literata nos títulos do plano. Alinhamento à esquerda. Navegação lateral,
conteúdo organizado como um índice de estudos e resumo lateral estreito.

```text
menu | plano ativo e data                         | perfil
     | estudar hoje: lista de tópicos             | calendário
     | conteúdo do edital: linhas por matéria     | resumo
```

A assinatura visual está nas lombadas de matérias e na organização de leitura.
Não é uma composição de cartões de mesmo tamanho. Indicada para a rotina de
consulta e revisão. Custo: a visão semanal não aparece inteira na primeira tela.

## Agenda

Base `#F1F5FA`, superfície `#FFFFFF`, texto `#24354B`, azul `#315C91`,
linha `#DFE6EF`, destaque `#A36721`. Public Sans em toda a interface.
Navegação superior e agenda semanal com escala de horário, alinhada à esquerda.

```text
marca | início / editais / tópicos / usuários     | perfil
semana e controles
agenda: dias por colunas, horários por linhas    | quinta e próxima sessão
```

A assinatura está no calendário utilizável e nas sessões posicionadas por
horário. Indicada para quem planeja por dia. No celular, os dias viram um
seletor e os compromissos do dia formam uma lista. Custo: há menos conteúdo
programático visível de uma vez.

## Mesa de estudo

Base `#EAF0F5`, foco `#243549`, texto `#263746`, azul `#40637D`,
marcador `#D2AC6F`, texto sobre foco `#F5F7FA`. Manrope para a interface.
Navegação compacta lateral, sessão no centro e fila de revisão ao lado.

```text
menu | tópico em estudo e material               | fila do dia
     | sessão de foco e cronômetro               | próximos tópicos
     | histórico recente                        | progresso do plano
```

A assinatura está na área de trabalho para uma sessão, com o conteúdo do
edital sempre associado ao assunto. Indicada para quem deixa o Studia aberto
enquanto estuda. Custo: os dados gerais ficam em segundo plano.

## Revisão do plano antes de construir

Uma primeira ideia de três painéis com cores diferentes repetiria o problema
atual. Por isso cada opção muda a estrutura e a tarefa principal. Evitamos
gradientes decorativos, slogans, métricas gigantes fora de contexto, cartões
idênticos e rótulos em caixa alta. O cronômetro da Mesa tem destaque porque é
um controle de trabalho, não uma métrica decorativa.

Nenhuma opção foi escolhida para produção. Após a escolha, registrar a decisão
em `docs/adr` e implementar por tela, preservando autenticação, administração,
importação e dados existentes.

## Revisão da Mesa após avaliação

O usuário preferiu a Mesa e pediu os elementos de acompanhamento presentes no
site atual. O protótipo agora abre nessa direção por padrão e acrescenta o mapa
anual de atividade, o calendário mensal/anual, as metas semanais e o quadro de
revisões. Atalhos permitem chegar às seções sem misturar todos os elementos na
área de foco. O quadro conserva as quatro categorias do cronograma atual:
Atrasadas, Para hoje, Conteúdo novo e Próximas revisões. O registro de estudo
move o cartão para a próxima revisão na demonstração. Não implementamos arraste
livre, pois as colunas representam datas e ciclos calculados pelo aplicativo.

Todos os dados continuam fictícios. A escolha visual ainda não foi aplicada
ao código de produção.
