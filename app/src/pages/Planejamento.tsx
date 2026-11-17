import { useSearchParams } from 'react-router-dom'
import { useEstudo } from '../context/EstudoContext'
import { usePlanoDia } from '../lib/usePlanoDia'
import { dataLocal, lerData } from '../lib/datas'
import PlanoDiario from '../components/PlanoDiario'
import CalendarioSecao from '../components/CalendarioSecao'
import CronogramaSecao from '../components/CronogramaSecao'
import CalendarioPlano from '../components/CalendarioPlano'

export default function Planejamento() {
  const { hoje } = useEstudo()
  const [params, setParams] = useSearchParams()
  const solicitada = params.get('data') ?? hoje
  const data = /^\d{4}-\d{2}-\d{2}$/.test(solicitada) && Number.isFinite(lerData(solicitada).getTime()) && dataLocal(lerData(solicitada)) === solicitada ? solicitada : hoje
  function setData(valor: string) { if (valor) { const proximos = new URLSearchParams(params); proximos.set('data', valor); setParams(proximos, { replace: true }) } }
  const estado = usePlanoDia(data)
  const inicio = lerData(hoje)
  return <div className="desk-dashboard">
    <header className="desk-page-heading"><div><h1>Planejamento</h1><p>Organize seus blocos e acompanhe as revisões. Os assuntos fora do plano continuam disponíveis no edital.</p></div></header>
    <div className="agenda-planning"><aside><CalendarioPlano key={data.slice(0, 7)} data={data} onSelecionar={setData} /><label className="agenda-date-input">Outra data<input aria-label="Data do plano" type="date" value={data} onChange={e => setData(e.target.value)} /></label></aside><div className="agenda-planning-main"><section className="daily-week" aria-label="Escolher dia do plano"><div className="daily-week-days">{Array.from({ length: 7 }, (_, i) => { const dia = new Date(inicio); dia.setDate(dia.getDate() + i); const value = dataLocal(dia); return <button className="daily-button" aria-pressed={data === value} key={value} onClick={() => setData(value)}><span>{i === 0 ? 'Hoje' : dia.toLocaleDateString('pt-BR', { weekday: 'short' })}</span><strong>{dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</strong></button> })}</div></section><PlanoDiario estado={estado} fixo /></div></div>
    <section id="calendario"><CalendarioSecao /></section>
    <details className="daily-review-details"><summary>Ver todas as revisões e assuntos disponíveis</summary><p className="daily-hint">Esta visão reúne o conteúdo elegível. Apenas os blocos do plano fazem parte do compromisso do dia. Adiar um bloco não apaga o vencimento da revisão.</p><CronogramaSecao /></details>
  </div>
}
