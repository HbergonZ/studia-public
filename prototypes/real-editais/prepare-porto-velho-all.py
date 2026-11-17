"""Controlled full-syllabus import for this particular PDF, grouped by job family.

Uses the headings of Anexo IV, not a general-purpose PDF parser or an AI call.
Lotations sharing one syllabus are represented by their original code range.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
lines = (ROOT / 'server/writable/testing/editais-reais/merged.txt').read_text(encoding='utf-8').splitlines()


def clean(line):
    line = line.strip()
    return '' if not line or line.startswith(('[[PAGE ', 'CONCURSO PÚBLICO DA SAÚDE', 'PORTO VELHO/RO - EDITAL')) or re.fullmatch(r'Página \d+ de \d+', line) else line


def subject(name, text):
    source = ' '.join(filter(None, map(clean, text)))
    parts = re.split(r'(?<=[.;])\s+(?=[A-ZÀ-Ý])', source)
    units = []
    for part in parts:
        title = part.rstrip('.;')
        if len(title) > 140:
            title = title.split(':', 1)[0] if ':' in title[:130] else title[:130].rsplit(' ', 1)[0] + '…'
        if title.casefold() in {u['title'].casefold() for u in units}:
            # Keep genuine repetitions in the source. Add the immediately preceding
            # original subject context to distinguish repeated references.
            previous = units[-1]['title']
            title = previous[:65] + ': ' + title[:110]
        assert title.casefold() not in {u['title'].casefold() for u in units}, (name, title)
        units.append(dict(title=title, source=part))
    assert source and len(source) <= 20000 and 0 < len(units) <= 100, (name, len(units))
    assert re.sub(r'\s', '', ''.join(u['source'] for u in units)) == re.sub(r'\s', '', source)
    return dict(name=name, topics=[dict(title=name, source=source, units=units)])


levels = [('fundamental', 4082, 4190), ('medio', 4190, 4409), ('superior', 4409, len(lines) + 1)]
options = []
groups = []
provenance = []
job_pattern = re.compile(r'^(\d{3}(?:\s+A\s+\d{3})?)\s*-\s*(.+)$')
for level, first, end in levels:
    headers = [i for i in range(first - 1, end - 1) if lines[i].strip() == 'CONHECIMENTOS ESPECÍFICOS']
    refs = []
    for pos, header in enumerate(headers):
        stop = headers[pos + 1] if pos + 1 < len(headers) else end - 1
        start = header + 1
        jobs = []
        while start < stop:
            value = clean(lines[start])
            if not value:
                start += 1
                continue
            match = job_pattern.fullmatch(value)
            if not match:
                break
            if 'REVOGADO' not in value:
                code, name = match.groups()
                ref = 'cargo-' + code.lower().replace(' a ', '-')
                jobs.append(dict(ref=ref, code=code, name=name.title(), kind='job'))
                refs.append(ref)
            start += 1
        if not jobs:
            continue  # Revoked positions have no selectable option or content group.
        options.extend(jobs)
        group_ref = jobs[0]['ref'] + '-conteudo'
        title = ' / '.join(j['name'] for j in jobs)
        groups.append(dict(ref=group_ref, name='Específicos - ' + title,
            knowledge_type='specific', applies_to_all=False,
            applicability=[dict(option_ref=j['ref'], weight=None) for j in jobs],
            subjects=[subject('Conhecimentos Específicos - ' + title, lines[start:stop])]))
        provenance.append(dict(group=group_ref, first_line=start + 1, last_line=stop, codes=[j['code'] for j in jobs]))
    # General subjects belong to the candidates at this education level only.
    general_headers = [i for i in range(first, headers[0]) if lines[i].strip() in {
        'LÍNGUA PORTUGUESA', 'MATEMÁTICA', 'RACIOCÍNIO LÓGICO',
        'CONHECIMENTOS GERAIS E ATUALIDADES', 'LEGISLAÇÃO', 'LEGISLAÇÃO SAÚDE'}]
    subjects = []
    for pos, header in enumerate(general_headers):
        stop = general_headers[pos + 1] if pos + 1 < len(general_headers) else headers[0]
        subjects.append(subject(lines[header].strip().title(), lines[header + 1:stop]))
    assert len(subjects) == (3 if level == 'fundamental' else 4), level
    groups.append(dict(ref='gerais-' + level, name='Conhecimentos gerais - ' + level,
        knowledge_type='general', applies_to_all=False,
        applicability=[dict(option_ref=ref, weight=None) for ref in refs], subjects=subjects))

assert len({o['ref'] for o in options}) == len(options)
assert all('revogado' not in o['name'].lower() for o in options)
assert all(any(a['option_ref'] == o['ref'] for g in groups if g['knowledge_type'] == 'specific' for a in g['applicability']) for o in options)
data = dict(study_units_version=1, title='Saúde de Porto Velho/RO - Edital nº 25/2026',
    has_study_syllabus=True, extraction_complete=True, options=options, groups=groups,
    warnings=[
        'Arquivo de teste preparado localmente a partir do Anexo IV completo (páginas 67 a 88 do PDF unificado ilovepdf_merged (1).pdf), sem chamada a IA externa.',
        'Cargos com o mesmo programa e diferentes lotações estão agrupados pelos intervalos de códigos do Anexo IV. Os cargos revogados 506, 507, 508, 604 e 605 foram excluídos.',
        'Os conhecimentos gerais são vinculados ao nível de escolaridade de cada cargo. Ao selecionar cargos de níveis diferentes, o sistema reúne os programas correspondentes.',
        'Pesos não informados neste arquivo. Confira o quadro de provas antes do planejamento definitivo. As unidades podem exigir várias sessões de estudo.',
        'Em todos os conteúdos programáticos, considerar a regra de legislação e jurisprudência vigente descrita na introdução do Anexo IV. A indicação de diploma legal abrange as normas que o regulamentam.'
    ])
path = ROOT / 'prototypes/real-editais/porto-velho-todos-cargos.json'
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(ROOT / 'server/writable/testing/porto-velho-provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(dict(options=len(options), groups=len(groups), subjects=sum(len(g['subjects']) for g in groups), units=sum(len(t['units']) for g in groups for s in g['subjects'] for t in s['topics']), bytes=path.stat().st_size)))
