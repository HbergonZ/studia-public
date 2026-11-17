"""Prepare a scoped test import from the local merged PDF text, without an AI API.

Line ranges refer to PdfTextExtractor's output for ilovepdf_merged (1).pdf.
This experiment covers only nurse code 725, not every job in the notice.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
lines = (ROOT / 'server/writable/testing/editais-reais/merged.txt').read_text(encoding='utf-8').splitlines()


def excerpt(first, last):
    kept = []
    for line in lines[first - 1:last]:
        line = line.strip()
        if not line or line.startswith(('[[PAGE ', 'CONCURSO PÚBLICO DA SAÚDE', 'PORTO VELHO/RO - EDITAL')) or re.fullmatch(r'Página \d+ de \d+', line):
            continue
        kept.append(line)
    return ' '.join(kept)


def subject(name, first, last, anchors=None):
    source = excerpt(first, last)
    if anchors:
        starts = [source.index(anchor) for title, anchor in anchors]
        assert starts == sorted(starts) and starts[0] == 0
        units = [dict(title=title, source=source[start:end].strip()) for (title, _), start, end in zip(anchors, starts, starts[1:] + [len(source)])]
    else:
        parts = re.split(r'(?<=[.;])\s+(?=[A-ZÀ-Ý])', source)
        units = []
        for part in parts:
            title = part.rstrip('.;')
            if len(title) > 140:
                title = title.split(':', 1)[0] if ':' in title[:130] else title[:130].rsplit(' ', 1)[0] + '…'
            units.append(dict(title=title, source=part))
    assert len({u['title'].casefold() for u in units}) == len(units), name
    assert re.sub(r'\s', '', ''.join(u['source'] for u in units)) == re.sub(r'\s', '', source)
    return dict(name=name, topics=[dict(title=name, source=source, units=units)])


health = [
    ('Constituição: direito à saúde', 'Legislação e Saúde Pública:'),
    ('História, princípios e organização do SUS', 'Sistema Único de Saúde (SUS):'),
    ('Leis 8.080/1990 e 8.142/1990', 'Legislação Federal de Saúde Pública:'),
    ('Normas de organização e financiamento do SUS', 'Legislação e normas vigentes'),
    ('APS: conceitos, princípios e atributos', 'Atenção Primária à Saúde (APS):'),
    ('Atenção Básica, PNAB e Saúde da Família', 'Atenção Básica.'),
    ('Territorialização e adscrição da população', 'Territorialização.'),
    ('Promoção da saúde e coordenação do cuidado', 'Ações de promoção,'),
    ('Vigilância em Saúde: organização e componentes', 'Vigilância em Saúde: conceitos,'),
    ('Vigilância de agravos, notificação e resposta', 'Vigilância de doenças,'),
    ('Vigilância Epidemiológica: atribuições e doenças', 'Vigilância Epidemiológica: conceitos,'),
    ('Investigação de surtos, prevenção e imunização', 'Investigação de casos e surtos.'),
    ('Vigilância Sanitária: riscos e fiscalização', 'Vigilância Sanitária: conceitos,'),
    ('Vigilância Ambiental: água e contaminantes', 'Vigilância em Saúde Ambiental: conceitos'),
    ('Vigilância em Saúde do Trabalhador', 'Vigilância em Saúde do Trabalhador: conceitos'),
    ('Epidemiologia: conceitos e níveis de prevenção', 'Epidemiologia: conceitos básicos,'),
    ('Medidas de frequência e indicadores de saúde', 'Medidas de frequência e ocorrência'),
    ('Estudos epidemiológicos e avaliação de serviços', 'Tipos de estudos epidemiológicos.'),
    ('Sistemas de Informação em Saúde', 'Sistemas de Informação em Saúde: conceitos,'),
    ('Guia de Vigilância em Saúde', 'Documentos e normas técnicas do Ministério'),
    ('Guia de vigilância de vírus respiratórios', 'Guia de Vigilância Integrada da Covid-19,')
]
general = [subject('Língua Portuguesa', 4412, 4419), subject('Raciocínio Lógico', 4430, 4445), subject('Conhecimentos Gerais e Atualidades', 4448, 4457), subject('Legislação Saúde', 4460, 4501, health)]
specific = [subject('Conhecimentos Específicos de Enfermagem', 4589, 4620)]
data = dict(study_units_version=1, title='Saúde de Porto Velho/RO - Edital nº 25/2026 - Teste Enfermeiro 725', has_study_syllabus=True, extraction_complete=True,
    options=[dict(ref='enfermeiro-725', code='725', name='Enfermeiro - Área Urbana - Porto Velho', kind='job')],
    groups=[dict(ref='gerais-superior', name='Conhecimentos gerais - Ensino superior', knowledge_type='general', applies_to_all=True, applicability=[], subjects=general), dict(ref='especificos-enfermeiro', name='Conhecimentos específicos - Enfermeiro', knowledge_type='specific', applies_to_all=False, applicability=[dict(option_ref='enfermeiro-725', weight=None)], subjects=specific)],
    warnings=['Arquivo de teste preparado a partir do PDF ilovepdf_merged (1).pdf. Escopo restrito ao cargo 725, Enfermeiro - Área Urbana - Porto Velho. Não inclui os demais cargos do edital.', 'Fontes: Anexo IV, páginas 6 a 10 do anexo (páginas 72 a 76 do PDF unificado). Os cargos revogados 506, 507 e 508 não foram incluídos.', 'Preparação local para testar a importação, sem chamada a IA externa. Pesos não informados neste arquivo; confira o quadro de provas antes de usar para planejamento definitivo.', 'Uma unidade pode exigir várias sessões. O bloco de 25 minutos não significa conclusão de todo o conteúdo.'])
output = ROOT / 'prototypes/real-editais/porto-velho-enfermeiro-725.json'
output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({s['name']: len(s['topics'][0]['units']) for s in general + specific}, ensure_ascii=True))
