---
name: Studia
description: Agenda de estudo com leitura clara e próximo passo visível.
colors:
  navigation: "#e6c85e"
  brand-600: "#635018"
  brand-500: "#776125"
  brand-400: "#a58a36"
  canvas: "#f6f5ef"
  surface: "#ffffff"
  soft: "#f1eee1"
  hover: "#ede8d5"
  line: "#d9d5c3"
  line-strong: "#bcb69c"
  ink: "#303127"
  muted: "#666452"
  clock: "#3c3b30"
  navigation-active: "#fff9e6"
  navigation-hover: "#f0d879"
typography:
  headline:
    fontFamily: '"Public Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif'
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Public Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: '"Public Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: '"Public Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  timer:
    fontFamily: '"Public Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif'
    fontSize: "3rem"
    lineHeight: 1.3
    letterSpacing: "-0.035em"
rounded:
  field: "4px"
  calendar-day: "6px"
  control: "7px"
  navigation: "8px"
  column: "12px"
  panel: "14px"
  session: "16px"
spacing:
  compact: "8px"
  control-gap: "12px"
  row: "18px"
  panel: "20px"
  section: "24px"
  grid: "26px"
  page: "28px"
components:
  button-primary:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  button-primary-hover:
    backgroundColor: "{colors.brand-500}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "9px 11px"
  navigation-active:
    backgroundColor: "{colors.navigation-active}"
    textColor: "{colors.ink}"
    rounded: "{rounded.navigation}"
    padding: "10px 12px"
  calendar:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "20px"
  session:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.session}"
    padding: "24px 24px 0"
---

# Design System: Studia

## Overview

**Creative North Star: "Agenda"**

A Agenda organiza o estudo com uma faixa dourada de navegação, papel claro e listas separadas por linhas. Public Sans sustenta títulos, conteúdo e controles. A leitura é direta, com contraste entre a área de trabalho clara e a faixa escura do cronômetro.

A interface em português dá espaço a assuntos longos e mantém o conteúdo original consultável. Superfícies brancas e fundos tonais agrupam informações sem transformar cada item em um cartão independente. Esta documentação descreve a aplicação em `app/src`; os protótipos não são autoridade visual de produção.

**Key Characteristics:**

- Navegação dourada e ações em ocre escuro.
- Tipografia local, legível e sem caixa alta decorativa.
- Listas com divisórias e painéis de cantos suaves.
- Conteúdo longo com quebra de linha e rolagem interna acessível.

## Colors

A paleta combina dourado, ocre e neutros quentes. Os valores normativos estão no frontmatter e correspondem à cascata de estilos em produção.

### Primary

- **Dourado de navegação** (`navigation`): identifica o cabeçalho compartilhado. Os estados claros `navigation-active` e `navigation-hover` distinguem a rota e a interação.
- **Ocre de ação** (`brand-600`): botões principais, links, seleção de dias e barras do ritmo semanal. `brand-500` atende ao hover e ao contorno global de foco; `brand-400` aparece em controles e bordas de foco existentes.

### Neutral

- **Papel** (`canvas`): fundo geral; **branco** (`surface`): calendários, sessão e formulários.
- **Papel tonal** (`soft`) e **hover** (`hover`): agrupamentos, trechos originais e resposta dos controles secundários.
- **Linha** (`line`) e **linha forte** (`line-strong`): divisórias, bordas de campos e barras de rolagem.
- **Tinta** (`ink`) e **texto auxiliar** (`muted`): hierarquia de leitura sem reduzir a opacidade do texto.
- **Cronômetro** (`clock`): faixa escura que agrupa tempo e ações da sessão, com texto claro.

**The Ação Legível Rule.** Use o ocre escuro nos controles principais com texto branco; reserve o dourado claro para navegação e realces.

As seis cores `subject-1` a `subject-6` existentes em `index.css` identificam matérias. Cores de erro, sucesso e atraso comunicam estado local; não substituem a paleta de navegação e ação.

## Typography

**Display Font:** Public Sans, com os fallbacks definidos no frontmatter.

**Body Font:** Public Sans. Os arquivos locais cobrem pesos 400, 500, 600 e 700, com `font-display: swap`.

**Character:** uma única família mantém a leitura estável entre texto de edital, formulários e dados. Os títulos usam peso e espaçamento discretos, sem competir com o assunto em estudo.

### Hierarchy

- **Headline:** título de página; no celular passa a 1,75rem. Cabeçalhos permitem quebra de linha.
- **Title:** títulos de seção e de plano. O assunto da sessão usa 1,375rem, peso 600 e entrelinha 1,4; em telas largas chega a 1,5rem.
- **Body:** leitura principal. Texto auxiliar varia entre 0,875rem e 0,9375rem, com entrelinhas de 1,6 a 1,65.
- **Label:** botões e rótulos compactos. Os dias da semana no calendário usam 0,75rem em contexto restrito.
- **Timer:** tempo de foco. O calendário usa números tabulares para estabilizar o alinhamento dos dias.

