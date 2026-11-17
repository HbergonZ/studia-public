<?php

namespace App\Services;

use RuntimeException;

final class EditalPromptBuilder
{
    private const MAX_INPUT_CHARACTERS = 500000;

    /** @return list<array{role:string,content:string}> */
    public function build(string $text): array
    {
        if (mb_strlen($text) > self::MAX_INPUT_CHARACTERS) {
            throw new RuntimeException('O edital excede o limite de análise integral. O processamento em partes ainda não está disponível.');
        }
        return [[
            'role'=>'system','content'=>implode(' ',[
                'Gere title, o nome do edital, com até 180 caracteres, usando o órgão ou instituição e o número e ano quando constarem no documento. Inclua o cargo somente se o edital for exclusivo dele. Não invente informações; use null se não for possível identificar o nome.',
                'Você extrai conteúdo de estudo de editais brasileiros com fidelidade documental. O formato varia e o conteúdo pode estar no corpo, em tabelas, em qualquer anexo ou em blocos por cargo. Classifique pela função e pelo escopo, nunca pelo número do anexo.',
                'Primeiro identifique o método de seleção e confirme se existe conteúdo programático de prova de conhecimentos. Se a seleção ocorrer exclusivamente por títulos, experiência profissional, avaliação curricular ou entrevista sem prova de conhecimentos, retorne has_study_syllabus=false, options=[], groups=[] e um warning fundamentado no item ou página do documento. Não transforme áreas de formação, atribuições, requisitos, cursos pontuáveis, certificações ou prova de títulos em disciplinas ou tópicos. A ocorrência isolada da palavra prova ou de nomes de áreas não demonstra a existência de prova de conhecimentos. Se houver prova de conhecimentos acompanhada de avaliação de títulos, preserve seu conteúdo programático normalmente.',
                'Ausência de conteúdo programático não significa extração incompleta: retorne extraction_complete=true quando a análise do documento completo confirmar essa ausência. Retorne has_study_syllabus=false e listas vazias também quando não houver programa estudável, explicando em warnings; se o programa estiver ausente por páginas faltantes ou ilegíveis, marque extraction_complete=false. Não transforme remuneração ou cronograma em conteúdo.',
                'Identifique options, as escolhas que alteram o conteúdo estudado, como cargo, emprego, perfil, especialidade, área, ênfase, nível ou código. Disciplina e eixo temático não são options quando todos os candidatos os estudam.',
                'Identifique content_groups como blocos com o mesmo escopo. General é conteúdo comum a todas ou a um conjunto explícito de options. General não significa necessariamente todos os cargos. Specific é conteúdo ligado a uma ou mais options. Use uncertain e warning quando não houver evidência suficiente.',
                'Use applies_to_all=true nos conhecimentos gerais realmente comuns a todas as options. Para todo bloco com applies_to_all=false, applicability deve conter ao menos uma option_ref válida. Nunca deixe ambos false e vazio. Não duplique blocos compartilhados.',
                'Extraia disciplinas em subjects e preserve cada tópico e subtópico, numeração, texto e ordem, sem resumir, combinar, corrigir ou inventar. Quando não houver disciplina explícita, use o rótulo mais específico do bloco.',
                'Peso deve ser null quando ausente. Pesos de aplicabilidade pertencem à relação entre option e grupo, não à disciplina. Preserve códigos e nomes oficiais.',
                'Antes de responder, confira referências, cobertura das options, blocos compartilhados e término da entrada. Marque extraction_complete=false se houver trecho ausente, final abrupto ou ambiguidade crítica. Responda somente com JSON conforme o schema.',
            ])
        ],[
            'role'=>'user','content'=>"Documento completo com marcadores de página:\n\n".$text
        ]];
    }
}
