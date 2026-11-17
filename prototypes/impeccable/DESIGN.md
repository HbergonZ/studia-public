---
name: 'Studia: experimento Impeccable'
description: Sistema observado nos mockups navegáveis, com Agenda como apresentação
  padrão.
colors:
  estudio-ground: '#f1f3fa'
  estudio-surface: '#fff'
  estudio-soft: '#e9edf8'
  estudio-ink: '#202535'
  estudio-muted: '#566078'
  estudio-accent: '#253cb1'
  estudio-accent-soft: '#e7ebff'
  estudio-line: '#cbd2e4'
  estudio-select: '#f0d769'
  estudio-success: '#2c6250'
  estudio-warning: '#795119'
  estudio-rail: '#253cb1'
  estudio-rail-ink: '#fff'
  rotina-ground: '#f4f6f3'
  rotina-surface: '#fff'
  rotina-soft: '#e9eeea'
  rotina-ink: '#25352e'
  rotina-muted: '#57685d'
  rotina-accent: '#31564b'
  rotina-accent-soft: '#e0ece4'
  rotina-line: '#c9d5cc'
  rotina-select: '#dbe69c'
  rotina-success: '#315e40'
  rotina-warning: '#7d5721'
  rotina-rail: '#edf1ea'
  rotina-rail-ink: '#25352e'
  ground: '#f6f5ef'
  surface: '#fff'
  soft: '#f1eee1'
  ink: '#303127'
  muted: '#666452'
  accent: '#635018'
  accent-soft: '#f3e8b9'
  line: '#d9d5c3'
  select: '#ead17a'
  success: '#386044'
  warning: '#775314'
  rail: '#e6c85e'
  rail-ink: '#303127'
typography:
  headline:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 2rem
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: -.025em
  section:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 1.25rem
    fontWeight: 650
    lineHeight: 1.35
  title:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 1rem
    fontWeight: 650
    lineHeight: 1.4
  body:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: .875rem
    lineHeight: 1.5
  timer:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 2.5rem
    fontWeight: 550
    lineHeight: 1.1
    letterSpacing: -.035em
rounded:
  button: 8px
  field: 7px
  badge: 5px
  navigation: 10px
  panel: 14px
  focus: 16px
  subject: 12px
spacing:
  '4': 4px
  '8': 8px
  '12': 12px
  '16': 16px
  '18': 18px
  '20': 20px
  '22': 22px
  '24': 24px
  '26': 26px
  '28': 28px
  '30': 30px
  '32': 32px
  '42': 42px
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.surface}'
    rounded: '{rounded.button}'
    padding: 9px 16px
    typography: Public Sans, Segoe UI, sans-serif
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: 9px 16px
  button-text:
    backgroundColor: transparent
    textColor: '{colors.accent}'
    rounded: '{rounded.button}'
    padding: 9px 4px
  field:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.field}'
    padding: 11px 12px
  badge:
    backgroundColor: '{colors.soft}'
    textColor: '{colors.muted}'
    rounded: '{rounded.badge}'
    padding: 3px 8px
  calendar:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.panel}'
    padding: 22px
  subject:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.subject}'
    padding: 20px
---

# Design System: Studia, experimento Impeccable

## Overview

**Creative North Star: "Agenda"**

Agenda organiza o estudo em compromissos do dia, com navegação superior dourada, calendário, lista diária e sessão de estudo. O usuário escolheu Agenda na página do Impeccable, com retorno optionId: agenda e construção por código (code-led). Agenda abre por padrão; Estúdio e Rotina continuam disponíveis.

Este documento descreve apenas o experimento local do fluxo cargo, planejamento e estudo. Usa dados de demonstração, sem API ou persistência. Nenhuma identidade foi implantada em produção.

**Key Characteristics:**
- Três variantes, Agenda como padrão.
- Public Sans local.
- Listas com divisórias e superfícies planas.
- Controles com foco visível.

Evidência: `dist/styles.css`, `dist/index.html`, `dist/app.js`, `dist/demo-data.js` e `BRIEF.md`. O contexto está em `../../PRODUCT.md`. `package.py` gera `studia-mockups.html`, HTML autônomo com fontes incorporadas.

## Colors

### Primary

Agenda combina castanho de ação (`accent`) com dourado na navegação (`rail`). Estúdio usa azul e Rotina usa verde. Tokens sem prefixo representam Agenda; `estudio-` e `rotina-` preservam os valores das alternativas. O dourado efetivo no CSS substitui o valor exploratório do contrato para fins desta documentação.

### Neutral

`ground`, `surface` e `soft` separam página, painéis e agrupamentos. `ink`, `muted` e `line` organizam texto e divisórias. `accent-soft` realça cargos selecionados; `select` aparece na seleção e no orçamento de pausas. `success` e `warning` estão declarados no tema, mas alguns estados usam cores literais próprias. As rampas do sidecar são prévias sintetizadas, não tokens implementados.

## Typography

