# ADR 0001: arquitetura inicial do Studia

- Status: aceita
- Data: 2026-08-29

## Contexto

O sistema precisa preservar o protótipo React existente, usar CodeIgniter 4 com Shield, armazenar dados no PostgreSQL e oferecer integração com um provedor de IA configurado no servidor. As portas `8080` e `8090` já são usadas por outros projetos. A configuração deve permitir uma troca posterior para `8080` sem alterar código.

## Alternativas consideradas

1. Executar PHP, Node e PostgreSQL diretamente no computador. É simples durante o desenvolvimento, mas depende de extensões e versões instaladas localmente. O PHP atual, por exemplo, não possui `pdo_pgsql`.
2. Usar o servidor do Vite e o servidor embutido do CodeIgniter em portas separadas. Favorece atualização automática do frontend, mas expõe duas entradas e exige configuração adicional de CORS.
3. Usar Docker Compose com Nginx, PHP-FPM e PostgreSQL. Mantém versões reproduzíveis e oferece uma única entrada pública para frontend e API.

## Decisão

Será usada a terceira alternativa. O Nginx entrega o frontend compilado e encaminha `/api` ao CodeIgniter por PHP-FPM. O PostgreSQL permanece acessível aos demais serviços como `postgres:5432`.

A porta pública inicial da aplicação é `8088` e a porta do banco no computador é `5433`. As duas são variáveis do `.env`. A análise de editais usa a OpenRouter com o modelo configurável `minimax/minimax-m3:free`. A chave é recebida por variável de ambiente e nunca deve ser adicionada ao repositório.

## Consequências

- O ambiente requer Docker, mas não depende das extensões do PHP instalado no computador.
- Uma alteração de porta exige apenas editar `.env` e recriar o serviço.
- O backend deve declarar suas rotas públicas sob o prefixo `/api`.
- O frontend é recompilado ao construir a imagem `web`; alterações nele exigem novo `docker compose up --build`.
- Credenciais locais ficam fora do controle de versão.
