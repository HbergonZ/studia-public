# Editais sem conteúdo programático

## Diagnóstico

O arquivo `exemplos_editais/edital4.pdf` é o edital NAV Brasil nº 1/2025, com 64 páginas e 22 cargos. A extração local com `pdftotext -layout` produz 290.806 caracteres. O item 1.3, na página 1, define seleção por títulos e experiência profissional. A seção 9, na página 19, detalha essa avaliação; o item 10.1, na página 22, determina que ela compõe a nota final. O Anexo II, a partir da página 26, apresenta tabelas de pontuação curricular.

Não existe conteúdo programático de prova de conhecimentos nesse documento. Áreas de formação, cursos e certificações mencionados nas tabelas não são disciplinas a estudar. Durante a investigação, uma resposta de IA transformou áreas de Direito dessas tabelas em matérias e declarou extração incompleta. Trocar modelos ou ampliar limites não corrige essa interpretação por si só.

## Alternativas

- **Documento integral e tentativas alternativas:** preserva o contexto necessário para identificar a seleção, mas aumenta custo de contexto e tempo. Precisa aceitar como conclusão válida a ausência confirmada de programa.
- **Recorte cego por palavras ou anexos:** reduz a entrada, mas pode confundir tabelas curriculares com disciplinas ou remover programas em anexos inesperados. Não adotado.
- **Mapa de intervalos seguido de extração por partes:** pode reduzir a saída de cada chamada em editais com programas extensos, mas exige validar intervalos, cobertura, escopo compartilhado e montagem. Não resolve a inexistência de programa e não será implementado para este caso.

## Decisão

Manter a análise integral e explicitar nos prompts automático e manual a identificação inicial do método de seleção. Seleções exclusivamente por títulos, experiência, avaliação curricular ou entrevista sem prova de conhecimentos devem retornar `has_study_syllabus=false`, `options=[]`, `groups=[]` e uma explicação fundamentada em item ou página. A expressão “prova de títulos” ou nomes de áreas, isoladamente, não demonstram prova de conhecimentos.

Uma conclusão confirmada após analisar o documento completo usa `extraction_complete=true`, mesmo sem programa. Páginas faltantes ou ilegíveis e ambiguidade crítica continuam exigindo `false`. Havendo prova de conhecimentos junto com títulos, seu programa deve ser preservado normalmente.

A aplicação deve comunicar a ausência de programa sem inventar matérias e sem gastar novas tentativas por essa conclusão. Isso não autoriza converter automaticamente requisitos curriculares em plano de estudos. A fidelidade semântica continua dependendo da análise do documento; testes dos prompts apenas verificam que essas instruções não foram removidas.

## Leitura e verificação real

No Docker sobre Windows, `pdftotext` lendo o PDF enviado diretamente no volume compartilhado excedeu 30 segundos. A mesma cópia no disco temporário do contêiner foi lida em aproximadamente 1,5 segundo. A extração agora faz uma cópia temporária local, preserva o original e remove a cópia em `finally`, inclusive em caso de falha. O limite de leitura continua em 30 segundos, com mensagem específica para timeout.

O teste `prototypes/edital4/import-api.mjs` passou com upload real: o primeiro modelo devolveu uma estrutura contraditória e foi rejeitado em 15,1 segundos; `nvidia/nemotron-3-super-120b-a12b:free` concluiu em 8,7 segundos. Foram verificados título NAV Brasil salvo, ausência de matérias, indicador de ausência de programa e bloqueio de ativação sem conteúdo. Tempos e disponibilidade variam conforme o provedor. A conta temporária foi removida ao final.
