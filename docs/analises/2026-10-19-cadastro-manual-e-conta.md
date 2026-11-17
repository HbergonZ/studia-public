# Cadastro manual e fechamento da conta

## Alterações

- [x] Cadastro em quatro etapas: nome, matérias, tópicos e conferência.
- [x] Acesso por Editais > Cadastrar manualmente e pela página de envio de PDF.
- [x] Compatibilidade com o atalho anterior `editais/novo?manual=1`.
- [x] Salvamento do rascunho no servidor e ação Continuar cadastro na lista de editais.
- [x] Inclusão e remoção de matérias e tópicos durante o cadastro.
- [x] Bloqueio do avanço sem matérias, sem tópicos em alguma matéria ou com texto ainda não adicionado.
- [x] Ativação explícita após conferência, seguida da configuração da rotina.
- [x] Minha conta fecha pelo acionador, pelo botão Fechar minha conta, por Escape e por clique fora.
- [x] Fechamento da conta ao navegar para outra página.

## Decisão

Reutilizados os endpoints de catálogo e ativação existentes. O cadastro manual cria um rascunho e salva cada inclusão ou remoção, sem depender de PDF, IA ou nova estrutura no banco. O edital ativo só muda na confirmação final. Textos digitados que ainda não foram adicionados não persistem ao sair da página, conforme aviso na interface.

O painel Minha conta continua usando `details`, com fechamento explícito e tratamento de eventos. Uma regra de CSS agora garante que seu conteúdo fique oculto quando o elemento não tem o atributo `open`.

## Verificação

O teste `server/tests/api/manual-account-browser.mjs` usa conta temporária e navegador real. Exercita o cadastro, adição e remoção de conteúdo, retomada pela lista, validação das etapas, ativação e redirecionamento para rotina. Testa quatro formas de fechar a conta em 1440, 390 e 320 pixels. Confere ausência de transbordamento horizontal e erros JavaScript. Capturas locais ficam em `server/writable/testing/layout-qa/manual-*`.

Não foram adicionadas dependências nem alterados os contratos da API.

Compilação de produção aprovada. Regressão PHP: 128 testes e 372 verificações aprovados. A imagem final passou no teste de navegador e foi publicada nos serviços web e Tailscale. Rota e arquivos estáticos retornaram HTTP 200 após publicação. Conta e servidor temporários dos testes removidos.
