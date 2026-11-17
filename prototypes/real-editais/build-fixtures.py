"""Controlled import samples from the checked-in PDFs, not a production parser.

Input: text written by the project's PdfTextExtractor to writable/testing.
Output: test-only JSON responses, with explicit sample scope and provenance.
No external AI request is made. These fixtures test ingestion, not AI accuracy.
"""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'server/writable/testing/editais-reais'


def excerpt(file, first, last):
    lines = (OUT / f'{file}.txt').read_text(encoding='utf-8').splitlines()
    kept = []
    headers = ('pcimarkpci ', 'www.pciconcursos', '[[PAGE ', 'DATAPREV |',
               'CONSELHO REGIONAL DE CORRETORES DE', 'IMÓVEIS DO ESTADO DE SÃO PAULO',
               'CONCURSO PÚBLICO 01/2026')
    for line in lines[first - 1:last]:
        line = line.strip()
        if not line or line.startswith(headers) or re.fullmatch(r'Página \d+ de \d+|\d+', line):
            continue
        kept.append(line)
    text = ' '.join(kept)
    assert text and len(text) <= 20000, (file, first, last, len(text))
    return text


def subject(file, title, first, last, numbered=False):
    source = excerpt(file, first, last)
    if numbered:
        # Use explicit top-level numbers from these particular annexes only.
        pattern = r'(?<!\S)\d{1,2}(?:\.(?!\d)|\s+)(?=[A-Za-zÀ-ÿ])'
        starts = [m.start() for m in re.finditer(pattern, source)]
        if starts and starts[0] > 0:
            starts = starts[1:]  # Keep the subject heading with its first real item.
    else:
        starts = [m.end() for m in re.finditer(r'(?<=[.;])\s+(?=[A-ZÀ-Ý])', source)]
    boundaries = sorted(set([0] + starts + [len(source)]))
    units = []
    for a, b in zip(boundaries, boundaries[1:]):
        text = source[a:b].strip()
        if not text:
            continue
        name = text if len(text) <= 165 else text[:165].rsplit(' ', 1)[0] + '…'
        if name.casefold() in {u['title'].casefold() for u in units}:
            # Some laws really recur under different explicit headings. Keep both
            # source occurrences and name the second using its original context.
            contexts = list(re.finditer(r'(?:^|[.]\s+)([A-ZÀ-Ý][^.;:]{3,90}):', source[:a]))
            assert contexts, (title, name, 'missing contextual heading')
            name = (contexts[-1].group(1) + ' • ' + name)[:180]
        assert name.casefold() not in {u['title'].casefold() for u in units}, (title, name)
        units.append({'title': name, 'source': text})
    assert 0 < len(units) <= 100, (title, len(units))
    return {'name': title, 'topics': [{'title': title, 'source': source, 'units': units}]}


def group(ref, name, subjects, refs=None, kind='general', weights=None):
    return dict(ref=ref, name=name, knowledge_type=kind, applies_to_all=refs is None,
                applicability=[] if refs is None else [dict(option_ref=r, weight=None if weights is None else weights[i]) for i, r in enumerate(refs)], subjects=subjects)


def option(ref, name):
    return dict(ref=ref, code=ref, name=name, kind='profile')


