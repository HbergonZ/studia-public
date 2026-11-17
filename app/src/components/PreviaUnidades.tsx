import type { AssuntoOrganizado, PreviaImportacao } from '../lib/studyUnits'
import ConteudoOriginal from './ConteudoOriginal'

export function AssuntoUnidades({ assunto }: { assunto: AssuntoOrganizado }) {
  return <div className="unit-preview"><h3>{assunto.title}</h3><ConteudoOriginal texto={assunto.source} rotulo="Conferir texto original" /><ol>{assunto.units.map((unit, index) => <li key={index}><strong>{unit.title}</strong><ConteudoOriginal texto={unit.source} /></li>)}</ol></div>
}

export default function PreviaUnidades({ previa }: { previa: PreviaImportacao }) {
  const { summary, structure } = previa
  return <section className="unit-import-preview" aria-label="Prévia da organização"><h2>Confira antes de importar</h2><p>{summary.subjects} {summary.subjects === 1 ? 'matéria' : 'matérias'}, {summary.sources} {summary.sources === 1 ? 'assunto de origem' : 'assuntos de origem'} e {summary.units} {summary.units === 1 ? 'unidade de estudo' : 'unidades de estudo'}.</p><p>Os trechos cobrem o texto recebido. Compare com o edital original para conferir se a IA incluiu todo o programa e respeitou os cargos.</p>{summary.legacy > 0 && <p role="status">{summary.legacy} assuntos vieram no formato antigo. Eles serão preservados e poderão ser divididos em Organizar estudos.</p>}{structure.warnings.map((warning, index) => <p key={index} role="status">{warning}</p>)}{structure.groups.map(group => <details key={group.ref} open={structure.groups.length === 1}><summary>{group.name}</summary>{group.subjects.map((subject, index) => <section key={index}><h3>{subject.name}</h3>{subject.topics.map((topic, index) => typeof topic === 'string' ? <p key={index} className="unit-legacy">{topic}</p> : <AssuntoUnidades key={index} assunto={topic} />)}</section>)}</details>)}</section>
}
