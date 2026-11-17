import { useEstudo } from '../context/EstudoContext'
import { agruparSessoesPorDia, diasDaSemana, DIAS_SEMANA_ABREV } from '../lib/semana'
import { lerData, dataLocal } from '../lib/datas'

export default function RitmoSemana() {
  const { sessoes, hoje, metas } = useEstudo()
  const dias = diasDaSemana(lerData(hoje))
  const valores = agruparSessoesPorDia(sessoes, dias)
  const total = valores.reduce((soma, dia) => soma + dia.tempoMinutos, 0)
  const maximo = Math.max(1, ...valores.map(dia => dia.tempoMinutos))
  return <section className="agenda-weekly"><h2>Seu ritmo na semana</h2><p>{total} min estudados{metas.minutosPorSemana > 0 ? ` de ${metas.minutosPorSemana} min da sua meta` : ''}</p><div className="agenda-week-bars" role="img" aria-label={valores.map((dia, i) => `${DIAS_SEMANA_ABREV[i]}: ${dia.tempoMinutos} minutos`).join('; ')}>{valores.map((dia, i) => <div key={dataLocal(dia.data)} className={dataLocal(dia.data) === hoje ? 'is-today' : ''}><i style={{ height: `${Math.max(2, dia.tempoMinutos / maximo * 90)}px` }} /><span>{DIAS_SEMANA_ABREV[i]}</span></div>)}</div></section>
}
