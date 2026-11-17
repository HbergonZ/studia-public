import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstudo } from '../context/EstudoContext'
import AlertaHoje from '../components/AlertaHoje'
import CalendarioSecao from '../components/CalendarioSecao'
import CronogramaSecao from '../components/CronogramaSecao'
import PlanejamentoSecao from '../components/PlanejamentoSecao'
import MetasSecao from '../components/MetasSecao'
import TabelaMaterias from '../components/TabelaMaterias'
import GraficoSemana from '../components/GraficoSemana'
import PomodoroFoco from '../components/Pomodoro'
import { calcularDesempenho, inicioDoDia } from '../lib/curva'
import { calcularStreak, chaveDia, diasEstudadosDe } from '../lib/streak'
import { DURACOES_POMODORO, LABELS_POMODORO, formatarTempo, usePomodoro, type ModoPomodoro } from '../lib/pomodoro'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { IconCheckCircle, IconBook, IconClock } from '../components/icons'

function clamp(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor))
}

function CardPrimeiroAcesso() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-160px)] max-w-4xl items-center">
      <div className="flex w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-navy-900 md:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-4 p-10 md:p-12">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-400">Primeiro passo</span>
          <h1 className="font-display text-2xl font-bold leading-snug text-white sm:text-[26px]">
            Selecione um edital para estudar
          </h1>
          <p className="text-base text-slate-400">
            Ative um dos seus editais ou importe um novo para organizar o cronograma.
          </p>
          <button
            type="button"
            onClick={() => navigate('/editais')}
            className="self-start rounded-xl bg-brand-600 px-6 py-3 font-medium text-white transition-all duration-150 hover:scale-[1.015] hover:bg-brand-500 active:scale-[0.985]"
          >
            Gerenciar editais
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-navy-850 p-8">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(circle at 60% 40%, rgba(108,76,232,0.25), transparent 60%)' }}
          />
          <div className="relative flex w-full max-w-[220px] flex-col gap-2.5">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-navy-900 px-3.5 py-3">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--color-chart-desempenho)' }}
              />
              <span className="h-2 flex-1 rounded bg-white/10" />
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-navy-900 px-3.5 py-3">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--color-chart-questoes)' }}
              />
              <span className="h-2 w-[65%] rounded bg-white/10" />
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-navy-900 px-3.5 py-3 opacity-60">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--color-brand-400)' }} />
              <span className="h-2 w-[45%] rounded bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { nomeEdital, materias, sessoes, statusEdital } = useEstudo()
  const pomodoro = usePomodoro()
  const [editandoTempo, setEditandoTempo] = useState(false)

  const horasPomodoro = Math.floor(pomodoro.restante / 3600)
  const minutosPomodoro = Math.floor((pomodoro.restante % 3600) / 60)
  const segundosPomodoro = pomodoro.restante % 60

  const topicos = materias.flatMap((m) => m.topicos)
  const total = topicos.length
  const cobertos = topicos.filter((t) => t.ultimaRevisao).length
  const dominados = topicos.filter((t) => calcularDesempenho(t.questoes) === 'bom').length
  const fracos = topicos.filter((t) => calcularDesempenho(t.questoes) === 'ruim').length
  const percentualCoberto = total === 0 ? 0 : Math.round((cobertos / total) * 100)

  const hoje = useMemo(() => inicioDoDia(new Date()), [])
  const diasEstudados = useMemo(() => diasEstudadosDe(sessoes), [sessoes])
  const streak = useMemo(() => calcularStreak(diasEstudados, hoje), [diasEstudados, hoje])
  const ultimos7Dias = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoje)
        d.setDate(d.getDate() - (6 - i))
        return d
      }),
    [hoje],
  )

  if (materias.length === 0) {
    return <CardPrimeiroAcesso />
  }

  return (
    <div className="relative">
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8">
        <div>
          <p className="text-sm text-slate-500">Edital em andamento</p>
          <h1 className="font-display text-2xl font-semibold text-white">{nomeEdital}</h1>
          {statusEdital !== 'confirmado' && (
            <p className="mt-1 text-sm text-amber-400">
              Extração ainda não confirmada. Vá em "Edital" para revisar antes do cronograma valer oficialmente.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
          <div className="lg:col-span-2">
            <AlertaHoje />
          </div>
          <div className="flex flex-col gap-4 lg:[&>div]:flex-1">
            <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <IconCheckCircle className="h-4 w-4" />
                Progresso geral
              </h2>
              <div className="flex items-center gap-4">
                <ProgressoRing valor={percentualCoberto} />
                <div className="min-w-0">
                  <p className="font-display text-4xl font-semibold text-white">{percentualCoberto}%</p>
                  <p className="text-xs text-slate-500">do edital coberto</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-white/5 pt-4 text-sm">
                <span className="text-slate-300">
                  <strong className="font-display font-semibold text-white">{total}</strong> tópicos
                </span>
                <span className="h-4 w-px bg-white/10" />
                <span className="text-slate-300">
                  <strong className="font-display font-semibold text-emerald-400">{dominados}</strong> dominados
                </span>
                <span className="h-4 w-px bg-white/10" />
                <span className="text-slate-300">
                  <strong className="font-display font-semibold text-red-400">{fracos}</strong> fracos
                </span>
              </div>
            </div>

            {streak > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-navy-900 px-5 py-4">
                <div className="flex gap-1.5">
                  {ultimos7Dias.map((dia) => {
                    const estudou = diasEstudados.has(chaveDia(dia))
                    const ehHoje = chaveDia(dia) === chaveDia(hoje)
                    return (
                      <span
                        key={dia.toISOString()}
                        className={`h-3 w-3 rounded-[4px] ${estudou ? 'bg-emerald-500/80' : 'bg-white/10'} ${
                          ehHoje ? 'ring-1 ring-brand-400' : ''
                        }`}
                      />
                    )
                  })}
                </div>
                <span className="text-sm text-slate-400">
                  {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-navy-900 p-4">
              <div className="flex gap-1 rounded-lg bg-navy-850 p-1 text-xs">
                {(Object.keys(DURACOES_POMODORO) as ModoPomodoro[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pomodoro.trocarModo(m)}
                    className={`flex-1 rounded-md px-2 py-1 transition-colors ${
                      pomodoro.modo === m ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {LABELS_POMODORO[m]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-500">
                  <IconClock className="h-5 w-5 text-brand-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Sessão de foco</p>
                  {editandoTempo ? (
                    <div
                      className="flex items-center gap-0.5"
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setEditandoTempo(false)
                      }}
                    >
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={String(horasPomodoro).padStart(2, '0')}
                        aria-label="Horas"
                        onChange={(e) =>
                          pomodoro.aplicarTempo(clamp(Number(e.target.value), 0, 99), minutosPomodoro, segundosPomodoro)
                        }
                        onKeyDown={(e) => e.key === 'Enter' && setEditandoTempo(false)}
                        autoFocus
                        className="campo-tempo-pomodoro w-7 rounded bg-navy-850 text-center font-display text-lg font-semibold text-white outline-none"
                      />
                      <span className="font-display text-lg font-semibold text-slate-500">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={String(minutosPomodoro).padStart(2, '0')}
                        aria-label="Minutos"
                        onChange={(e) =>
                          pomodoro.aplicarTempo(horasPomodoro, clamp(Number(e.target.value), 0, 59), segundosPomodoro)
                        }
                        onKeyDown={(e) => e.key === 'Enter' && setEditandoTempo(false)}
                        className="campo-tempo-pomodoro w-7 rounded bg-navy-850 text-center font-display text-lg font-semibold text-white outline-none"
                      />
                      <span className="font-display text-lg font-semibold text-slate-500">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={String(segundosPomodoro).padStart(2, '0')}
                        aria-label="Segundos"
                        onChange={(e) =>
                          pomodoro.aplicarTempo(horasPomodoro, minutosPomodoro, clamp(Number(e.target.value), 0, 59))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && setEditandoTempo(false)}
                        className="campo-tempo-pomodoro w-7 rounded bg-navy-850 text-center font-display text-lg font-semibold text-white outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !pomodoro.rodando && setEditandoTempo(true)}
                      className={`font-display text-lg font-semibold text-white ${!pomodoro.rodando ? 'rounded transition-colors hover:bg-white/10' : ''}`}
                    >
                      {formatarTempo(pomodoro.restante)}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!pomodoro.rodando) {
                      document.documentElement.requestFullscreen?.().catch(() => {})
                    }
                    pomodoro.alternarPlay()
                  }}
                  className="shrink-0 rounded-full border border-brand-400/40 px-4 py-1.5 text-xs font-medium text-brand-300 transition-colors hover:bg-brand-500/10"
                >
                  {pomodoro.rodando ? 'Pausar' : 'Iniciar'}
                </button>
              </div>
            </div>

            <MetasSecao />
          </div>
        </div>

        <CalendarioSecao />

        <CronogramaSecao />

        <PlanejamentoSecao />

        <GraficoSemana />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-navy-900 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <IconBook className="h-4 w-4" />
              Progresso por matéria
            </h2>
            <div className="flex flex-col gap-2">
              {materias.map((materia) => {
                const totalMateria = materia.topicos.length
                const cobertosMateria = materia.topicos.filter((t) => t.ultimaRevisao).length
                const pct = totalMateria === 0 ? 0 : Math.round((cobertosMateria / totalMateria) * 100)
                const estilo = SUBJECT_STYLES[materia.cor]
                return (
                  <div key={materia.id} className="rounded-xl bg-navy-850 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-slate-100">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${estilo.dot}`} />
                        <span className="truncate">{materia.nome}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-slate-500">
                        peso {materia.peso} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ease-out ${estilo.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <TabelaMaterias />
        </div>
      </div>

      <PomodoroFoco estado={pomodoro} />
    </div>
  )
}

function ProgressoRing({ valor }: { valor: number }) {
  const raio = 37
  const circunferencia = 2 * Math.PI * raio
  const offset = circunferencia * (1 - valor / 100)

  return (
    <svg width="86" height="86" viewBox="0 0 86 86" className="shrink-0 -rotate-90">
      <circle cx="43" cy="43" r={raio} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle
        cx="43"
        cy="43"
        r={raio}
        fill="none"
        stroke="var(--color-brand-400)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  )
}
