import { useEstudo } from '../context/EstudoContext'
import { Link } from 'react-router-dom'
import type { PlanoDia } from '../types'

export default function ContinuidadeEstudo({ plano }: { plano: PlanoDia | null }) {
  const { materias, hoje } = useEstudo()
  const topicos = materias.flatMap(materia => materia.topicos.map(topico => ({ id: topico.id, titulo: topico.nome, materia: materia.nome, andamento: topico.emAndamento, revisao: topico.proximaRevisao })))
  const atrasadas = topicos.filter(t => t.revisao && t.revisao.slice(0, 10) < hoje).length
  const grupos = [
    { titulo: 'No plano de hoje', itens: (plano?.blocks ?? []).filter(bloco => bloco.status === 'planned').map(bloco => ({ id: bloco.id, titulo: bloco.topic?.title ?? 'Conteúdo removido', materia: bloco.topic?.subjectName ?? '', detalhe: `${bloco.minutes} min` })), vazio: 'Nenhum bloco pendente neste plano.' },
    { titulo: 'Em andamento', itens: topicos.filter(topico => topico.andamento).map(topico => ({ ...topico, detalhe: 'Continuar em outra sessão' })), vazio: 'As unidades que você continuar depois aparecem aqui.' },
    { titulo: 'Próximas revisões', itens: topicos.filter(topico => topico.revisao && topico.revisao.slice(0, 10) >= hoje).sort((a, b) => (a.revisao ?? '').localeCompare(b.revisao ?? '')).map(topico => ({ ...topico, detalhe: topico.revisao!.slice(0, 10).split('-').reverse().join('/') })), vazio: atrasadas ? `${atrasadas} revisões estão vencidas. Consulte o planejamento para reorganizar dentro do seu tempo.` : 'Conclua uma unidade para programar sua revisão.' },
  ]
  return <section className="agenda-continuity"><header><div><h2>Como o estudo continua</h2><p>O plano é pequeno. O restante do conteúdo fica organizado aqui.</p></div><Link className="quiet-link" to="/planejamento">Ver todas as revisões</Link></header><div className="agenda-continuity-columns">{grupos.map(grupo => <section key={grupo.titulo}><h3>{grupo.titulo}<span>{grupo.itens.length}</span></h3>{grupo.itens.length ? <ul tabIndex={0} aria-label={grupo.titulo}>{grupo.itens.map(item => <li key={item.id}><small>{item.materia}</small><p>{item.titulo}</p><small>{item.detalhe}</small></li>)}</ul> : <p className="agenda-continuity-empty">{grupo.vazio}</p>}</section>)}</div></section>
}
