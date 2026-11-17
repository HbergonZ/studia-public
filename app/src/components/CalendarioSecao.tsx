import { useEffect, useMemo, useRef, useState } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { inicioDoDia } from '../lib/curva'
import { calcularStreak, chaveDia, diasEstudadosDe } from '../lib/streak'
import { IconCalendar } from './icons'
import Tooltip from './Tooltip'
import type { ItemCronograma } from '../types'

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function montarGrade(ano: number, mes: number): Date[] {
  const primeiroDia = new Date(ano, mes, 1)
  const offset = primeiroDia.getDay()
  const inicioGrade = new Date(ano, mes, 1 - offset)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicioGrade)
    d.setDate(inicioGrade.getDate() + i)
    return d
  })
}

export default function CalendarioSecao() {
  const { cronograma, sessoes } = useEstudo()
  const hoje = useMemo(() => inicioDoDia(new Date()), [])
  const [modo, setModo] = useState<'mes' | 'ano'>('mes')
  const [cursor, setCursor] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(hoje)

  const porDia = useMemo(() => {
    const mapa = new Map<string, ItemCronograma[]>()
    for (const item of cronograma) {
      const chave = chaveDia(item.dataPrevista)
      const lista = mapa.get(chave) ?? []
      lista.push(item)
      mapa.set(chave, lista)
    }
    return mapa
  }, [cronograma])

  const diasEstudados = useMemo(() => diasEstudadosDe(sessoes), [sessoes])

  const streak = useMemo(() => calcularStreak(diasEstudados, hoje), [diasEstudados, hoje])

  const grade = useMemo(() => montarGrade(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const itensDoDiaSelecionado = porDia.get(chaveDia(diaSelecionado)) ?? []

  const [anoHeatmap, setAnoHeatmap] = useState(hoje.getFullYear())

  const anosDisponiveis = useMemo(
    () => Array.from({ length: 5 }, (_, i) => hoje.getFullYear() - i),
    [hoje],
  )

  const ehAnoAtual = anoHeatmap === hoje.getFullYear()

  const diasHeatmap = useMemo(() => {
    let inicio: Date
    let fim: Date

    if (ehAnoAtual) {
      // Ano em andamento: mostra os últimos 12 meses terminando hoje, em vez do
      // ano-calendário inteiro (que deixaria os meses futuros em branco).
      fim = new Date(hoje)
      fim.setDate(fim.getDate() + (6 - fim.getDay()))
      inicio = new Date(fim)
      inicio.setDate(inicio.getDate() - (53 * 7 - 1))
    } else {
      inicio = new Date(anoHeatmap, 0, 1)
      inicio.setDate(inicio.getDate() - inicio.getDay())
      fim = new Date(anoHeatmap, 11, 31)
      fim.setDate(fim.getDate() + (6 - fim.getDay()))
    }

    const dias: Date[] = []
    const cursorDia = new Date(inicio)
    while (cursorDia.getTime() <= fim.getTime()) {
      dias.push(new Date(cursorDia))
      cursorDia.setDate(cursorDia.getDate() + 1)
    }
    return dias
  }, [anoHeatmap, ehAnoAtual, hoje])

  const semanasHeatmap = useMemo(() => {
    const out: Date[][] = []
    for (let i = 0; i < diasHeatmap.length; i += 7) out.push(diasHeatmap.slice(i, i + 7))
    return out
  }, [diasHeatmap])

  const ROTULOS_LINHA_ANO = ['', 'seg', '', 'qua', '', 'sex', '']

  function rotuloMesAno(indiceSemana: number) {
    const semana = semanasHeatmap[indiceSemana]
    const viradaDeMes = semana.find((d) => d.getDate() === 1)
    return viradaDeMes ? MESES_ABREV[viradaDeMes.getMonth()] : ''
  }

  function diaOcultoNoHeatmap(dia: Date) {
    return ehAnoAtual ? dia.getTime() > hoje.getTime() : dia.getFullYear() !== anoHeatmap
  }

  const diasEstudadosNoAno = useMemo(() => {
    if (!ehAnoAtual) return [...diasEstudados].filter((chave) => chave.startsWith(String(anoHeatmap))).length
    const inicio = diasHeatmap[0]
    return [...diasEstudados].filter((chave) => {
      const data = new Date(chave)
      return data >= inicio && data <= hoje
    }).length
  }, [diasEstudados, anoHeatmap, ehAnoAtual, diasHeatmap, hoje])

  const gradeHeatmapRef = useRef<HTMLDivElement>(null)
  const [tamanhoCelula, setTamanhoCelula] = useState(12)

  useEffect(() => {
    const el = gradeHeatmapRef.current
    if (!el) return
    const GAP = 4
    const MARGEM_ANEL = 3
    const colunas = semanasHeatmap.length

    function recalcular() {
      const largura = el!.clientWidth - MARGEM_ANEL
      const bruto = Math.floor((largura - GAP * (colunas - 1)) / colunas)
      setTamanhoCelula(Math.max(8, Math.min(18, bruto)))
    }

    recalcular()
    const observer = new ResizeObserver(recalcular)
    observer.observe(el)
    return () => observer.disconnect()
  }, [semanasHeatmap.length])

  const minutosPorDia = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const s of sessoes) {
      const chave = chaveDia(new Date(s.data))
      mapa.set(chave, (mapa.get(chave) ?? 0) + s.tempoMinutos)
    }
    return mapa
  }, [sessoes])

  const sessoesPorDiaHeatmap = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const s of sessoes) {
      const chave = chaveDia(new Date(s.data))
      mapa.set(chave, (mapa.get(chave) ?? 0) + 1)
    }
    return mapa
  }, [sessoes])

  function textoTooltipHeatmap(dia: Date) {
    const dataFormatada = dia.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    const qtd = sessoesPorDiaHeatmap.get(chaveDia(dia)) ?? 0
    if (qtd === 0) return `Nenhuma sessão em ${dataFormatada}`
    return `${qtd} ${qtd === 1 ? 'sessão de estudo' : 'sessões de estudo'} em ${dataFormatada}`
  }

  function nivelEstudo(minutos: number) {
    if (minutos <= 0) return 0
    if (minutos < 60) return 1
    if (minutos < 150) return 2
    return 3
  }

  const CORES_NIVEL = ['bg-white/10', 'bg-emerald-500/35', 'bg-emerald-500/65', 'bg-emerald-500/90']

  function irParaMes(delta: number) {
    setCursor((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1))
  }

  function irParaHoje() {
    setModo('mes')
    setCursor(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
    setDiaSelecionado(hoje)
  }

  function selecionarDoAno(dia: Date) {
    setCursor(new Date(dia.getFullYear(), dia.getMonth(), 1))
    setDiaSelecionado(dia)
    setModo('mes')
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <IconCalendar className="h-4 w-4" />
            Calendário
          </h2>
          <p className="text-sm text-slate-400">
            Bolinhas = tópicos agendados. Bolinha verde atrás do dia = você estudou nesse dia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#fcd34d">
                <path d="M10 2s3 3.5 3 6.5a3 3 0 1 1-6 0c0-.9.4-1.7.9-2.3C8.2 7 8 8 8 8s-3 2.2-3 5.5a5 5 0 0 0 10 0C15 8 10 2 10 2Z" />
              </svg>
              <span className="font-display text-base font-semibold text-white">{streak}</span>
              <span className="text-sm text-amber-300/90">{streak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setModo((m) => (m === 'ano' ? 'mes' : 'ano'))
              setAnoSelecionado(cursor.getFullYear())
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              modo === 'ano'
                ? 'border-brand-400/40 bg-brand-500/20 text-brand-300'
                : 'border-white/10 bg-navy-850 text-slate-200 hover:bg-navy-800'
            }`}
          >
            Ver ano
          </button>
          <button
            type="button"
            onClick={irParaHoje}
            className="rounded-lg border border-white/10 bg-navy-850 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-navy-800"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-navy-850 p-4">
        <p className="mb-3 text-sm font-medium text-white">
          {diasEstudadosNoAno} {diasEstudadosNoAno === 1 ? 'dia estudado' : 'dias estudados'}{' '}
          {ehAnoAtual ? 'no último ano' : `em ${anoHeatmap}`}
        </p>
        <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-navy-900 p-4">
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-[6px]">
                <div
                  className="grid shrink-0 gap-[4px] pt-[18px]"
                  style={{ gridTemplateRows: `repeat(7, ${tamanhoCelula}px)` }}
                >
                  {ROTULOS_LINHA_ANO.map((rotulo, i) => (
                    <span
                      key={i}
                      className="flex items-center text-[10px] leading-none text-slate-500"
                      style={{ height: tamanhoCelula }}
                    >
                      {rotulo}
                    </span>
                  ))}
                </div>
                <div ref={gradeHeatmapRef} className="min-w-0 flex-1">
                  <div
                    className="mb-1 grid gap-[4px]"
                    style={{ gridAutoFlow: 'column', gridAutoColumns: `${tamanhoCelula}px`, justifyContent: 'start' }}
                  >
                    {semanasHeatmap.map((_, i) => (
                      <span key={i} className="whitespace-nowrap text-[10px] leading-none text-slate-500">
                        {rotuloMesAno(i)}
                      </span>
                    ))}
                  </div>
                  <div
                    className="grid gap-[4px]"
                    style={{
                      gridAutoFlow: 'column',
                      gridTemplateRows: `repeat(7, ${tamanhoCelula}px)`,
                      justifyContent: 'start',
                    }}
                  >
                    {diasHeatmap.map((dia) => {
                      const chave = chaveDia(dia)
                      const oculto = diaOcultoNoHeatmap(dia)
                      const nivel = nivelEstudo(minutosPorDia.get(chave) ?? 0)
                      const ehHoje = chave === chaveDia(hoje)
                      const celula = (
                        <div
                          style={{ width: tamanhoCelula, height: tamanhoCelula }}
                          className={`rounded-sm ${
                            oculto ? 'bg-transparent' : CORES_NIVEL[nivel]
                          } ${ehHoje ? 'ring-1 ring-brand-400' : ''}`}
                        />
                      )
                      if (oculto) return <span key={chave}>{celula}</span>
                      return (
                        <Tooltip key={chave} texto={textoTooltipHeatmap(dia)}>
                          {celula}
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
              <span>menos</span>
              <span className="h-3 w-3 rounded-sm bg-white/10" />
              <span className="h-3 w-3 rounded-sm bg-emerald-500/35" />
              <span className="h-3 w-3 rounded-sm bg-emerald-500/65" />
              <span className="h-3 w-3 rounded-sm bg-emerald-500/90" />
              <span>mais</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-visible">
            {anosDisponiveis.map((ano) => (
              <button
                key={ano}
                type="button"
                onClick={() => setAnoHeatmap(ano)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  ano === anoHeatmap
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:bg-navy-800 hover:text-white'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modo === 'ano' ? (
        <VisaoAno
          ano={anoSelecionado}
          diasEstudados={diasEstudados}
          hoje={hoje}
          onMudarAno={(delta) => setAnoSelecionado((a) => a + delta)}
          onSelecionarDia={selecionarDoAno}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-navy-850 p-4 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => irParaMes(-1)}
                className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-navy-800 hover:text-white"
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <p className="font-medium text-white">
                {MESES[cursor.getMonth()]} {cursor.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => irParaMes(1)}
                className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-navy-800 hover:text-white"
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grade.map((dia) => {
                const doMesAtual = dia.getMonth() === cursor.getMonth()
                const chave = chaveDia(dia)
                const itens = porDia.get(chave) ?? []
                const ehHoje = chave === chaveDia(hoje)
                const ehSelecionado = chave === chaveDia(diaSelecionado)
                const estudou = diasEstudados.has(chave)
                const cores = [...new Set(itens.map((i) => i.cor))].slice(0, 4)

                let classeNumero = ''
                if (ehHoje) classeNumero = 'bg-brand-500 text-white font-semibold'
                else if (estudou) classeNumero = 'bg-emerald-500/80 text-white font-semibold'

                return (
                  <button
                    type="button"
                    key={chave}
                    onClick={() => setDiaSelecionado(dia)}
                    className={[
                      'flex h-16 flex-col items-center justify-start gap-1 rounded-lg p-1 text-sm transition-all duration-150',
                      doMesAtual ? 'text-slate-200' : 'text-slate-700',
                      ehSelecionado ? 'bg-brand-600/25 ring-1 ring-brand-400' : 'hover:bg-navy-800',
                    ].join(' ')}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${classeNumero}`}>
                      {dia.getDate()}
                    </span>
                    <span className="flex flex-wrap justify-center gap-0.5">
                      {cores.map((cor) => (
                        <span key={cor} className={`h-1.5 w-1.5 rounded-full ${SUBJECT_STYLES[cor].dot}`} />
                      ))}
                      {itens.length > 4 && <span className="text-[10px] text-slate-500">+{itens.length - 4}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex max-h-96 min-h-0 flex-col rounded-xl bg-navy-850 p-4 lg:max-h-none lg:[contain:size]">
            <p className="mb-3 shrink-0 font-medium text-white">
              {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            {itensDoDiaSelecionado.length === 0 ? (
              <p className="text-sm text-slate-500">Nada agendado para este dia.</p>
            ) : (
              <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                {itensDoDiaSelecionado.map((item) => {
                  const estilo = SUBJECT_STYLES[item.cor]
                  return (
                    <li key={item.topico.id} className="flex shrink-0 items-center gap-3 rounded-xl bg-navy-900 p-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${estilo.dot}`} />
                      <div>
                        <p className={`text-xs font-medium ${estilo.text}`}>{item.materiaNome}</p>
                        <p className="text-sm text-slate-100">{item.topico.nome}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function VisaoAno({
  ano,
  diasEstudados,
  hoje,
  onMudarAno,
  onSelecionarDia,
}: {
  ano: number
  diasEstudados: Set<string>
  hoje: Date
  onMudarAno: (delta: number) => void
  onSelecionarDia: (dia: Date) => void
}) {
  const chaveHoje = chaveDia(hoje)

  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => onMudarAno(-1)}
          className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-navy-800 hover:text-white"
          aria-label="Ano anterior"
        >
          ‹
        </button>
        <p className="font-medium text-white">{ano}</p>
        <button
          type="button"
          onClick={() => onMudarAno(1)}
          className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-navy-800 hover:text-white"
          aria-label="Próximo ano"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {MESES_ABREV.map((label, mes) => {
          const grade = montarGrade(ano, mes)
          return (
            <div key={label} className="rounded-xl bg-navy-850 p-3">
              <p className="mb-2 text-xs font-medium text-slate-300">{label}</p>
              <div className="grid grid-cols-7 gap-[4px]">
                {grade.map((dia) => {
                  const doMesAtual = dia.getMonth() === mes
                  if (!doMesAtual) return <span key={dia.toISOString()} className="h-3 w-3" />
                  const chave = chaveDia(dia)
                  const estudou = diasEstudados.has(chave)
                  const ehHoje = chave === chaveHoje
                  return (
                    <button
                      type="button"
                      key={chave}
                      onClick={() => onSelecionarDia(dia)}
                      title={dia.toLocaleDateString('pt-BR')}
                      className={[
                        'h-3 w-3 rounded-sm transition-colors',
                        estudou ? 'bg-emerald-500/80 hover:bg-emerald-400' : 'bg-white/10 hover:bg-white/20',
                        ehHoje ? 'ring-1 ring-brand-400' : '',
                      ].join(' ')}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
