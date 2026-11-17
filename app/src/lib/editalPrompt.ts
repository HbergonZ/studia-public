export const EDITAL_ANALYSIS_PROMPT = `Analise integralmente o edital em PDF anexado e extraia somente o conteúdo programático que pode compor um plano de estudos.

Responda exclusivamente com um único objeto JSON válido. Não use Markdown, crases, comentários ou texto antes/depois do JSON.

O formato dos editais varia. Faça uma análise semântica, considerando títulos, tabelas, anexos, cargos, perfis, especialidades, áreas, ênfases e códigos. Organize o resultado assim:

1. "options": opções que o candidato pode selecionar, como cargo, perfil, especialidade ou área. Não crie opções para disciplinas.
2. "groups": blocos de conteúdo programático.
3. Conhecimentos gerais/comuns devem usar "knowledge_type": "general". Se valerem para todas as opções, use "applies_to_all": true e "applicability": [].
4. Conhecimentos específicos devem usar "knowledge_type": "specific" e indicar em "applicability" exatamente para quais opções se aplicam.
5. Um grupo que não vale para todos deve ter ao menos uma aplicabilidade. Nunca deixe a aplicabilidade indefinida.
6. Dentro de cada grupo, organize disciplinas em "subjects" e preserve seus assuntos em "topics". Não resuma nem invente tópicos.
7. Use referências curtas, únicas e estáveis em "ref". Cada "option_ref" deve corresponder exatamente a uma opção existente.
8. Tipos permitidos em "kind": "job", "employment", "profile", "specialty", "area", "emphasis", "level", "code", "block" ou "other".
9. Primeiro identifique o método de seleção e confirme se existe conteúdo programático de prova de conhecimentos. Se a seleção ocorrer exclusivamente por títulos, experiência profissional, avaliação curricular ou entrevista sem prova de conhecimentos, retorne "has_study_syllabus": false, "options": [], "groups": [] e explique em "warnings", citando o item ou página que fundamenta a conclusão. Não transforme áreas de formação, atribuições, requisitos, cursos pontuáveis, certificações ou prova de títulos em disciplinas ou tópicos. A ocorrência isolada da palavra prova ou de nomes de áreas não demonstra a existência de prova de conhecimentos. Se houver prova de conhecimentos acompanhada de avaliação de títulos, preserve seu conteúdo programático normalmente. Se não houver programa estudável, retorne listas vazias e explique em "warnings".
10. Ausência de conteúdo programático não significa extração incompleta: marque "extraction_complete" como true quando a análise do documento completo confirmar essa ausência ou quando todo o conteúdo programático relevante tiver sido analisado. Se houver páginas faltantes ou ilegíveis, ambiguidade crítica ou possível truncamento, use false e descreva em "warnings".
11. Gere "title", o nome do edital, com até 180 caracteres. Use o órgão ou instituição e, quando constarem no documento, o número do edital e o ano. Use o cargo apenas quando o edital for exclusivo dele. Não invente informações. Se não for possível identificar um nome, retorne null.

Use exatamente esta estrutura:
{
  "title": "Nome do órgão - Edital nº 01/2026",
  "has_study_syllabus": true,
  "extraction_complete": true,
  "options": [{ "ref": "perfil-1", "code": "1", "name": "Nome completo da opção", "kind": "profile" }],
  "groups": [
    {
      "ref": "conhecimentos-gerais",
      "name": "Conhecimentos Gerais",
      "knowledge_type": "general",
      "applies_to_all": true,
      "applicability": [],
      "subjects": [{ "name": "Língua Portuguesa", "topics": ["Tópico completo 1", "Tópico completo 2"] }]
    },
    {
      "ref": "especificos-perfil-1",
      "name": "Conhecimentos Específicos - Nome da opção",
      "knowledge_type": "specific",
      "applies_to_all": false,
      "applicability": [{ "option_ref": "perfil-1", "weight": null }],
      "subjects": [{ "name": "Nome da disciplina específica", "topics": ["Tópico completo 1"] }]
    }
  ],
  "warnings": []
}

Antes de responder, confira silenciosamente: JSON válido; referências únicas; option_ref existente; todo grupo não global com aplicabilidade; conhecimentos gerais e específicos corretamente classificados; nenhuma seção do conteúdo programático omitida.`
