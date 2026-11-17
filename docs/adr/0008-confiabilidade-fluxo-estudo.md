# ADR 0008: confiabilidade do fluxo de estudo

Data: 17/10/2026. Decisão: implementar as melhorias M01 a M27 autorizadas pelo responsável pelo produto.

## Alternativas e decisões

- Remoção: arquivamento exigiria novos estados e migração. Nesta entrega, conteúdo com sessões, unidades estudadas ou referências em planos não pode ser excluído fisicamente. Conteúdo sem vínculos pode ser removido após confirmação. Reextração de edital com conteúdo é proibida no servidor.
- Edição: confirmar campos de texto ao sair do campo e serializar mutações, com feedback e retry. A rotina usa rascunho separado e uma confirmação explícita; não altera a home antes de salvar.
- Pesos: manter o peso do cargo como padrão e permitir preferência pessoal explícita por matéria, identificada como ajuste do usuário. A escala efetiva permanece 0 a 100; o usuário pode restaurar o padrão do edital.
- Revisões: preservar o equilíbrio existente de até duas revisões para um conteúdo novo e explicar a escolha. Adiar retira o bloco do dia, sem prometer uma data futura.
- Cronômetro: checkpoint local limitado por usuário, edital e bloco, com recuperação ou descarte explícitos. Não criar sessão no servidor sem confirmação. Dados de outra conta nunca são carregados no cronômetro.
- Histórico: distinguir primeiro contato, conclusão e continuação. Preservar registros antigos nas origens após organização. Retificação deve preservar a identidade do registro, recalcular a curva cronologicamente e atualizar o bloco vinculado em transação.
- Acesso: redefinição administrada de credenciais temporárias, sem mensagens automáticas nem dependência de serviço de e-mail. Invalidar sessões anteriores após redefinição.
- Importação: conservar o edital criado para retry e continuar com requisição síncrona limitada, sem adicionar fila de tarefas. Processamento interrompido deve ser reconhecível e retomável.
- Datas: o fuso do perfil define o dia de estudo. Atualizar o dia ao retornar à aba e na virada; uma sessão iniciada conserva sua data até ser registrada.
- Desempenho: agregações do dashboard em lote, paginação da biblioteca e divisão das páginas no bundle. Não adicionar dependências ou cache de dados pessoais.

## Validação

Usar contas temporárias, simulação dos provedores de IA, testes PHP, testes da API e navegador em desktop e celular. Fazer backup antes das alterações e ensaiar restauração em banco isolado. Registrar evidências e limitações no relatório de melhorias. Não sobrescrever dados pessoais nem restaurar backup sobre o banco em uso.
