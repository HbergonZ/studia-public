# Sistema de Organização de Estudos com IA

## A ideia em uma frase

Um sistema que lê o edital de um concurso (ou uma lista de matérias), monta um cronograma de estudos e já agenda as revisões certas na hora certa, ajustando tudo automaticamente conforme o desempenho em questões. A IA participa só da leitura do edital e da montagem/ajuste do cronograma. Conteúdo de estudo e questões continuam vindo de fora.

## Como o fluxo funciona, do início ao fim

Tudo começa com o edital: um PDF ou texto é enviado, e a IA extrai a estrutura (matérias, tópicos e, quando o edital deixa isso explícito, o peso ou número de questões de cada matéria). Essa extração nunca vira cronograma direto. Ela sempre passa por uma tela de revisão onde é possível corrigir nomes, adicionar tópicos que a IA não pegou, remover o que não interessa e ajustar pesos. Isso vale igualmente para quem prefere não usar edital e cadastrar as matérias manualmente. A lista final sempre passa por confirmação humana antes de gerar qualquer coisa.

Com a lista confirmada, entram dois inputs a mais: quanto tempo há disponível por dia (pode variar entre dias da semana) e qual o nível de conhecimento inicial em cada tópico. É a combinação desses dois pontos que dá origem ao cronograma, a fase de estudo do conteúdo novo mais as datas de revisão já calculadas desde o início.

No dia a dia, a tela inicial mostra um alerta simples com o que estudar hoje. A pessoa estuda, e sempre que responde questões daquele tópico (fora do sistema), registra o resultado: quantas acertou, quantas errou. Esse registro é o gatilho que faz o sistema recalcular sozinho as próximas revisões daquele tópico. Por cima de tudo isso, um dashboard mostra o progresso: quanto do edital já foi coberto, quais tópicos estão dominados, quais ainda estão fracos, e se o cronograma está sendo cumprido.

## As regras que decidem como o cronograma se comporta

**Revisões seguem a curva de Ebbinghaus, com uma folga baseada em desempenho.** Em vez de um algoritmo totalmente adaptativo (como o SM-2 do Anki, que calcula um fator de facilidade por tópico), a escolha foi por algo mais simples de explicar e de depurar: uma sequência fixa de intervalos (1 dia, 7 dias, 16 dias, 35 dias, 90 dias, e depois disso um ciclo de manutenção mais espaçado). O nível de conhecimento inicial decide em que ponto dessa sequência o tópico entra. Quem já domina um assunto não precisa passar pela revisão de 1 dia, entra direto no ciclo de manutenção; quem nunca viu o assunto começa do zero. A partir daí, o desempenho em questões empurra o tópico para frente ou para trás na sequência: um desempenho bom pula uma etapa (menos revisão), um desempenho ruim volta uma etapa (revisão antecipada). Sem dados de questões, o tópico simplesmente segue a curva padrão sem ajuste.

**O tempo do dia tem uma ordem de prioridade fixa.** Quando o tempo disponível não é suficiente para tudo que está agendado, a ordem é: primeiro revisões atrasadas, depois revisões marcadas para o dia, por último conteúdo novo. A lógica por trás disso é proteger o que está mais perto de ser esquecido antes de avançar no edital. Dentro do conteúdo novo, a ordem segue o peso da matéria no edital, quando essa informação existir. O que fica para trás num dia vira "atrasado" e assume prioridade máxima no dia seguinte. Não desaparece, só empurra.

**Nada de conteúdo ou questões geradas por IA.** A IA fica restrita a duas tarefas: ler o edital e extrair a estrutura, e calcular/reajustar o cronograma. Esse segundo cálculo não depende de IA nenhuma, é uma regra determinística (a curva mais o ajuste por desempenho), o que mantém o custo de uso da IA concentrado só no momento da extração do edital.

## O que entra no primeiro teste e o que fica para depois

Faz sentido começar enxuto: upload de edital com extração e tela de confirmação, cadastro manual como alternativa, os inputs de disponibilidade e conhecimento, a geração do cronograma com a curva de revisão, o registro manual de resultado de questões, o recálculo automático, um dashboard simples e o alerta diário, tudo dentro do próprio app, sem push ou e-mail. Duas contas de login bastam, cada uma vendo só o próprio cronograma.

Fica de fora por enquanto: geração de conteúdo ou questões por IA (decisão já tomada), notificações fora do app, aplicativo mobile nativo, qualquer forma de gamificação ou ranking, e qualquer estrutura pensada para escalar além desse teste inicial com duas pessoas. Gerenciar mais de um edital ao mesmo tempo também fica de fora, ainda não está claro como isso funcionaria (ver abaixo).

## O que ainda precisa de uma decisão

Algumas perguntas não têm resposta óbvia e valem uma conversa antes de virarem regra:

- Se alguém estiver estudando para dois editais ao mesmo tempo, como o tempo disponível se divide entre eles?
- Quando um dia inteiro é perdido, o cronograma reorganiza tudo sozinho para o dia seguinte, ou existe algum tipo de recalibração periódica para não acumular uma bagunça de semanas perdidas?
- Quantas questões recentes de um tópico entram no cálculo de desempenho bom ou ruim? Um número pequeno (tipo 5) reage rápido mas é instável; um número maior (tipo 15 a 20) é mais estável mas demora a refletir uma melhora real.
- Um tópico sem nenhuma questão respondida fica só na curva padrão até ter dados. Isso é aceitável, ou precisa de algum sinal intermediário (tempo de estudo, autoavaliação subjetiva)?
- A IA deve tentar extrair peso/número de questões por matéria do edital, ou só a lista de matérias e tópicos? Isso muda diretamente a regra de priorização do conteúdo novo.
- Se alguém corrige manualmente o nível de conhecimento de um tópico no meio do caminho, isso deve mover a posição dele na curva de revisão, ou só vale como referência sem efeito automático?
- O upload aceita só PDF com texto selecionável, ou também PDF escaneado/imagem, que exigiria OCR e adiciona custo e complexidade?
- Login simples com e-mail e senha é suficiente para este teste, ou já vale pensar em login social pensando numa eventual expansão?

## Sobre o custo da IA

Como o cálculo do cronograma não usa IA (é regra de negócio pura), o custo real fica concentrado nas extrações de edital, que tendem a ser esporádicas: um edital novo de vez em quando, não uma chamada por dia. Isso torna viável rodar o teste inicial numa única conta paga, compartilhada. Vale acompanhar quantas extrações acontecem por mês para ter uma noção real de gasto antes de pensar em abrir para mais gente.

## Como saber se o teste deu certo

O sinal mais simples é se o cronograma gerado bate com o que uma leitura manual do edital produziria. Depois disso, o que importa é uso real ao longo de algumas semanas: se o ritmo de revisões parece fazer sentido (nem cedo, nem tarde demais) e se o ajuste automático está de fato reduzindo a frequência de revisão nos tópicos já dominados, que é o comportamento central que todo o resto do sistema existe para sustentar.

## Depois disso

Com essas lacunas decididas, o próximo passo natural é o plano de desenvolvimento técnico propriamente dito: telas, modelo de dados, escolha da IA e arquitetura. Isso fica para um documento separado deste.
