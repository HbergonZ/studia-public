import { lerData as diaCalendario } from '../lib/datas'
import { useMemo, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useEstudo } from '../context/EstudoContext'
import { DIAS_SEMANA_ABREV, agruparSessoesPorDia, diasDaSemana, sessoesNoIntervalo, taxaAcertoGlobal } from '../lib/semana'
import { inicioDoDia } from '../lib/curva'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { IconChartBar, IconBook, IconArrowUp } from './icons'

const LARGURA = 520
const ALTURA = 224
const MARGEM = { top: 20, right: 14, bottom: 60, left: 40 }
const ALTURA_UTIL = ALTURA - MARGEM.top - MARGEM.bottom
const BASELINE_Y = ALTURA - MARGEM.bottom
const RAIO_BOLHA_MIN = 3
const RAIO_BOLHA_MAX = 9

function escalaX(index: number, total: number) {
  const larguraUtil = LARGURA - MARGEM.left - MARGEM.right
  const passo = larguraUtil / total
  return MARGEM.left + passo * index + passo / 2
}

export default function GraficoSemana() {
  const { materias, sessoes, hoje: hojeEstudo } = useEstudo()
  const hoje = useMemo(() => inicioDoDia(diaCalendario(hojeEstudo)), [hojeEstudo])
  const [offsetSemana, setOffsetSemana] = useState(0)

  const referencia = useMemo(() => {
    const d = new Date(hoje)
    d.setDate(d.getDate() + offsetSemana * 7)
    return d
  }, [hoje, offsetSemana])

  const dias = useMemo(() => diasDaSemana(referencia), [referencia])
  const agregados = useMemo(() => agruparSessoesPorDia(sessoes, dias), [sessoes, dias])

  const horas = agregados.map((a) => a.tempoMinutos / 60)
  const maxHoras = Math.max(1, ...horas)
  const maxQuestoes = Math.max(1, ...agregados.map((a) => a.questoes))

  const axisMaxHoras = Math.max(1, Math.ceil(maxHoras))
  const stepEixo = Math.max(1, Math.ceil(axisMaxHoras / 4))
  const marcasEixo: number[] = []
  for (let m = stepEixo; m <= axisMaxHoras; m += stepEixo) marcasEixo.push(m)

  const chaveHoje = inicioDoDia(hoje).toISOString().slice(0, 10)

  const tempoPorMateria = useMemo(() => {
    const sessoesDaSemana = sessoesNoIntervalo(sessoes, dias)
    const mapa = new Map<string, number>()
    for (const s of sessoesDaSemana) {
      mapa.set(s.materiaId, (mapa.get(s.materiaId) ?? 0) + s.tempoMinutos)
    }
    return materias
      .map((materia) => ({ materia, minutos: mapa.get(materia.id) ?? 0 }))
      .filter((item) => item.minutos > 0)
      .sort((a, b) => b.minutos - a.minutos)
  }, [sessoes, dias, materias])

  const maxMinutosMateria = Math.max(1, ...tempoPorMateria.map((t) => t.minutos))

  function formatarMinutos(minutos: number) {
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h${m}min`
  }

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null)

  function abrirTooltip(e: MouseEvent<SVGRectElement>, i: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoverIndex(i)
    setHoverPos({ top: rect.top, left: rect.left + rect.width / 2 })
  }

  function fecharTooltip() {
    setHoverIndex(null)
    setHoverPos(null)
  }

  const larguraBarra = 26
  const pontosDesempenho = agregados
    .map((a, i) => ({ x: escalaX(i, 7), y: BASELINE_Y - (a.desempenho / 100) * ALTURA_UTIL, pct: a.desempenho, temDados: a.questoes > 0 }))
  const totalHoras = horas.reduce((s, h) => s + h, 0)
  const totalQuestoes = agregados.reduce((s, a) => s + a.questoes, 0)
  const diasComQuestoes = agregados.filter((a) => a.questoes > 0)
  const mediaDesempenho = taxaAcertoGlobal(agregados)

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <IconChartBar className="h-4 w-4" />
          Sua semana
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffsetSemana((o) => o - 1)}
            className="rounded-lg px-2 py-0.5 text-muted transition-colors hover:bg-hover hover:text-ink"
            aria-label="Semana anterior"
          >
            <IconArrowUp className="h-4 w-4 -rotate-90" />
          </button>
          <span className="min-w-[6.5rem] text-center text-xs text-muted">
            {offsetSemana === 0 ? 'esta semana' : offsetSemana < 0 ? `${-offsetSemana}sem atrás` : `em ${offsetSemana}sem`}
          </span>
          <button
            type="button"
            onClick={() => setOffsetSemana((o) => Math.min(0, o + 1))}
            disabled={offsetSemana === 0}
            className="rounded-lg px-2 py-0.5 text-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Próxima semana"
          >
            <IconArrowUp className="h-4 w-4 rotate-90" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="min-w-0 rounded-md bg-soft p-4 lg:col-span-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted">Horas, questões e desempenho</p>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-brand-600" />
              Horas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-2.5 bg-[var(--color-chart-desempenho)]" />
              Desempenho
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-chart-questoes)]" />
              Questões
            </span>
          </div>
        </div>

        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Gráfico semanal, role para ver todos os dias">
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          className="mx-auto w-full min-w-[520px] max-w-[560px]"
          role="img"
          aria-label="Horas de estudo, questões respondidas e desempenho por dia"
        >
          {marcasEixo.map((m) => {
            const y = BASELINE_Y - (m / axisMaxHoras) * ALTURA_UTIL
            return (
              <g key={m}>
                <line x1={MARGEM.left} x2={LARGURA - MARGEM.right} y1={y} y2={y} stroke="var(--color-line)" />
                <text x={MARGEM.left - 6} y={y + 3} textAnchor="end" fontSize="14" fill="var(--color-muted)">
                  {m}h
                </text>
              </g>
            )
          })}
          <line
            x1={MARGEM.left}
            x2={LARGURA - MARGEM.right}
            y1={BASELINE_Y}
            y2={BASELINE_Y}
            stroke="var(--color-line)"
          />

          {agregados.map((a, i) => {
            const chave = a.data.toISOString().slice(0, 10)
            const x = escalaX(i, 7)
            const h = (horas[i] / axisMaxHoras) * ALTURA_UTIL
            return (
              <rect
                key={chave}
                x={x - larguraBarra / 2}
                y={BASELINE_Y - h}
                width={larguraBarra}
                height={h}
                rx={4}
                fill={chave === chaveHoje ? 'var(--color-brand-400)' : 'var(--color-brand-600)'}
              />
            )
          })}

          {pontosDesempenho.map((p, i) => {
            if (!p.temDados) return null
            const proximo = pontosDesempenho[i + 1]
            return (
              <g key={i}>
                {proximo?.temDados && (
                  <line
                    x1={p.x}
                    y1={p.y}
                    x2={proximo.x}
                    y2={proximo.y}
                    stroke="var(--color-chart-desempenho)"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                )}
                <circle cx={p.x} cy={p.y} r={3} fill="var(--color-chart-desempenho)" />
                <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="14" fill="var(--color-chart-desempenho)">
                  {p.pct}%
                </text>
              </g>
            )
          })}

          {agregados.map((a, i) => {
            const x = escalaX(i, 7)
            const cy = BASELINE_Y + 16
            if (a.questoes === 0) {
              return (
                <text key={i} x={x} y={cy + 3} textAnchor="middle" fontSize="14" fill="var(--color-muted)">
                  —
                </text>
              )
            }
            const raio = RAIO_BOLHA_MIN + (a.questoes / maxQuestoes) * (RAIO_BOLHA_MAX - RAIO_BOLHA_MIN)
            return (
              <g key={i}>
                <circle cx={x} cy={cy} r={raio} fill="var(--color-chart-questoes)" opacity={0.85} />
                <text x={x} y={cy + 14} textAnchor="middle" fontSize="14" fill="var(--color-muted)">
                  {a.questoes}
                </text>
              </g>
            )
          })}

          {agregados.map((a, i) => {
            const chave = a.data.toISOString().slice(0, 10)
            const x = escalaX(i, 7)
            return (
              <text
                key={chave}
                x={x}
                y={BASELINE_Y + 46}
                textAnchor="middle"
                fontSize="14"
                fontWeight={chave === chaveHoje ? 700 : 400}
                fill={chave === chaveHoje ? 'var(--color-brand-400)' : 'var(--color-muted)'}
              >
                {DIAS_SEMANA_ABREV[i].toUpperCase()}
              </text>
            )
          })}

          {hoverIndex !== null && (
            <line
              x1={escalaX(hoverIndex, 7)}
              x2={escalaX(hoverIndex, 7)}
              y1={MARGEM.top}
              y2={BASELINE_Y}
              stroke="var(--color-line)"
            />
          )}

          {agregados.map((_, i) => {
            const larguraSlot = (LARGURA - MARGEM.left - MARGEM.right) / 7
            const x = escalaX(i, 7)
            return (
              <rect
                key={i}
                x={x - larguraSlot / 2}
                y={0}
                width={larguraSlot}
                height={ALTURA}
                fill="transparent"
                onMouseEnter={(e) => abrirTooltip(e, i)}
                onMouseLeave={fecharTooltip}
                className="cursor-default"
              />
            )
          })}
        </svg>
        </div>

        <p className="mt-2 text-center text-xs text-muted">
          Total na semana: {totalHoras.toFixed(1)}h · {totalQuestoes} questões
          {diasComQuestoes.length > 0 ? ` · acertos no total de questões: ${mediaDesempenho}%` : ''}
        </p>
      </div>

      <div className="rounded-md bg-soft p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
          <IconBook className="h-3.5 w-3.5" />
          Tempo por matéria
        </p>
        {tempoPorMateria.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhum estudo registrado nessa semana.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tempoPorMateria.map(({ materia, minutos }) => {
              const estilo = SUBJECT_STYLES[materia.cor]
              return (
                <div key={materia.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-ink">{materia.nome}</span>
                    <span className="shrink-0 text-muted">{formatarMinutos(minutos)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${estilo.bar}`}
                      style={{ width: `${(minutos / maxMinutosMateria) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>

      <details className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer text-sm">Ver valores por dia</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Valores da semana por dia</caption><thead><tr><th scope="col" className="p-2">Dia</th><th scope="col" className="p-2">Tempo</th><th scope="col" className="p-2">Questões</th><th scope="col" className="p-2">Acertos</th></tr></thead><tbody>{agregados.map(dia => <tr key={dia.data.toISOString()} className="border-t border-line"><th scope="row" className="p-2 font-normal">{dia.data.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</th><td className="p-2">{dia.tempoMinutos} min</td><td className="p-2">{dia.questoes}</td><td className="p-2">{dia.questoes ? `${dia.acertos} (${dia.desempenho}%)` : 'Sem questões'}</td></tr>)}</tbody></table></div></details>
      {hoverIndex !== null &&
        hoverPos &&
        createPortal(
          <div
            className="animate-tooltip pointer-events-none fixed z-50 w-max -translate-x-1/2 -translate-y-full rounded-lg bg-canvas px-3 py-2 text-xs text-ink shadow-[0_4px_16px_rgba(0,0,0,0.4)] ring-1 ring-line"
            style={{ top: hoverPos.top - 8, left: hoverPos.left }}
          >
            <p className="mb-1 font-semibold text-ink">
              {agregados[hoverIndex].data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            <p className="text-ink">{horas[hoverIndex].toFixed(1)}h de estudo</p>
            <p className="text-ink">{agregados[hoverIndex].questoes} questões respondidas</p>
            <p className="text-ink">
              {agregados[hoverIndex].questoes > 0 ? `${agregados[hoverIndex].desempenho}% de acerto` : 'sem questões respondidas'}
            </p>
            <span className="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 rounded-[2px] bg-canvas ring-1 ring-line" />
          </div>,
          document.body,
        )}
    </div>
  )
}
