# Gerenciamento de editais

A página Editais lista os cadastros do usuário. Cada importação cria um cadastro independente, com nome próprio, sem substituir o conteúdo de outro edital.

## Decisão

Manter o modelo de estados existente, no qual `confirmed` identifica o único edital ativo por usuário. A alternativa de adicionar um segundo campo de seleção exigiria sincronizar duas fontes para a mesma informação. O índice único existente continua garantindo essa restrição.

- Ativar valida o conteúdo e deixa o edital anteriormente ativo como `inactive`.
- Finalizar usa o novo estado `completed`, preserva conteúdo e sessões e permite reativação.
- Excluir usa a exclusão lógica já configurada no modelo. O cadastro deixa de estar disponível na aplicação, sem apagar fisicamente os dados.
- Revisar um edital pelo seu identificador não o torna ativo.
- O dashboard e o cronograma usam somente o edital ativo. As sessões exibidas pertencem ao edital carregado.
- Todas as ações verificam a propriedade do cadastro. Editais excluídos não permitem novas sessões nem alterações no catálogo.

## Verificação

Com os serviços Docker ativos e as migrações aplicadas, executar na raiz:

```sh
node server/tests/api/editais.mjs
```

O teste cria duas contas temporárias, verifica o ciclo dos editais e a separação entre usuários e remove as contas criadas ao terminar. Requer Node com `fetch` e acesso ao serviço PostgreSQL do Compose.

O teste `node server/tests/api/editais-browser.mjs` verifica o cadastro manual, a revisão, a ativação e a finalização na interface, além da largura da página em desktop e celular. Requer um navegador Chromium de teste com perfil temporário, uma aba `about:blank` e depuração remota na porta 9223. Ele cria e remove sua própria conta temporária e fecha o navegador de teste ao terminar.