**The Texto Inteiro Rule.** Preserve a quebra de linha de títulos e assuntos; use rolagem interna para listas e trechos longos, sem cortar a informação necessária à escolha.

## Layout

A aplicação tem cabeçalho superior de largura total. O conteúdo fica centralizado em até 1600px, com margens internas de 42px no desktop, 28px em telas intermediárias e 18px no celular. A faixa de contexto reúne edital e data; o título da rota pertence ao conteúdo. A data é ocultada em até 850px.

O espaçamento usa passos compactos entre controles, respiros maiores entre seções e gaps de 26px ou 28px nas grades principais. Não há obrigação de transformar cada região em painel branco.

Na página Hoje, o desktop reúne calendário de 250px, plano flexível e sessão com mínimo de 340px. Em até 1180px, plano e sessão ocupam a coluna ao lado do calendário. Em até 850px, a grade vira uma coluna: sessão primeiro, plano depois, calendário abaixo. Sem bloco de foco, o plano continua disponível.

Planejamento usa calendário e data em uma lateral de 265px. A revisão do edital usa seleção de cargo em 310px e conteúdo flexível; em até 900px, os cargos ficam acima das matérias. As colunas de continuidade viram uma coluna em até 850px.

Em até 600px, a navegação abre pelo botão Menu. A grade de rotas aparece quando expandida; conta e saída permanecem acessíveis. O menu fecha ao trocar de rota, com estado exposto por `aria-expanded`.

## Elevation & Depth

As principais superfícies Agenda são planas. Branco, papel tonal, divisórias e a faixa escura do cronômetro constroem a profundidade. O cartão de autenticação remove a sombra herdada. Contornos de foco têm 2px e afastamento de 4px; são indicação de interação, não elevação.

**The Superfície Plana Rule.** Use agrupamento tonal e divisórias como primeira escolha para separar conteúdo da Agenda.

Transições e animações existentes servem a estados e sobreposições. O sistema respeita `prefers-reduced-motion`; duração e detalhes de movimento ficam no sidecar.

## Shapes

Controles têm cantos discretos; painéis maiores usam arredondamento mais amplo. Os tokens do frontmatter correspondem a campos, dias do calendário, botões, navegação, colunas, painéis e sessão. Números dos blocos e marcadores de atividade são circulares. Barras semanais têm apenas o topo arredondado.

Os itens de plano e revisão são linhas sem caixa individual, separados por borda superior. Estados selecionados destacam o número ou o controle, sem adicionar uma borda forte ao item inteiro.

## Components

### Buttons

Controles claros, com verbos de ação em português. O botão diário principal usa ocre e texto branco; o secundário usa branco, tinta e borda forte. O hover usa os respectivos tokens e o foco visível usa o contorno global. Botões desabilitados reduzem a opacidade pela metade. A altura mínima do botão diário é 44px; ações compactas de bloco usam 38px.

Na faixa escura da sessão, iniciar e pausar usam botão branco com texto escuro. Registrar estudo usa contorno e texto claros. Essas variantes pertencem ao contexto escuro da sessão.

### Chips

O marcador da sessão é um rótulo tonal, não um filtro. Exibe a situação do assunto, aceita quebra de linha e usa ocre sobre papel tonal, com cantos de 5px e padding de 3px por 8px.

### Cards / Containers

Calendário e plano usam painéis de 14px; a sessão usa 16px e conteúdo recortado nos cantos. A coluna de continuidade usa papel tonal mais escuro, cantos de 12px e padding de 18px. O plano na grade Hoje fica diretamente no fundo geral, sem painel branco.

As listas de continuidade limitam a altura a 340px; o conteúdo original da sessão, a 140px. A revisão mantém artigos de matérias com altura de 28rem e lista interna rolável. Regiões roláveis de listas possuem acesso por teclado.

### Inputs / Fields

Campos de rotina e edição usam fundo branco, borda forte, texto de 1rem e altura mínima de 44px. A data do planejamento usa cantos de 7px; campos de edição de matérias também usam fundos tonais e bordas contextuais. Preserve os rótulos e estados de foco existentes.

### Navigation

Cabeçalho dourado com marca à esquerda, rotas ao centro e conta à direita no desktop. A rota ativa ganha fundo claro e peso 600. A conta abre com `details` e `summary`, preservando identificação e saída. O acesso administrativo aparece somente para o perfil correspondente. O link de pular para o conteúdo fica visível ao receber foco.

### Calendário e continuidade

O calendário distingue hoje por sublinhado, seleção por fundo ocre e estudo registrado por ponto. Esses significados são separados. O ritmo semanal mostra barras proporcionais e descrição textual dos minutos. A continuidade separa plano pendente, assuntos em andamento e próximas revisões, com contagem e mensagem para grupos vazios.

### Sessão e revisão do edital

