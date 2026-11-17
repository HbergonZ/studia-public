# Studia

Aplicação para organizar estudos para concursos. Você envia o PDF do edital, a IA extrai cargos, matérias e tópicos, você revisa o resultado e o sistema monta um cronograma com revisões espaçadas, que se ajusta conforme o desempenho em questões.

## Funcionalidades

- **Importação de edital com IA**: leitura do PDF pelo Gemini, com tentativa automática em modelos gratuitos do OpenRouter quando a primeira falha. Cada tentativa é validada e registrada, e o resultado sempre passa por uma tela de revisão antes de virar plano de estudos.
- **Cronograma com revisões espaçadas**: intervalos fixos inspirados na curva de Ebbinghaus (1, 7, 16, 35 e 90 dias). O nível inicial em cada tópico define onde ele entra na sequência, e o desempenho em questões adianta ou atrasa as próximas revisões.
- **Prioridade do dia**: quando o tempo não dá para tudo, primeiro vêm as revisões atrasadas, depois as do dia e por último o conteúdo novo, ordenado pelo peso da matéria no edital.
- **Painel**: o que estudar hoje, calendário, metas, gráfico da semana e progresso por matéria.
- **Pomodoro** integrado e registro de sessões de estudo.
- **Vários editais** por conta: um fica ativo por vez, e os outros podem ser finalizados e reativados depois.

A regra de negócio completa está em [docs/planejamento.md](docs/planejamento.md), e as decisões técnicas, em [docs/adr](docs/adr) e [docs/decisions](docs/decisions).

## Tecnologias

- Frontend: React 19, TypeScript, Vite e Tailwind CSS
- API: PHP com CodeIgniter 4 e Shield (autenticação)
- Banco: PostgreSQL
- IA: Google Gemini e OpenRouter
- Infra: Docker Compose (Nginx, PHP-FPM e PostgreSQL)

## Requisitos

- Docker Desktop com Docker Compose
- Portas `8088` e `5433` livres, ou outras definidas no `.env`

## Início rápido

No PowerShell:

```powershell
.\scripts\start.ps1
```

No Linux ou macOS:

```sh
sh scripts/start.sh
```

Na primeira execução, o script copia `.env.example` para `.env`. A aplicação fica disponível em <http://localhost:8088>. O PostgreSQL fica acessível no computador pela porta `5433` e, entre os contêineres, pelo endereço `postgres:5432`.

Para analisar editais com IA, preencha `GEMINI_API` e/ou `OPENROUTER_API_KEY` no `.env`. O arquivo é ignorado pelo Git e não deve ser versionado. Quando `GEMINI_API` estiver preenchida, o Gemini é a primeira tentativa. Se falhar, a importação consulta o catálogo do OpenRouter e tenta modelos gratuitos compatíveis até obter uma resposta aprovada pela validação ou atingir os limites.

`GEMINI_MODEL` escolhe o modelo direto do Google (padrão: `gemini-3.6-flash`, com nível gratuito). A disponibilidade e as cotas dependem do projeto no Google AI Studio. A API direta não oferece o filtro de preço máximo zero do OpenRouter; uma chave de projeto com cobrança ativa segue a tabela de preços do Google. A aplicação não habilita cobrança nem muda o plano da conta.

### Limites de importação com IA

```dotenv
OPENROUTER_TOTAL_TIMEOUT_SECONDS=300
OPENROUTER_ATTEMPT_TIMEOUT_SECONDS=90
OPENROUTER_MAX_ATTEMPTS=4
OPENROUTER_FALLBACK_MODELS=
```

`OPENROUTER_MODEL` é a primeira preferência dentro do OpenRouter, se estiver disponível, gratuito e compatível com o documento. `OPENROUTER_FALLBACK_MODELS` aceita outros IDs separados por vírgula; depois dessas preferências, o sistema usa o catálogo atual. Modelos pagos do OpenRouter são excluídos mesmo quando configurados. Os limites acima são compartilhados pelos dois provedores: o Gemini consome uma tentativa, e o prazo não reinicia ao passar para o OpenRouter. O prazo total inclui a consulta ao catálogo, esperas, chamadas e validação, e tem teto de 540 segundos para respeitar o tempo do servidor web. O timeout de cada chamada nunca ultrapassa o prazo restante.

