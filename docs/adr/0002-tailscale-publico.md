# Acesso público com nome próprio no Tailscale

O Studia precisa de uma URL pública HTTPS sem porta, independente de outros serviços já publicados na mesma máquina.

Usar outra porta no dispositivo existente mantém o acesso público, mas exige
informar a porta na URL. Um Tailscale Service fornece um nome privado e não
atende ao requisito de acesso sem o aplicativo Tailscale.

A solução usa um contêiner Tailscale dedicado, com identidade `studia` e Funnel
na porta 443. O contêiner compartilha a rede do serviço web e encaminha para
`127.0.0.1:80`. O estado de autenticação fica em um volume Docker, sem chaves
no repositório. Não são necessárias capacidades privilegiadas ou acesso ao TUN.

Inicialização:

```powershell
docker compose -f compose.yaml -f compose.tailscale.yaml up -d tailscale
docker compose -f compose.yaml -f compose.tailscale.yaml exec tailscale tailscale up --hostname=studia
docker compose -f compose.yaml -f compose.tailscale.yaml exec tailscale tailscale funnel --bg 80
```

A autenticação e a autorização de Funnel exigem a conta administradora.
O nome `studia` deve estar livre, inclusive de Services antigos. Após confirmar
o nome atribuído, configurar `APP_BASE_URL` no `.env` com a URL pública e
recriar apenas o serviço PHP. Validar o acesso por um serviço externo antes
de remover qualquer encaminhamento anterior.

Ao recriar o contêiner web, recriar também o contêiner Tailscale para que ambos
compartilhem a mesma rede novamente. Usar os dois arquivos Compose nas
operações que envolvem esse acesso público.
