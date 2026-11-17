# Seleção de cargos no edital de Porto Velho

O arquivo anterior de teste abrangia somente Enfermeiro 725. Para testar a escolha
de cargo no sistema, foi preparado `prototypes/real-editais/porto-velho-todos-cargos.json`,
com os conteúdos do Anexo IV completo do PDF `ilovepdf_merged (1).pdf`.

O arquivo contém 51 opções, 60 matérias e 1.524 unidades. Os cargos com várias lotações
e um mesmo programa estão agrupados pelos intervalos de códigos do próprio anexo.
Os cargos revogados 506, 507, 508, 604 e 605 foram excluídos. Os conteúdos gerais
foram associados apenas às opções do respectivo nível de escolaridade.

A preparação foi local, sem chamada a IA externa. A divisão em unidades é um
experimento para testar a importação e não uma estimativa de tempo de conclusão.
Os pesos não foram extraídos, conforme aviso no JSON.

## Ajustes na aplicação

- Busca por nome ou código, tolerando ausência de acentos, e lista de cargos com
  rolagem interna.
- Contagem das matérias gerais e específicas aplicáveis a cada opção.
- API informa explicitamente se uma matéria se aplica a todos os cargos. A atualização
  imediata da seleção usa essa informação, em vez de considerar toda matéria geral
  como comum a todos os cargos.
- Durante o salvamento, a tela impede alterações simultâneas dos cargos e ativação
  antecipada do edital. Um texto informa a atualização, sem carregamento de página.
- O prompt passa a exigir todos os cargos vigentes, conferência de anexos e
  retificações e aplicação correta dos conteúdos gerais por escolaridade.

## Verificação

Importação feita em conta temporária. Foram comparados todos os títulos, trechos
originais e ordem das unidades com os dados armazenados. A seleção individual de
cada uma das 51 opções retornou exatamente os grupos associados no JSON.

No navegador, foram conferidas seleção e remoção de Enfermeiro, Técnico em Enfermagem
e Auxiliar de Farmácia, combinação de níveis, busca por código e por nome sem acentos.
A versão final passou em larguras de 1440, 390 e 320 pixels sem transbordamento
horizontal nem exceções JavaScript. O teste aguarda a confirmação do salvamento
antes de realizar a próxima seleção.

Compilação TypeScript/Vite aprovada. Testes PHP existentes: 94 testes, 296 asserções.
As contas temporárias e seus editais foram removidos após o ensaio. Os dados dos
usuários não foram alterados.