A sessão reúne matéria, situação, assunto, conteúdo original, cronômetro e registro. O conteúdo original tem título próprio e rolagem. A identificação do edital permanece no contexto compartilhado, sem repetir um subtítulo no Hoje.

Na revisão, a escolha do cargo vem antes dos detalhes de manutenção. Renomear, adicionar matéria e desativar o edital ficam na seção expansível de ajustes. A composição específica dessas páginas está registrada em `.impeccable/surfaces/app-src-app-tsx.md` e na ADR 0007.

### Plano do dia

Na home e em Planejamento, o card do plano tem altura fixa de 640 pixels, inclusive em
dias vazios e durante o carregamento. O título informa a quantidade total de
itens, incluindo os adiados. O cabeçalho permanece visível e apenas o corpo
rola, com acesso por teclado e sem transbordamento horizontal.

### Ritmo semanal

“Seu ritmo na semana” usa um card com fundo de superfície, raio de 14 pixels e
espaçamento interno de 24 pixels, inclusive no celular. O título, o total real
e os sete dias ficam no mesmo recipiente visual.

### Modais

Modais usam larguras predefinidas de 384, 448 e 512 pixels e alturas de 400,
640 e 720 pixels. A altura se limita à área visível, com margem de 16 pixels
em cada lado. Conteúdo longo rola no corpo; cabeçalho e rodapé de ações ficam
visíveis. Títulos extensos têm rolagem própria, sem expandir o painel. A página
ao fundo fica sem rolagem enquanto o modal está aberto. Janelas de tópicos do
planejamento seguem o mesmo limite, com altura de 420 pixels.

## Do's and Don'ts

### Do:

- **Do** usar Public Sans local e os tokens da aplicação nas novas superfícies.
- **Do** preservar foco visível, rótulos, estados selecionados e acesso por teclado às listas roláveis.
- **Do** manter assuntos longos legíveis com quebra de linha e rolagem interna quando necessária.
- **Do** separar conteúdo do edital, compromisso do plano e resultado registrado.

### Comportamentos de confiabilidade

- Biblioteca de tópicos em card de altura limitada, com busca, filtros e 30 unidades por página. Histórico mostra os registros recentes primeiro, também em páginas de 30.
- Título longo na sessão de foco usa rolagem própria para manter os controles próximos. O card do plano diário mantém a rolagem interna existente.
- Modal move o foco para seu conteúdo, contém Tab, torna o fundo inerte e devolve o foco ao controle de origem ao fechar.
- As quatro abas de configuração mostram seus nomes também no celular. Campos numéricos usam fonte legível sem exigir zoom automático.
- Rotina em edição é um rascunho até salvar. Estados de gravação e falha ficam visíveis, com nova tentativa quando houver erro.
- Gráfico semanal oferece valores por dia em tabela acessível, sem depender de hover.
- Edição de bloco usa modal amplo de até 768 px. Mostra assunto atual e duração; “Trocar assunto” revela busca e resultados com o texto completo, seleção explícita e estado vazio. Salvar e cancelar permanecem no rodapé fixo.

### Importação por cargo

A importação usa uma página própria com três etapas: identificar cargos,
escolher cargo e conferir conteúdo. A busca aceita nome, código e escolaridade;
a lista tem altura limitada e mostra mais resultados sob demanda. A prévia
exibe páginas, texto original e evidências de associação. A confirmação de
leitura antecede a gravação. O caminho com IA externa abre um modal amplo,
mantém a resposta em rascunho e preserva o texto quando há erro. O foco inicial
vai para um campo visível e editável. Estados de processamento, falha e retomada
aparecem na própria etapa, inclusive no celular.

Trechos descobertos aparecem antes da prévia como pendências, com páginas e
contexto original em área rolável. A ação principal corrige apenas esses trechos;
a aplicação fica desabilitada enquanto houver pendências. Declarar que um trecho
não pertence ao cargo exige abrir uma confirmação e escrever o motivo. A decisão
fica visível na revisão. Não mostrar percentuais de completude derivados apenas
da resposta da IA. Ausência de lacunas detectadas significa pronto para conferir,
sem garantir cobertura de todo o documento.

O upload entrega a leitura a um processo em segundo plano. Mostrar páginas
processadas, cancelamento e retomada, sem exigir manter a aba aberta. A lista de
diagnóstico das páginas e as seções localizadas usam rolagem limitada. Páginas
reconhecidas de imagem pedem comparação com o original. Retificações e anexos
sem programa claro oferecem confirmação explícita ou envio de um PDF completo.
A revisão informa a quantidade de unidades literais; ativar leva à rotina e
preserva valores existentes. Decisões sobre pendências podem ser reabertas.

### Don't:

- **Don't** usar dados ilustrativos dos protótipos como dados reais do produto.
- **Don't** remover rotas ou acesso à conta ao adaptar a navegação para celular.
- **Don't** usar o dourado claro como fundo de ação com texto branco.
- **Don't** promover detalhes de um protótipo a regras de produção sem conferir a implementação.
