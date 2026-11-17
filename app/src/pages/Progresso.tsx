import { useEstudo } from '../context/EstudoContext'
import MetasSecao from '../components/MetasSecao'
import GraficoSemana from '../components/GraficoSemana'
import TabelaMaterias from '../components/TabelaMaterias'
import { SUBJECT_STYLES } from '../lib/subjectStyles'

export default function Progresso() {
  const { materias } = useEstudo()
  const topicos = materias.flatMap(m => m.topicos)
  const concluidos = topicos.filter(t => t.ultimaRevisao).length
  return <div className="desk-dashboard"><header className="desk-page-heading"><div><h1>Meu progresso</h1><p>{concluidos} de {topicos.length} assuntos com primeiro estudo concluído. Cobertura do edital e desempenho em questões são medidas diferentes.</p></div></header><MetasSecao /><GraficoSemana /><div className="desk-summary-columns"><section className="desk-subject-progress"><h2>Cobertura por matéria</h2>{materias.map(m => { const covered = m.topicos.filter(t => t.ultimaRevisao).length; const percent = m.topicos.length ? Math.round(covered / m.topicos.length * 100) : 0; return <div key={m.id} className="desk-subject-row"><div><strong>{m.nome}</strong><span>{covered}/{m.topicos.length} assuntos · {percent}%</span></div><div className="desk-progress-track"><span className={SUBJECT_STYLES[m.cor].bar} style={{ width: `${percent}%` }} /></div></div> })}</section><TabelaMaterias /></div></div>
}