`OPENROUTER_MAX_TOKENS` limita a resposta, respeitando também o contexto e o limite de saída de cada modelo. Nenhum texto do edital é cortado para caber. Se nenhum modelo for elegível, a importação explica o motivo. Problemas com a chave e cotas sem previsão de liberação dentro do prazo encerram as tentativas. Uma espera indicada pelo provedor só é aceita se couber no prazo restante e não ultrapassar 30 segundos; trocar de modelo não contorna a cota gratuita da conta.

A aprovação verifica a estrutura e sinais de incompletude, mas não garante a fidelidade integral ao PDF. Revise o resultado antes de ativar o edital. As tentativas ficam registradas em `extraction_runs`, com modelo, duração e motivo da falha.

Editais exclusivamente de títulos ou experiência profissional podem não ter conteúdo programático de prova. Nesse caso, uma análise completa salva o nome e informa a ausência de matérias, sem criar um plano de estudos artificial. O exemplo `exemplos_editais/edital4.pdf` é desse tipo.

O teste real opcional `node prototypes/edital4/import-api.mjs` envia esse PDF pela API, verifica o resultado e remove a conta de teste. Ele exige os contêineres ativos e consome a cota gratuita da chave configurada.

Após alterar essas variáveis, aplique-as com `docker compose up -d --no-deps php`. Os padrões já funcionam sem acrescentá-las ao `.env` existente.

O contêiner instala as dependências PHP e executa as migrações ao iniciar. Se `APP_ENCRYPTION_KEY` estiver vazio, ele cria uma chave temporária. Para manter sessões e dados criptografados válidos após reinicializações, defina uma chave permanente no `.env`, por exemplo com `php -r "echo 'hex2bin:'.bin2hex(random_bytes(32));"`.

## Portas

As portas expostas são configuradas no `.env`:

```dotenv
APP_PORT=8088
POSTGRES_PORT=5433
APP_BASE_URL=http://localhost:8088
```

Quando a porta `8080` estiver livre, altere `APP_PORT` e `APP_BASE_URL` e recrie os contêineres:

```powershell
docker compose up -d --force-recreate
```

## Acesso público pelo Tailscale (opcional)

O arquivo `compose.tailscale.yaml` adiciona um contêiner Tailscale que publica o app com Funnel, em um endereço HTTPS sem precisar instalar o Tailscale em quem acessa. A autenticação fica persistida em um volume Docker, sem chaves no repositório.

```powershell
docker compose -f compose.yaml -f compose.tailscale.yaml up -d
```

Ao recriar o serviço `web`, recrie também `tailscale`, pois eles compartilham a
rede. Para configurar uma instalação nova, consulte
[a decisão sobre o acesso público](docs/adr/0002-tailscale-publico.md).

## Comandos úteis

```powershell
# Estado dos serviços
docker compose ps

# Logs
docker compose logs -f

# Testes do backend
docker compose exec php composer test

# Migrações
docker compose exec php php spark migrate

# Encerrar sem apagar o banco
.\scripts\stop.ps1
```

Para também remover os dados locais do PostgreSQL, execute `docker compose down --volumes`. Esse comando apaga o banco deste projeto.

## Estrutura

- `app/`: frontend React e Vite
- `server/`: API CodeIgniter 4 e Shield
- `docker/`: imagens e configuração dos serviços
- `docs/adr/`: decisões arquiteturais
- `scripts/`: comandos curtos de inicialização e encerramento

O Nginx entrega o frontend e encaminha requisições iniciadas por `/api` para o CodeIgniter.

## Licença

[MIT](LICENSE)
