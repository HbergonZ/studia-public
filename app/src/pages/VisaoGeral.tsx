import { useMemo, useState } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { gradienteDesempenho } from '../lib/corDesempenho'
import { INTERVALOS_DIAS, proximaRevisao } from '../lib/curva'
import Modal from '../components/Modal'
import Tooltip from '../components/Tooltip'
import { IconCalendar, IconEye, IconFlag, IconClock, IconSearch } from '../components/icons'
import type { Materia, Sessao, Topico } from '../types'

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function percentualDesempenho(topico: Topico) {
  const total = topico.questoes.acertos + topico.questoes.erros
  if (total === 0) return null
  return Math.round((topico.questoes.acertos / total) * 100)
}

function hexParaRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

function interpolarHex(corA: string, corB: string, t: number) {
  const [r1, g1, b1] = hexParaRgb(corA)
  const [r2, g2, b2] = hexParaRgb(corB)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function corDificuldade(indice: number) {
  const t = indice / 9
  if (t <= 0.5) return interpolarHex('#3b82f6', '#eab308', t / 0.5)
  return interpolarHex('#eab308', '#ef4444', (t - 0.5) / 0.5)
}

function MedidorDificuldade({ valor }: { valor: number }) {
  return (
    <Tooltip texto={`${valor}/10`}>
      <span className="inline-flex items-center gap-[3px]">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i < valor ? '' : 'bg-white/10'}`}
            style={i < valor ? { backgroundColor: corDificuldade(i) } : undefined}
          />
        ))}
      </span>
    </Tooltip>
  )
}

function TabelaHistorico({ sessoes }: { sessoes: Sessao[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-slate-500">
          <th className="pb-2 pr-3 font-medium">Data</th>
          <th className="pb-2 pr-3 text-center font-medium">Total</th>
          <th className="pb-2 pr-3 text-center font-medium">Acertos</th>
          <th className="pb-2 pr-3 text-center font-medium">Erros</th>
          <th className="pb-2 text-center font-medium">%</th>
        </tr>
      </thead>
      <tbody>
        {sessoes.map((sessao) => {
          const total = sessao.acertos + sessao.erros
          const pct = total === 0 ? 0 : Math.round((sessao.acertos / total) * 100)
          return (
            <tr key={sessao.id} className="border-t border-white/5">
              <td className="py-2 pr-3 whitespace-nowrap text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <IconCalendar className="h-3.5 w-3.5 text-slate-500" />
                  {formatarData(sessao.data)}
                </span>
              </td>
              <td className="py-2 pr-3 text-center text-slate-300">{total}</td>
              <td className="py-2 pr-3 text-center text-emerald-400">{sessao.acertos}</td>
              <td className="py-2 pr-3 text-center text-red-400">{sessao.erros}</td>
              <td className="py-2 text-center text-slate-300">{pct}%</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

type FiltroStatus = 'todos' | 'pendentes' | 'concluidos'

export default function VisaoGeral() {
  const { materias, sessoes, marcarComoRevisado } = useEstudo()
  const [detalhe, setDetalhe] = useState<{ materia: Materia; topico: Topico } | null>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')

  const sessoesDoTopico = useMemo(() => {
    if (!detalhe) return []
    return sessoes
      .filter((s) => s.topicoId === detalhe.topico.id)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
  }, [sessoes, detalhe])
  const primeiroEstudo = sessoesDoTopico[0]
  const revisoes = sessoesDoTopico.slice(1)

  const linhas = useMemo(
    () => materias.flatMap((materia) => materia.topicos.map((topico) => ({ materia, topico }))),
    [materias],
  )

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return linhas.filter(({ topico }) => {
      const concluido = topico.posicaoCurva >= INTERVALOS_DIAS.length
      if (filtro === 'pendentes' && concluido) return false
      if (filtro === 'concluidos' && !concluido) return false
      if (termo && !topico.nome.toLowerCase().includes(termo)) return false
      return true
    })
  }, [linhas, filtro, busca])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progresso do edital</p>
          <h1 className="font-display text-2xl font-semibold text-white">Tópicos</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar tópico..."
              className="w-52 rounded-full border border-white/10 bg-navy-900 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-400/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-navy-900 p-1">
            {(
              [
                ['todos', 'Todos'],
                ['pendentes', 'Pendentes'],
                ['concluidos', 'Concluídos'],
              ] as [FiltroStatus, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filtro === valor ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-900 p-4">
        <div className="hidden items-center gap-6 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500 lg:flex">
          <div className="flex-1">Tópico</div>
          <div className="w-28 text-center">1º estudo</div>
          <div className="w-40">Desempenho</div>
          <div className="w-28 text-center">Última rev.</div>
          <div className="w-28 text-center">Próx. rev.</div>
          <div className="w-44 text-center">Status</div>
        </div>

        {linhasFiltradas.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Nenhum tópico encontrado.</p>
        )}

        <div className="flex flex-col gap-3">
          {linhasFiltradas.map(({ materia, topico }) => {
            const estilo = SUBJECT_STYLES[materia.cor]
            const pct = percentualDesempenho(topico)
            const proxima = proximaRevisao(topico)
            const concluido = topico.posicaoCurva >= INTERVALOS_DIAS.length

            return (
              <div
                key={topico.id}
                className="flex flex-col gap-4 rounded-xl bg-navy-850 p-4 lg:flex-row lg:items-center lg:gap-6"
              >
                <div className="min-w-0 lg:flex-1">
                  <p className="font-medium text-slate-100">{topico.nome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estilo.chip}`}>
                      {materia.nome}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    Dificuldade: <MedidorDificuldade valor={topico.dificuldade} />
                  </div>
                </div>

                <div className="lg:w-28 lg:text-center">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500 lg:hidden">1º estudo</p>
                  {topico.primeiraRevisao ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">
                      <IconCalendar className="h-3 w-3 text-slate-400" />
                      {formatarData(topico.primeiraRevisao)}
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                      Pendente
                    </span>
                  )}
                </div>

                <div className="lg:w-40">
                  <div className="flex items-center gap-2">
                    <div
                      className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                      style={pct !== null ? { background: gradienteDesempenho() } : undefined}
                    >
                      {pct !== null && (
                        <div
                          className="absolute inset-y-0 right-0 bg-slate-700 transition-[width] duration-700 ease-out"
                          style={{ width: `${100 - pct}%` }}
                        />
                      )}
                    </div>
                    <span className="w-9 shrink-0 text-xs text-slate-300">{pct === null ? '—' : `${pct}%`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetalhe({ materia, topico })}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-400 underline underline-offset-2 transition-colors hover:text-brand-300"
                  >
                    <IconEye className="h-3.5 w-3.5" />
                    Ver detalhes
                  </button>
                </div>

                <div className="lg:w-28 lg:text-center">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500 lg:hidden">
                    Última revisão
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-slate-300">
                    {topico.ultimaRevisao && <IconCalendar className="h-3.5 w-3.5 text-slate-500" />}
                    {topico.ultimaRevisao ? formatarData(topico.ultimaRevisao) : '—'}
                  </span>
                </div>

                <div className="lg:w-28 lg:text-center">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500 lg:hidden">
                    Próxima revisão
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-slate-300">
                    {proxima && <IconCalendar className="h-3.5 w-3.5 text-slate-500" />}
                    {proxima ? formatarData(proxima.toISOString()) : '—'}
                  </span>
                </div>

                <div className="flex justify-center lg:w-44">
                  {concluido ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300">
                      Concluído
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => marcarComoRevisado(materia.id, topico.id)}
                      className="w-full rounded-full border border-brand-400/40 px-3.5 py-1.5 text-xs font-medium text-brand-300 transition-colors hover:border-brand-400/70 hover:bg-brand-500/10 lg:w-auto"
                    >
                      Marcar como revisado
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {detalhe && (
        <Modal titulo={detalhe.topico.nome} onFechar={() => setDetalhe(null)} largura="lg">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${SUBJECT_STYLES[detalhe.materia.cor].chip}`}
            >
              {detalhe.materia.nome}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">
              Dificuldade {detalhe.topico.dificuldade}/10
            </span>
          </div>

          <div className="mb-4 rounded-xl bg-navy-850 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <IconFlag className="h-3.5 w-3.5" />
              1º estudo
            </h3>
            {primeiroEstudo ? (
              <TabelaHistorico sessoes={[primeiroEstudo]} />
            ) : (
              <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">
                Ainda não estudado.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-navy-850 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <IconClock className="h-3.5 w-3.5" />
              Revisões
            </h3>
            {revisoes.length > 0 ? (
              <TabelaHistorico sessoes={revisoes} />
            ) : (
              <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">
                Nenhuma revisão registrada ainda.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
