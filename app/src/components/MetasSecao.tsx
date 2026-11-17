import { useMemo } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { diasDaSemana, sessoesNoIntervalo } from '../lib/semana'
import { IconFlag } from './icons'

function Barra({ label, atual, meta, sufixo }: { label: string; atual: number; meta: number; sufixo: string }) {
  const pct = meta === 0 ? 0 : Math.min(100, Math.round((atual / meta) * 100))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          {atual}
          {sufixo} / {meta}
          {sufixo}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function MetasSecao() {
  const { sessoes, metas } = useEstudo()
  const hoje = useMemo(() => new Date(), [])
  const dias = useMemo(() => diasDaSemana(hoje), [hoje])
  const sessoesSemana = useMemo(() => sessoesNoIntervalo(sessoes, dias), [sessoes, dias])

  const questoesSemana = sessoesSemana.reduce((soma, s) => soma + s.acertos + s.erros, 0)
  const minutosSemana = sessoesSemana.reduce((soma, s) => soma + s.tempoMinutos, 0)
  const horas = Math.floor(minutosSemana / 60)
  const minutosRestantes = minutosSemana % 60
  const metaHoras = Math.floor(metas.minutosPorSemana / 60)
  const metaMinutosRestantes = metas.minutosPorSemana % 60

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <IconFlag className="h-4 w-4" />
        Suas metas da semana
      </h2>
      <div className="flex flex-col gap-3">
        <Barra label="Questões" atual={questoesSemana} meta={metas.questoesPorSemana} sufixo="" />
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-300">Tempo de estudo</span>
            <span className="text-slate-400">
              {horas}h{minutosRestantes > 0 ? `${minutosRestantes}m` : ''} / {metaHoras}h
              {metaMinutosRestantes > 0 ? `${metaMinutosRestantes}m` : ''}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
              style={{
                width: `${metas.minutosPorSemana === 0 ? 0 : Math.min(100, Math.round((minutosSemana / metas.minutosPorSemana) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
