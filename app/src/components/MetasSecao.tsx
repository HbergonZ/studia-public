import { lerData as diaCalendario } from '../lib/datas'
import { useMemo } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { diasDaSemana, sessoesNoIntervalo } from '../lib/semana'
import { IconFlag } from './icons'

function Barra({ label, atual, meta, sufixo }: { label: string; atual: number; meta: number; sufixo: string }) {
  const pct = meta === 0 ? 0 : Math.min(100, Math.round((atual / meta) * 100))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-muted">
          {atual}
          {sufixo} / {meta}
          {sufixo}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function MetasSecao() {
  const { sessoes, metas, hoje: hojeEstudo } = useEstudo()
  const hoje = useMemo(() => diaCalendario(hojeEstudo), [hojeEstudo])
  const dias = useMemo(() => diasDaSemana(hoje), [hoje])
  const sessoesSemana = useMemo(() => sessoesNoIntervalo(sessoes, dias), [sessoes, dias])

  const questoesSemana = sessoesSemana.reduce((soma, s) => soma + s.acertos + s.erros, 0)
  const minutosSemana = sessoesSemana.reduce((soma, s) => soma + s.tempoMinutos, 0)
  const horas = Math.floor(minutosSemana / 60)
  const minutosRestantes = minutosSemana % 60
  const metaHoras = Math.floor(metas.minutosPorSemana / 60)
  const metaMinutosRestantes = metas.minutosPorSemana % 60

  return (
    <div className="weekly-goals rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-ink">
        <IconFlag className="h-4 w-4" />
        Suas metas da semana
      </h2>
      <div className="flex flex-col gap-3">
        <Barra label="Questões" atual={questoesSemana} meta={metas.questoesPorSemana} sufixo="" />
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ink">Tempo de estudo</span>
            <span className="text-muted">
              {horas}h{minutosRestantes > 0 ? `${minutosRestantes}m` : ''} / {metaHoras}h
              {metaMinutosRestantes > 0 ? `${metaMinutosRestantes}m` : ''}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
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
