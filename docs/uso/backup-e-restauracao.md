# Backup e restauração

O volume do PostgreSQL persiste os dados, mas não substitui backup. Antes de uma migração, criar uma cópia no formato custom do `pg_dump`. Os comandos abaixo são para PowerShell, na raiz do projeto, com Docker disponível.

## Criar cópia

```powershell
New-Item -ItemType Directory -Force server/writable/backups | Out-Null
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/studia-backup.dump'
docker compose cp postgres:/tmp/studia-backup.dump server/writable/backups/studia-backup.dump
Get-FileHash -Algorithm SHA256 server/writable/backups/studia-backup.dump
```

Usar um nome com data para cada cópia e verificar o código de saída de cada comando. O dump contém dados privados: não enviar para Git, mensagens ou armazenamento público. Para cobrir falha da máquina, o responsável pela operação precisa manter uma cópia em armazenamento separado com acesso restrito. Uma cópia no mesmo disco só protege contra falhas lógicas da aplicação.

Além do banco, preservar `server/writable/uploads` e as configurações de implantação em local restrito. Não imprimir nem publicar chaves, senhas ou arquivos de ambiente. Credenciais e arquivos de sessão não devem fazer parte de artefatos de teste compartilhados.

## Ensaiar restauração

Restaurar primeiro em um banco novo, sem substituir o banco usado pela aplicação:

```powershell
docker compose cp server/writable/backups/studia-backup.dump postgres:/tmp/studia-restore-check.dump
docker compose exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" studia_restore_check'
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d studia_restore_check --exit-on-error /tmp/studia-restore-check.dump'
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d studia_restore_check -c "SELECT count(*) FROM study_sessions"'
```

Se o banco de ensaio já existir, escolher outro nome. Não sobrescrever um banco para fazer o teste. Conferir tabelas, contagens e uma conta fictícia em ambiente isolado; registrar data, versão do aplicativo, duração e resultado. Uma restauração real exige janela de manutenção e aprovação para substituir os dados em uso.

## Operação

- Fazer backup antes de migrações e definir uma rotina diária conforme o volume de uso.
- Manter versões suficientes para recuperar um erro descoberto dias depois. Uma política inicial a revisar com a operação é 7 cópias diárias e 4 semanais em armazenamento separado.
- Ensaiar a restauração periodicamente e após mudanças relevantes de esquema.
- Acompanhar espaço livre, falha do backup, saúde do PHP e PostgreSQL e erros de gravação/importação.
- Nenhuma rotina automática de cópia externa, retenção ou exclusão foi ativada sem um destino definido pelo responsável.

Na entrega de 17/10/2026, foi criado `2026-10-17-before-improvements.dump` e restaurado em `studia_restore_check_20261017`. O ensaio não modificou o banco em uso.
