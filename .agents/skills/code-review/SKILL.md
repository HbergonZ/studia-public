
---
name: code-review
description: Revisar alterações de código procurando bugs, problemas de segurança, regressões, problemas de arquitetura e oportunidades de melhoria.
---
# Skill de Code Review

## Objetivo

Avaliar alterações antes que sejam consideradas concluídas.

---

## Verificar

### Correção

- O comportamento implementado corresponde ao requisito?
- Existem casos não tratados?
- Existem condições de corrida?
- Existem erros silenciosos?

### Segurança

- Entradas são validadas?
- Existe risco de injeção?
- Existe exposição indevida de dados?
- Autenticação e autorização estão corretas?
- Segredos foram expostos?

### Arquitetura

- A alteração respeita a arquitetura?
- Responsabilidades estão bem distribuídas?
- Foram introduzidas abstrações desnecessárias?

### Manutenção

- O código é compreensível?
- Existe duplicação?
- Os nomes são adequados?
- A solução é simples?

### Testes

- Existem testes suficientes?
- Os testes cobrem os principais cenários?
- Testes existentes continuam funcionando?

---

## Resultado

Classificar os problemas encontrados por prioridade:

- Crítico
- Alto
- Médio
- Baixo

Explicar cada problema e sugerir uma correção objetiva.
