# Contas criadas pelo administrador

O cadastro público permanece desabilitado. Administradores criam usuários comuns
por e-mail. Usamos os grupos e o campo `force_reset` do Shield, em vez de criar
tabelas ou outro mecanismo de autenticação.

O servidor gera uma senha aleatória com `random_bytes`, armazena apenas seu hash
e retorna uma mensagem de convite uma única vez, sem envio automático. A resposta
não pode ser armazenada em cache. A interface mantém a mensagem apenas em memória.

O primeiro login cria a sessão, mas o filtro da API restringe o usuário até a
troca de senha. Apenas consultar o próprio perfil, trocar a senha e sair ficam
disponíveis. A troca exige a senha atual, confirma a nova senha e aplica as
validações do Shield. As operações de criação e troca usam CSRF de sessão.

Não ofereceremos cadastro aberto nem escolha de grupo pela requisição. A conta
administradora existente recebe o grupo admin por uma operação local, sem migração com
e-mail pessoal ou credenciais fixas. Contas de teste são temporárias e removidas
após a validação do fluxo.