**Display Font:** Public Sans, com Segoe UI e sans-serif de fallback.
**Body Font:** a mesma família.

Arquivos locais de pesos 400, 500, 600 e 700, com licença OFL. Os pesos 650 dos títulos e 550 do relógio são pedidos pelo CSS sobre fontes estáticas, sem arquivos adicionais. O frontmatter registra os valores declarados.

### Hierarchy

- **Headline:** título da página; reduz para 1.75rem no celular.
- **Section:** título de seção.
- **Title:** título de sessão.
- **Body:** leitura principal, parágrafos com limite de 70ch quando aplicável.
- **Label:** contexto e descrições; metadados menores chegam a .8125rem e .75rem.
- **Timer:** números tabulares; reduz para 2.25rem no celular.

## Layout

Agenda tem navegação horizontal e conteúdo limitado a 1500px. Hoje usa calendário de 270px, plano flexível e sessão com mínimo de 280px. Abaixo de 1150px, o calendário passa para 250px e a sessão fica sob o plano. Abaixo de 600px, a ordem é sessão, plano e calendário, em coluna única.

Estúdio tem trilho de 124px e estudo à esquerda. Rotina tem lateral de 228px, reduzida para 195px abaixo de 1150px, e prioriza o plano diário. As duas usam navegação superior no celular. O conteúdo geral tem limite de 1550px e preenchimento de 32px por 42px, reduzido para 28px e depois 24px por 18px. O breakpoint de 850px empilha cargo e planejamento; acima de 1600px o preenchimento superior passa para 38px.

Unidades do edital e opções de cargo têm rolagem interna. O calendário usa sete colunas; o histórico admite rolagem horizontal interna. Os espaçamentos registrados são passos observados, sem impor uma escala modular adicional.

## Elevation & Depth

Superfícies planas, separadas por cor, espaço e divisórias. A única sombra declarada pertence ao toast de confirmação, registrada no sidecar. A faixa do cronômetro de Agenda é grafite. A rolagem é suave; movimento reduzido restaura rolagem automática e desliga animações e transições. Não há duração de animação definida.

## Shapes

Cantos suaves com raios por componente no frontmatter. Índices de sessão, avatar e pontos de calendário são circulares. Ícones são SVG de contorno, normalmente 20px e traço de 1.7px. Linhas das listas não recebem cartões individuais.

## Components

### Buttons

O botão comum tem mínimo de 44px, peso 600 e tamanho .9375rem. Primário usa acento e branco; hover aplica brilho .91. Secundário usa superfície, borda e hover suave. Textual usa acento sem borda visível. Desabilitado usa opacidade .5. Foco usa contorno de 3px no acento, afastado 3px. Há botões compactos de 34px e controles menores no calendário; 44px não é uma regra universal do artefato.

### Chips

Badges indicam tipo ou estado, sem filtrar. Revisão e conclusão têm pares literais próprios. Cargo selecionado usa linha de rádio ou checkbox com fundo de acento suave.

### Cards / Containers

Superfícies brancas agrupam calendário, assunto e estudo. Listas internas usam divisórias. Colunas de revisão têm fundo suave e itens transparentes. Trechos do edital têm fundo suave e rolagem interna.

### Inputs / Fields

Borda de 1px, superfície clara e label visível. Campo comum tem mínimo de 44px; duração usa campo numérico compacto. Orçamento excedido usa aviso textual quente. O artefato não define um sistema completo de erros de campo.

### Navigation

Hoje, Meu edital e Planejamento usam `aria-current="page"` para indicar o destino atual. Agenda realça com creme; Estúdio com branco e acento; Rotina com acento e branco. No celular, os três destinos ficam em linha. O seletor das variantes usa `aria-pressed` e pertence à demonstração.

### Sessões de estudo

Linhas combinam índice, assunto, título e duração. Índice preenchido indica sessão ativa; título riscado indica conclusão. O cronômetro permite iniciar, pausar e registrar. O registro distingue continuar e concluir. Disponibilidade, duração e calendário alteram apenas o estado em memória.

## Do's and Don'ts

### Do:
- **Do** distinguir conteúdo total e compromissos do dia.
- **Do** usar divisórias nas listas de sessões e unidades.
- **Do** manter seleção e foco visíveis.
- **Do** identificar os dados ilustrativos.

### Don't:
- **Don't** tratar o experimento como identidade implantada em produção.
- **Don't** transformar cada linha de lista em cartão aninhado.

A revisão independente final retornou SHIP após corrigir fontes, listas aninhadas e trilho de Estúdio. `review-results.json` registra PASS em 27 combinações (três variantes, três telas e larguras 1440px, 390px e 320px), além de interações. O detector manual rodou uma vez com resultado vazio. O HTML autônomo foi verificado com Agenda padrão, fontes carregadas, 51 opções de cargo e navegação sem exceções. As 18 capturas têm proveniência de screenshot real de `review.mjs`. Esses resultados não comprovam integração, persistência ou implantação. Nenhum defeito foi canonizado nem corrigido em produção por esta documentação.