def build(file, title, scope, options, groups, has=True, warnings=None):
    pdf = ROOT / 'exemplos_editais' / f'{file}.pdf'
    data = dict(study_units_version=1, title=title, has_study_syllabus=has,
                extraction_complete=True, options=options, groups=groups,
                warnings=(warnings or []) + [f'AMOSTRA CONTROLADA DE TESTE: {scope}. Não representa validação de uma resposta produzida por IA nem de todos os cargos do PDF.'])
    result = dict(file=pdf.name, sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(), scope=scope, response=data)
    (OUT / f'{file}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result


cases = []
f = 'edital-retificado-dataprev'
cases.append(build(f, 'DATAPREV • Edital 001/2026 (teste)', 'Conteúdo geral e perfis 1 e 3, Anexo I, páginas 27 a 31',
    [option('perfil-1','Análise de Negócios de TI'), option('perfil-3','Desenvolvimento de Software')], [
        group('gerais','Conhecimentos gerais',[
            subject(f,'Língua Portuguesa',1268,1277,True), subject(f,'Língua Inglesa',1279,1280,True),
            subject(f,'Raciocínio Lógico',1282,1285,True), subject(f,'Atualidades e Inteligência Artificial',1287,1291,True),
            subject(f,'Legislação de Segurança da Informação e Proteção de Dados',1293,1296,True)]),
        group('perfil-1','Perfil 1', [subject(f,'Análise de Negócios de TI',1304,1334,True)], ['perfil-1'], 'specific'),
        group('perfil-3','Perfil 3', [subject(f,'Desenvolvimento de Software',1442,1501,True)], ['perfil-3'], 'specific')]))
f = 'edital2'
cases.append(build(f, 'CRECI/SP • Concurso 01/2026 (teste)', 'Assistente Administrativo e Técnico de TI, Anexo II; aplicabilidade conferida no quadro 11.1',
    [option('admin','PST - Assistente Administrativo'),option('ti','PST - Técnico de TI - Manutenção de Computadores')], [
        group('gerais','Conteúdo comum aos dois empregos', [subject(f,'Língua Portuguesa',2401,2404),subject(f,'Matemática e Raciocínio Lógico',2407,2414)]),
        group('informatica-admin','Informática do Assistente Administrativo',[subject(f,'Noções de Informática',2417,2429)],['admin']),
        group('admin','Específicos do Assistente Administrativo',[subject(f,'Conhecimentos Específicos - Administração',2433,2461)],['admin'],'specific'),
        group('ti','Específicos do Técnico de TI',[subject(f,'Manutenção de Computadores',2464,2475)],['ti'],'specific')]))
f = 'edital3'
cases.append(build(f, 'MANAUSPREV • Edital 01/2026 (teste)', 'Analistas 01 (Administrativa) e 08 (TI), Anexo II, páginas 26 a 34',
    [option('01','Analista Previdenciário - Administrativa'), option('08','Analista Previdenciário - Tecnologia da Informação')], [
        group('gerais','Conteúdo comum aos dois analistas',[subject(f,'Língua Portuguesa',1688,1695),subject(f,'Raciocínio Lógico-Matemático',1696,1705)]),
        group('informatica-admin','Informática do analista administrativo',[subject(f,'Noções de Informática',1706,1717)],['01']),
        group('admin','Específicos - Administrativa',[subject(f,'Conhecimentos Específicos - Administrativa',1821,1878)],['01'],'specific'),
        group('ti','Específicos - Tecnologia da Informação',[subject(f,'Conhecimentos Específicos - TI',2128,2208)],['08'],'specific')]))
f = 'edital5'
axes = [(1,'Gestão Governamental e Governança Pública',3360,3375),(2,'Políticas Públicas',3377,3387),
        (3,'Gerência e Suporte da Tecnologia da Informação',3389,3415),(4,'Desenvolvimento de Software',3417,3432),
        (5,'Apoio à Decisão, Inteligência Artificial e Métodos Quantitativos',3434,3472)]
cases.append(build(f,'CNU • Bloco 2 • Edital 02/2024 (teste)', 'Anexo IV completo para AGU Estatístico e FUNAI Estatística; pesos do Anexo V, página 54',
    [option('B2-01-A','AGU - Estatístico'),option('B2-02-A','FUNAI - Especialista em Indigenismo - Estatística')],
    [group('gerais','Conhecimentos gerais',[subject(f,'Conhecimentos Gerais',3316,3355,True)])] +
    [group(f'eixo-{i}',f'Eixo {i} - {name}',[subject(f,name,a,b,True)],['B2-01-A','B2-02-A'],'specific',[[1,2,1,1,5][i-1],[2,3,2,1,2][i-1]]) for i,name,a,b in axes]))
cases.append(build('edital4','NAV Brasil • Edital 1/2025 (teste)','Item 1.3, página 1: avaliação de títulos e experiência; sem programa de prova de conhecimentos',[],[],False,
                   ['O item 1.3 prevê avaliação de títulos e experiência profissional. Não há programa estudável de prova de conhecimentos.']))
(OUT / 'cases.json').write_text(json.dumps(cases, ensure_ascii=False, indent=2), encoding='utf-8')
for c in cases:
    print(c['file'],sum(len(t['units']) for g in c['response']['groups'] for s in g['subjects'] for t in s['topics']), 'units')
