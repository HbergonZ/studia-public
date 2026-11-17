# Studia

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas que estudam para concursos públicos e precisam organizar o conteúdo do edital
em uma rotina prática. Um administrador cria os acessos das demais pessoas.

## Product Purpose

Ajudar a pessoa a saber o que estudar agora, dentro do tempo disponível, e acompanhar
continuações, conclusões e revisões sem apresentar todo o edital como tarefa do dia.

## Operating Context

Uso pelo navegador, em computador e celular. O usuário importa o edital com um prompt
enviado a uma IA externa, traz a resposta JSON, seleciona o cargo e define sua
disponibilidade. O Studia organiza os blocos diários. A pessoa estuda, registra o tempo
e informa se continuará o assunto ou concluiu a unidade.

## Capabilities and Constraints

- Editais com vários cargos e conteúdo geral e específico por cargo e escolaridade.
- Unidades de estudo com os trechos originais preservados.
- Planejamento por disponibilidade, sessões, pausas e revisões.
- Calendário, histórico de atividade, quadro de revisões e progresso.
- Cadastro público desabilitado, acessos administrados e troca inicial de senha.
- Uso de IA externa por copiar/importar, sem exigir uma API paga do usuário.
- O usuário pediu letras legíveis, cards com rolagem interna e redução de
  carregamentos desnecessários.
- Mockups solicitados para comparar o fluxo completo: escolher cargo, organizar o
  dia e estudar. O usuário escolheu Agenda e autorizou aplicá-la ao sistema.

## Brand Commitments

Nome Studia. Interface em português, textos claros e diretos, sem exageros de
marketing. A preferência anterior pela Mesa de estudo é contexto; o pedido atual
autoriza explorar layouts melhores em protótipos separados.

## Evidence on Hand

Aplicação existente em `app/src`. Editais locais em `exemplos_editais`, inclusive o
edital de Saúde de Porto Velho. Mockups podem usar exemplos desses conteúdos, mas
tempo realizado, notas e progresso ilustrativos devem ser identificados como
demonstração. Não usar dados pessoais reais nos protótipos.

## Product Principles

- Tornar o próximo estudo e a duração da sessão claros.
- Respeitar o cargo escolhido e o tempo disponível.
- Preservar o conteúdo e o histórico ao organizar o estudo.
- Distinguir continuar um assunto de concluir uma unidade.
- Reduzir a configuração manual necessária.
