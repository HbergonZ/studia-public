# Instruções do projeto

## 1. Objetivo

Este projeto deve ser desenvolvido de forma incremental, priorizando:

- clareza;
- simplicidade;
- manutenibilidade;
- testabilidade;
- segurança;
- baixo acoplamento;
- decisões técnicas justificadas.

Não implementar complexidade antecipadamente.

---

## 2. Processo de desenvolvimento

O desenvolvimento deve seguir, sempre que a tarefa justificar:

1. Entender o problema.
2. Explorar possíveis soluções.
3. Criar protótipos ou provas de conceito quando houver incerteza.
4. Comparar as alternativas.
5. Registrar a decisão.
6. Implementar a solução escolhida.
7. Testar.
8. Revisar.

Não assumir automaticamente que a primeira solução encontrada é a melhor.

Quando houver múltiplas soluções tecnicamente razoáveis, apresentar as alternativas antes de implementar uma solução estruturalmente importante.

---

## 3. Prototipação

Protótipos devem ser tratados como experimentos.

Um protótipo:

- pode conter código descartável;
- não precisa seguir todos os padrões da aplicação;
- deve priorizar velocidade de experimentação;
- não deve ser considerado código de produção automaticamente.

Protótipos devem ficar dentro de:

`/prototypes`

Quando uma decisão for tomada a partir de um protótipo, registrar a decisão antes da implementação definitiva.

---

## 4. Desenvolvimento

Código de produção deve:

- seguir a arquitetura definida;
- evitar duplicação;
- possuir tratamento adequado de erros;
- possuir testes quando aplicável;
- utilizar as dependências existentes antes de adicionar novas;
- evitar abstrações desnecessárias;
- preservar funcionalidades existentes.

Não substituir uma solução existente por outra sem justificar a mudança.

---

## 5. Alterações

Antes de realizar mudanças estruturais importantes:

1. analisar o código existente;
2. identificar impactos;
3. explicar a abordagem;
4. somente então implementar.

Não modificar arquivos não relacionados à tarefa.

Não remover funcionalidades existentes sem autorização explícita.

---

## 6. Dependências

Não adicionar uma nova biblioteca ou dependência sem avaliar primeiro se a funcionalidade pode ser implementada utilizando:

- recursos existentes;
- bibliotecas já instaladas;
- funcionalidades nativas da linguagem ou framework.

Quando uma nova dependência for necessária, explicar o motivo.

---

## 7. Testes

Sempre que possível:

- criar testes para novas funcionalidades;
- executar testes relacionados após alterações;
- não considerar uma implementação concluída sem verificar seu funcionamento.

Se um teste falhar, investigar a causa antes de simplesmente alterar o teste.

---

## 8. Segurança

Considerar sempre:

- validação de entrada;
- autenticação;
- autorização;
- exposição de dados;
- segredos e credenciais;
- injeção;
- manipulação de arquivos;
- controle de acesso.

Nunca colocar credenciais ou segredos diretamente no código.

---

## 9. Git

Não realizar:

- `git reset --hard`;
- `git push --force`;
- remoção indiscriminada de arquivos;
- alterações destrutivas irreversíveis

sem autorização explícita.

Antes de commits importantes, verificar as alterações realizadas.

---

## 10. Escrita

Ao produzir textos para o projeto, escrever de forma natural e evitar vícios comuns de textos gerados por IA.

### Regras

- Não usar travessão (—) como pontuação decorativa. Usar vírgula, ponto ou parênteses no lugar.
- Não usar construções do tipo "não é sobre X, é sobre Y".
- Evitar exageros de marketing, como "revolucionário", "transformador", "libere seu potencial", "jornada", "poderoso", "elevar" e "impulsionar".
- Evitar conclusões clichês, como "em suma", "em resumo", "vale a pena notar", "no final das contas" e "é importante ressaltar".
- Escrever como uma pessoa escreveria naturalmente, evitando linguagem artificial, genérica ou excessivamente promocional.
- Priorizar clareza e objetividade.
- Evitar frases excessivamente longas quando uma construção mais simples for possível.
- Não adicionar linguagem promocional ou adjetivos desnecessários.
- Não utilizar termos técnicos apenas para tornar o texto mais sofisticado.

---

## 11. Comunicação

Se houver uma decisão arquitetural ou de negócio que não esteja clara:

- não inventar requisitos;
- apresentar a dúvida;
- propor alternativas;
- aguardar decisão quando ela for necessária.

Para tarefas simples e bem especificadas, não solicitar confirmação desnecessariamente.

Ao identificar um problema ou risco relevante, informar o usuário antes de realizar uma alteração que possa causar impacto.

---

## 12. Uso de Skills

Skills fornecem procedimentos especializados para determinados tipos de tarefa.

Quando uma Skill estiver disponível e for relevante para a tarefa:

- utilizá-la;
- seguir suas instruções;
- combinar suas instruções com as regras deste arquivo.

Não criar uma nova Skill para uma tarefa pontual quando uma instrução no `AGENTS.md` ou uma Skill existente for suficiente.

Skills devem ser reutilizáveis e ter um objetivo claramente definido.

---

## 13. Prioridade das instruções

As instruções deste arquivo são regras gerais do projeto.

Instruções mais específicas podem existir em outros arquivos `AGENTS.md` localizados em subdiretórios do projeto.

Skills fornecem procedimentos especializados e devem ser aplicadas em conjunto com as regras gerais do projeto.

Em caso de conflito, seguir a instrução aplicável ao escopo mais específico, respeitando as instruções de nível superior e as restrições do próprio projeto.
