
---
name: testing
description: Criar, executar e analisar testes automatizados para validar funcionalidades e evitar regressões.
---
# Skill de Testes

## Objetivo

Garantir que alterações funcionem conforme esperado e não introduzam regressões.

---

## Processo

1. Identificar o comportamento esperado.
2. Identificar casos normais.
3. Identificar casos extremos.
4. Identificar casos inválidos.
5. Criar ou atualizar testes.
6. Executar os testes relevantes.
7. Analisar falhas.
8. Corrigir a causa do problema.

---

## Regras

Um teste que falha não deve ser simplesmente removido ou alterado para esconder o problema.

Quando um teste existente precisar ser alterado:

- entender por que ele falhou;
- verificar se o comportamento mudou intencionalmente;
- atualizar o teste somente quando o novo comportamento estiver correto.

---

## Cobertura

Priorizar testes para:

- regras de negócio;
- operações críticas;
- autenticação;
- autorização;
- validações;
- integrações;
- funcionalidades com histórico de bugs.
