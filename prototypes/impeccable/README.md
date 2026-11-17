# Mockups Studia com Impeccable

Comparação do fluxo completo em três propostas: Estúdio, Rotina e Agenda.
Abra `studia-mockups.html` no navegador, inclusive diretamente pelo arquivo.
Ele reúne código, dados e fontes em um único HTML. `dist/index.html` é a versão
separada por arquivos. A proposta Agenda, selecionada pelo usuário, abre por padrão.

Os controles de cargo, busca, navegação, duração, cronômetro e registro de estudo
funcionam como demonstração local. Não acessam a API, não alteram dados do Studia e
não enviam respostas a serviços externos. O protótipo mantém seu estado apenas
enquanto a página estiver aberta. Os dados de atividade e desempenho são ilustrativos.

Os cargos e as matérias vêm do JSON de teste de Porto Velho. As unidades permanecem
ligadas aos cargos e à escolaridade, com rolagem dentro dos cards. O quadro de
revisões demonstra estados calculados, sem arraste que invente datas de revisão.

Para servir por HTTP:

```powershell
python -m http.server 8093 --bind 127.0.0.1 --directory prototypes/impeccable/dist
```

Abra http://localhost:8093. Use `?layout=estudio`, `?layout=rotina` ou `?layout=agenda`.
As três telas são Hoje, Meu edital e Planejamento. A entrada abre em Hoje, com um
cargo de demonstração já selecionado. Meu edital permite testar toda a escolha.

A skill aplicada é [Impeccable](https://github.com/pbakaus/impeccable), instalada
na pasta local de skills do Codex. O plano e os limites estão em BRIEF.md.
A versão publicada do Studia não foi modificada por este experimento.
