import { lerData as diaCalendario } from '../lib/datas'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { inicioDoDia } from '../lib/curva'
import { calcularStreak, chaveDia, diasEstudadosDe } from '../lib/streak'
import { IconCalendar } from './icons'
import Tooltip from './Tooltip'
import { api } from '../lib/api'
import { lerData } from '../lib/datas'
import type { BlocoPlano } from '../types'
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

export default function CalendarioSecao({ somenteAtividade = false }: { somenteAtividade?: boolean }) {
  const { cronograma, sessoes, editalId, hoje: hojeEstudo } = useEstudo()
  const hoje = useMemo(() => inicioDoDia(diaCalendario(hojeEstudo)), [hojeEstudo])
  const [modo, setModo] = useState<'mes' | 'ano'>('mes')
  const [cursor, setCursor] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<Date>(hoje)

  const [planos, setPlanos] = useState<{ date: string; blocks: BlocoPlano[] }[]>([])
  const [erroPlanos, setErroPlanos] = useState('')
  const [tentativaPlanos, setTentativaPlanos] = useState(0)
  const anoCalendario = cursor.getFullYear()
  useEffect(() => {
    if (somenteAtividade) return
    let cancelado = false
    async function carregarPlanos() {
      try {
        const dados = await api<{ date: string; blocks: BlocoPlano[] }[]>(`/v1/planos?from=${anoCalendario}-01-01&to=${anoCalendario}-12-31`)
        if (!cancelado) { setPlanos(dados); setErroPlanos('') }
      } catch { if (!cancelado) setErroPlanos('Não foi possível carregar os planos salvos. As revisões continuam visíveis.'); }
    }
    void carregarPlanos()
    window.addEventListener('studia:plan-saved', carregarPlanos)
    window.addEventListener('studia:study-saved', carregarPlanos)
    return () => { cancelado = true; window.removeEventListener('studia:plan-saved', carregarPlanos); window.removeEventListener('studia:study-saved', carregarPlanos) }
  }, [editalId, anoCalendario, somenteAtividade, tentativaPlanos])

  const porDia = useMemo(() => {
    const mapa = new Map<string, ItemCronograma[]>()
    for (const item of cronograma) {
      if (item.status === 'novo') continue
      const chave = chaveDia(item.dataPrevista)
      const lista = mapa.get(chave) ?? []
      lista.push(item)
      mapa.set(chave, lista)
    }
    for (const plano of planos) {
      const itens = mapa.get(plano.date) ?? []
      for (const bloco of plano.blocks) {
        if (bloco.status !== 'planned') continue
        const item = cronograma.find(i => i.topico.id === bloco.topicId)
        if (item && !itens.some(i => i.topico.id === bloco.topicId)) itens.push({ ...item, dataPrevista: lerData(plano.date) })
      }
      mapa.set(plano.date, itens)
    }
    return mapa
  }, [cronograma, planos])

  const diasEstudados = useMemo(() => diasEstudadosDe(sessoes), [sessoes])

  const streak = useMemo(() => calcularStreak(diasEstudados, hoje), [diasEstudados, hoje])

  const grade = useMemo(() => montarGrade(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const itensDoDiaSelecionado = porDia.get(chaveDia(diaSelecionado)) ?? []

  const [anoHeatmapSelecionado, setAnoHeatmap] = useState(hoje.getFullYear())

  const anosDisponiveis = useMemo(() => {
    const anoAtual = hoje.getFullYear()
    const anosComHistorico = [...diasEstudados]
      .map((dia) => Number(dia.slice(0, 4)))
      .filter((ano) => ano < anoAtual)
    return [...new Set([anoAtual, ...anosComHistorico])].sort((a, b) => b - a)
  }, [diasEstudados, hoje])

  const anoHeatmap = anosDisponiveis.includes(anoHeatmapSelecionado)
    ? anoHeatmapSelecionado
    : hoje.getFullYear()

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
      const data = lerData(chave)
      return data >= inicio && data <= hoje
    }).length
  }, [diasEstudados, anoHeatmap, ehAnoAtual, diasHeatmap, hoje])

  const gradeHeatmapRef = useRef<HTMLDivElement>(null)
  const [tamanhoCelula, setTamanhoCelula] = useState(14)

  useEffect(() => {
    const el = gradeHeatmapRef.current
    if (!el) return
    const GAP = 4
    const MARGEM_ANEL = 3
    const colunas = semanasHeatmap.length

    function recalcular() {
      const largura = el!.clientWidth - MARGEM_ANEL
      const bruto = Math.floor((largura - GAP * (colunas - 1)) / colunas)
      setTamanhoCelula(Math.max(14, Math.min(18, bruto)))
    }

    recalcular()
    const observer = new ResizeObserver(recalcular)
    observer.observe(el)
    return () => observer.disconnect()
  }, [semanasHeatmap.length])

  const minutosPorDia = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const s of sessoes) {
      const chave = chaveDia(lerData(s.data))
      mapa.set(chave, (mapa.get(chave) ?? 0) + s.tempoMinutos)
    }
    return mapa
  }, [sessoes])

  const sessoesPorDiaHeatmap = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const s of sessoes) {
      const chave = chaveDia(lerData(s.data))
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

  const CORES_NIVEL = ['bg-line', 'bg-brand-500/25', 'bg-brand-500/60', 'bg-brand-600']

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
    <div className={`study-calendar rounded-lg border border-line bg-surface p-6 ${somenteAtividade ? 'activity-only' : ''}`}>
      {!somenteAtividade && erroPlanos && <p role="alert" className="daily-error">{erroPlanos} <button type="button" className="quiet-link" onClick={() => setTentativaPlanos(t => t + 1)}>Tentar carregar planos</button></p>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <IconCalendar className="h-4 w-4" />
            {somenteAtividade ? 'Histórico de estudos' : 'Calendário'}
          </h2>
          <p className="text-sm text-muted">
            {somenteAtividade ? 'Os dias em que você estudou, no seu ritmo.' : 'Consulte as revisões, os blocos confirmados e os dias em que você estudou.'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${somenteAtividade ? 'hidden' : ''}`}>
          {streak > 0 && (
            <span className="flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#fcd34d">
                <path d="M10 2s3 3.5 3 6.5a3 3 0 1 1-6 0c0-.9.4-1.7.9-2.3C8.2 7 8 8 8 8s-3 2.2-3 5.5a5 5 0 0 0 10 0C15 8 10 2 10 2Z" />
              </svg>
              <span className="font-display text-base font-semibold text-ink">{streak}</span>
              <span className="text-sm text-amber-700/90">{streak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
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
                ? 'border-brand-400/40 bg-brand-500/20 text-brand-600'
                : 'border-line bg-soft text-ink hover:bg-hover'
            }`}
          >
            {modo === 'ano' ? 'Ver mês' : 'Ver ano'}
          </button>
          <button
            type="button"
            onClick={irParaHoje}
            className="rounded-lg border border-line bg-soft px-3 py-1.5 text-sm text-ink transition-colors hover:bg-hover"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-md bg-soft p-4">
        <p className="mb-3 text-sm font-medium text-ink">
          {diasEstudadosNoAno} {diasEstudadosNoAno === 1 ? 'dia estudado' : 'dias estudados'}{' '}
          {ehAnoAtual ? 'no último ano' : `em ${anoHeatmap}`}
        </p>
        <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 rounded-md border border-line bg-surface p-4">
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-[6px]">
                <div
                  className="grid shrink-0 gap-[4px] pt-[18px]"
                  style={{ gridTemplateRows: `repeat(7, ${tamanhoCelula}px)` }}
                >
                  {ROTULOS_LINHA_ANO.map((rotulo, i) => (
                    <span
                      key={i}
                      className="flex items-center text-xs leading-none text-muted"
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
                      <span key={i} className="whitespace-nowrap text-xs leading-none text-muted">
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
                        <Tooltip key={chave} texto={textoTooltipHeatmap(dia)} onClick={() => selecionarDoAno(dia)}>
                          {celula}
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted">
              <span>menos</span>
              <span className="h-3 w-3 rounded-sm bg-line" />
              <span className="h-3 w-3 rounded-sm bg-brand-500/25" />
              <span className="h-3 w-3 rounded-sm bg-brand-500/60" />
              <span className="h-3 w-3 rounded-sm bg-brand-600" />
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
                    ? 'bg-brand-600 text-on-brand'
                    : 'text-muted hover:bg-hover hover:text-ink'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!somenteAtividade && (modo === 'ano' ? (
        <VisaoAno
          ano={anoSelecionado}
          diasEstudados={diasEstudados}
          hoje={hoje}
          onMudarAno={(delta) => setAnoSelecionado((a) => a + delta)}
          onSelecionarDia={selecionarDoAno}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-md bg-soft p-4 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => irParaMes(-1)}
                className="rounded-lg px-2 py-1 text-muted transition-colors hover:bg-hover hover:text-ink"
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <p className="font-medium text-ink">
                {MESES[cursor.getMonth()]} {cursor.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => irParaMes(1)}
                className="rounded-lg px-2 py-1 text-muted transition-colors hover:bg-hover hover:text-ink"
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
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
                if (ehHoje) classeNumero = 'bg-brand-500 text-on-brand font-semibold'
                else if (estudou) classeNumero = 'bg-brand-500/20 text-brand-600 font-semibold'

                return (
                  <button
                    type="button"
                    key={chave}
                    onClick={() => setDiaSelecionado(dia)}
                    className={[
                      'flex h-16 flex-col items-center justify-start gap-1 rounded-lg p-1 text-sm transition-all duration-150',
                      doMesAtual ? 'text-ink' : 'text-muted/60',
                      ehSelecionado ? 'bg-brand-600/25 ring-1 ring-brand-400' : 'hover:bg-hover',
                    ].join(' ')}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${classeNumero}`}>
                      {dia.getDate()}
                    </span>
                    <span className="flex flex-wrap justify-center gap-0.5">
                      {cores.map((cor) => (
                        <span key={cor} className={`h-1.5 w-1.5 rounded-full ${SUBJECT_STYLES[cor].dot}`} />
                      ))}
                      {itens.length > 4 && <span className="text-xs text-muted">+{itens.length - 4}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex max-h-96 min-h-0 flex-col rounded-md bg-soft p-4 lg:max-h-none lg:[contain:size]">
            <p className="mb-3 shrink-0 font-medium text-ink">
              {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            {itensDoDiaSelecionado.length === 0 ? (
              <p className="text-sm text-muted">Nada agendado para este dia.</p>
            ) : (
              <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
                {itensDoDiaSelecionado.map((item) => {
                  const estilo = SUBJECT_STYLES[item.cor]
                  return (
                    <li key={item.topico.id} className="flex shrink-0 items-center gap-3 rounded-md bg-surface p-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${estilo.dot}`} />
                      <div>
                        <p className={`text-xs font-medium ${estilo.text}`}>{item.materiaNome}</p>
                        <p className="text-sm text-ink">{item.topico.nome}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ))}
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
          className="rounded-lg px-2 py-1 text-muted transition-colors hover:bg-hover hover:text-ink"
          aria-label="Ano anterior"
        >
          ‹
        </button>
        <p className="font-medium text-ink">{ano}</p>
        <button
          type="button"
          onClick={() => onMudarAno(1)}
          className="rounded-lg px-2 py-1 text-muted transition-colors hover:bg-hover hover:text-ink"
          aria-label="Próximo ano"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {MESES_ABREV.map((label, mes) => {
          const grade = montarGrade(ano, mes)
          return (
            <div key={label} className="rounded-md bg-soft p-3">
              <p className="mb-2 text-xs font-medium text-ink">{label}</p>
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
                        estudou ? 'bg-emerald-500/80 hover:bg-emerald-400' : 'bg-line hover:bg-line-strong',
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
