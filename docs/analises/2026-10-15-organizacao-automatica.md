# Organização automática do conteúdo de estudo

## Problema observado

A importação preserva assuntos como texto, mas o planejador usa cada assunto diretamente como uma unidade de estudo. Um item como Legislação e Saúde Pública pode conter dezenas de conteúdos diferentes. Sua conclusão também avança uma única revisão para todo esse conjunto.

O tempo de 25 minutos é uma duração de sessão. Não representa uma estimativa validada para concluir qualquer tópico.

## Alternativas

1. Dividir por ponto, ponto e vírgula ou tamanho do texto. É simples, mas pode separar referências legais, perder contexto e produzir fragmentos sem sentido.
2. Pedir assuntos menores na própria extração. Melhora novas importações, mas mistura fidelidade documental com organização pedagógica e não resolve os editais existentes.
3. Manter a extração documental e criar uma organização posterior em unidades de estudo vinculadas à origem. Exige uma etapa própria e permite conferir cobertura, preservar o histórico e reorganizar sem reimportar.

A terceira alternativa é a recomendação para implementação. Este documento é uma proposta, sem alteração do conteúdo ou do histórico dos usuários.

## Fluxo proposto

1. Importar e preservar o texto original, cargo, matéria e ordem.
2. Gerar unidades com um foco claro por unidade. Usar os títulos e limites explícitos do edital primeiro, e análise semântica para os blocos extensos. Quantidade de caracteres serve como alerta, não como critério único de divisão.
3. Associar cada unidade ao trecho original que a fundamenta. Validar que os trechos cobrem o conteúdo e apontar lacunas e sobreposições. Não aceitar apenas a declaração da IA de que está completo. Manter conteúdos gerais e específicos nos cargos de origem.
4. Mostrar uma conferência curta, por exemplo: "Este conteúdo foi organizado em 24 unidades". Permitir aceitar o conjunto ou juntar, editar e separar unidades. Trechos ambíguos devem ser destacados para conferência. Não inventar páginas, capítulos, questões ou referências ausentes.
5. Gerar o plano conforme disponibilidade e pausas, equilibrando matérias e revisões. Evitar agendar uma unidade nova como se estivesse concluída no fim do primeiro bloco. Na conclusão do bloco, registrar se a unidade continua ou foi concluída.
6. Reservar a próxima sessão da unidade em andamento. Só iniciar a revisão de uma unidade concluída. Ajustar futuras sugestões usando o tempo efetivamente registrado, sem prometer precisão a partir do tamanho do texto.

O usuário deve poder começar com o plano sugerido, sem ter que configurar cada unidade. A conferência fica disponível para corrigir a organização e não deve exigir uma avaliação individual de dezenas de itens.

## Exemplo para Legislação e Saúde Pública

Sugestão inicial de unidades, a conferir contra o texto original:

- Constituição: artigos 196 a 200.
- História da saúde no Brasil e Reforma Sanitária.
- Concepção, princípios e diretrizes do SUS.
- Organização, descentralização e regionalização do SUS.
- Modelos de atenção e Redes de Atenção à Saúde.
- Lei 8.080/1990: organização e funcionamento do SUS.
- Lei 8.080/1990: competências e atribuições.
- Lei 8.142/1990: participação e controle social.
- Financiamento do SUS e normas relacionadas.
- APS: conceitos, princípios e atributos.
- PNAB, Estratégia Saúde da Família e equipes.
- Territorialização, cadastro e adscrição.
- Promoção, prevenção, proteção e recuperação da saúde.
- APS: coordenação do cuidado e ordenação da rede.
- Vigilância em Saúde: organização, componentes e esferas de gestão.
- Vigilância Epidemiológica: doenças transmissíveis e não transmissíveis.
- Notificação compulsória e investigação de casos e surtos.
- Monitoramento e resposta a surtos e epidemias.
- Imunização e coberturas vacinais.
- Vigilância Sanitária: riscos, fiscalização e inspeção.
- Vigilância Ambiental: água, contaminantes e agravos ambientais.
- Vigilância em Saúde do Trabalhador: riscos, proteção e notificação.
- Epidemiologia: história natural e níveis de prevenção.
- Incidência, prevalência, mortalidade e letalidade.
- Estudos epidemiológicos e avaliação de serviços e programas.
- Sistemas de Informação em Saúde: registros, análise e uso dos dados.
- Guia de Vigilância em Saúde: organizar pelos capítulos pertinentes ao programa.
- Guia de vigilância integrada de vírus respiratórios: organizar pelas seções pertinentes.

Esta lista ilustra a granularidade e não é uma nova ementa nem uma afirmação de que cada item cabe em 25 minutos. Guias e leis extensas podem precisar de outra divisão. Unidades muito pequenas podem compartilhar um bloco; uma unidade extensa pode ocupar várias sessões. Isso deve ficar visível no plano.

## Editais já utilizados

Criar uma prévia antes de aplicar a organização. Preservar os tópicos originais e suas sessões, tempo, questões e revisões. Uma sessão histórica do tópico amplo não prova a conclusão de todos os novos filhos. Não distribuir acertos ou tempo igualmente entre filhos como se isso tivesse ocorrido. Identificar esse histórico como anterior à organização e permitir que o usuário informe quais unidades já estudou.

Planos já salvos devem continuar referenciando seus itens originais. A organização passa a orientar novos blocos depois de aplicada, com controle de versão e verificação de propriedade do edital.

## Critérios de validação

- Nenhum trecho do programa desaparece sem aviso.
- Nenhum assunto passa a pertencer a outro cargo.
- A proposta não altera dados antes da aplicação.
- Reaplicar não duplica unidades nem apaga histórico.
- Revisões e progresso passam a refletir as unidades estudadas.
- O plano respeita o tempo disponível e explica o que continuar.
- Conferir os fluxos no navegador em desktop e celular, incluindo textos longos, erro da IA, proposta incompleta e ausência de unidades.
