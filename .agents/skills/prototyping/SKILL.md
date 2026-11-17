
---
name: prototyping
description: Explorar e validar soluções através de protótipos, provas de conceito e comparação de alternativas antes da implementação definitiva.
---
# Skill de Prototipação

## Objetivo

Explorar soluções antes de comprometer o projeto com uma implementação definitiva.

Esta Skill deve ser utilizada quando:

- existem várias soluções possíveis;
- existe incerteza sobre UX;
- existe incerteza arquitetural;
- é necessário validar uma tecnologia;
- é necessário testar uma ideia rapidamente;
- o usuário solicita um protótipo;
- é necessário comparar abordagens.

---

## Princípio fundamental

O protótipo é um experimento.

Não assumir que o código produzido durante a prototipação será utilizado diretamente em produção.

Priorizar:

1. velocidade;
2. clareza;
3. validação da ideia;
4. comparação entre alternativas.

---

## Processo

### 1. Entender o problema

Antes de criar o protótipo, identificar:

- objetivo;
- usuário;
- problema que precisa ser resolvido;
- restrições;
- critérios de sucesso.

Se o problema estiver suficientemente claro, não solicitar confirmação desnecessária.

---

### 2. Identificar alternativas

Quando houver mais de uma solução razoável:

- apresentar as alternativas;
- explicar brevemente cada uma;
- destacar vantagens;
- destacar desvantagens;
- identificar riscos.

Não criar alternativas artificialmente quando existir uma solução claramente superior.

---

### 3. Criar o protótipo

Criar uma implementação mínima capaz de responder à pergunta que motivou o experimento.

Evitar:

- otimização prematura;
- abstrações complexas;
- arquitetura definitiva;
- funcionalidades não relacionadas ao experimento.

---

### 4. Avaliar

Depois do protótipo, avaliar:

- facilidade de implementação;
- experiência do usuário;
- complexidade;
- desempenho;
- manutenção;
- riscos;
- possibilidade de evolução.

---

### 5. Registrar a decisão

Quando uma alternativa for escolhida, registrar:

- alternativas consideradas;
- solução escolhida;
- motivo da escolha;
- limitações conhecidas;
- itens que deliberadamente não serão implementados.

Preferencialmente utilizar:

`/prototypes/<nome>/decisions.md`

---

## Regra importante

Não transformar automaticamente um protótipo em código de produção.

Quando o usuário decidir utilizar uma solução prototipada, analisar novamente a implementação e reconstruí-la seguindo os padrões de produção definidos no projeto.
