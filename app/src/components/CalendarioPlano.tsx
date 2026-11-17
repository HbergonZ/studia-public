import { IconArrowUp } from './icons'
import { useMemo, useState } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { dataLocal, lerData } from '../lib/datas'

export default function CalendarioPlano({ data, onSelecionar, bloqueado = false }: { data: string; onSelecionar: (dia: string) => void; bloqueado?: boolean }) {
  const { sessoes, hoje } = useEstudo()
  const [cursor, setCursor] = useState(() => data.slice(0, 7))
  const mes = lerData(`${cursor}-01`)
  const primeiroDia = (mes.getDay() + 6) % 7
  const quantidade = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const estudados = useMemo(() => new Set(sessoes.map(sessao => sessao.data)), [sessoes])
  function mudarMes(delta: number) {
    const proximo = new Date(mes.getFullYear(), mes.getMonth() + delta, 1, 12)
    setCursor(dataLocal(proximo).slice(0, 7))
  }
  return <section className="agenda-calendar" aria-label="Escolher dia de estudo">
    <header><button type="button" className="agenda-month-arrow" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><IconArrowUp className="h-4 w-4 -rotate-90" /></button><h2>{mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2><button type="button" className="agenda-month-arrow" onClick={() => mudarMes(1)} aria-label="Próximo mês"><IconArrowUp className="h-4 w-4 rotate-90" /></button></header>
    <div className="agenda-month-grid">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(dia => <span className="agenda-weekday" key={dia}>{dia}</span>)}{Array.from({ length: primeiroDia }, (_, i) => <span key={`vazio-${i}`} />)}{Array.from({ length: quantidade }, (_, i) => {
      const valor = `${cursor}-${String(i + 1).padStart(2, '0')}`
      return <button type="button" key={valor} disabled={bloqueado} aria-label={lerData(valor).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} aria-pressed={data === valor} aria-current={hoje === valor ? 'date' : undefined} className={estudados.has(valor) ? 'has-study' : ''} onClick={() => onSelecionar(valor)}>{i + 1}</button>
    })}</div>
    <p>Pontos indicam dias em que você estudou.</p>
    <button type="button" className="quiet-link agenda-today-link" disabled={bloqueado} onClick={() => { setCursor(hoje.slice(0, 7)); onSelecionar(hoje) }}>Ir para hoje</button>
  </section>
}
