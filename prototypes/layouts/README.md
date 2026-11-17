# Protótipo de layouts

Três direções visuais com os mesmos dados fictícios:

- Biblioteca: índice de estudos com navegação lateral.
- Agenda: semana de estudos com grade de horários.
- Mesa de estudo: sessão de foco e fila de assuntos.

A Mesa é a opção inicial após a avaliação do usuário. Inclui mapa de atividade
anual, calendário com visão mensal/anual, metas da semana e quadro de revisões
com as quatro categorias existentes. É possível selecionar um dia de atividade,
filtrar o quadro por matéria e registrar uma sessão de demonstração.

Arquivos prontos em `dist/`, sem build ou instalação de dependências.
Para abrir sem servidor, use `studia-layouts.html`, que reúne as três opções
em um único arquivo. `dist/comparar.html` mostra as propostas lado a lado.
Também é possível abrir `dist/index.html` diretamente. As fontes usam Google
Fonts com alternativas locais. O cronômetro, os filtros, os diálogos e a
criação de convite são demonstrações no navegador, sem chamadas à API.

Para servir localmente:

```powershell
python -m http.server 8091 --bind 127.0.0.1 --directory prototypes/layouts/dist
```

Abra <http://localhost:8091>. Parâmetros `layout=biblioteca`, `layout=agenda`
e `layout=mesa` selecionam a proposta; `tela=editais`, `tela=topicos`,
`tela=usuarios` e `tela=configurar` selecionam a página.

O plano visual, as referências e os limites estão em [DESIGN.md](DESIGN.md).
Este experimento não escolhe um layout definitivo nem altera o site publicado.

Skills pesquisadas: [frontend-design, da Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
e [Impeccable](https://github.com/pbakaus/impeccable). A primeira foi aplicada.
Ela foi instalada na pasta local de skills do Codex e fica
disponível para reutilização nos próximos turnos.

`review.mjs` verifica as telas no navegador e salva capturas em `dist/previews/`.
`python prototypes/layouts/package.py` atualiza o HTML único e o ZIP após uma
alteração. As fontes são opcionais: sem internet, o navegador usa fontes locais.
