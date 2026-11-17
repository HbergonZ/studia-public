import { useEffect, useState, type MouseEvent } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { DIAS_ORDEM, alocarDia, alocarTopicos, type AlocacaoMateria } from '../lib/planejamento'
import type { Materia } from '../types'
import Modal from './Modal'
import { IconSchedule } from './icons'

function formatarMinutos(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

interface PopoverEstado {
  materia: Materia
  minutos: number
  top: number
  left: number
}

const LARGURA_POPOVER = 288
const MARGEM_TELA = 12

export default function PlanejamentoSecao() {
  const { disponibilidade, materias } = useEstudo()
  const [materiaSelecionada, setMateriaSelecionada] = useState<{ materia: Materia; minutos: number } | null>(null)
  const [popover, setPopover] = useState<PopoverEstado | null>(null)

  useEffect(() => {
    if (!popover) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopover(null)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [popover])

  function abrirTopicos(e: MouseEvent<HTMLButtonElement>, materia: Materia, minutos: number) {
    const ehMobile = window.innerWidth < 768
    if (ehMobile) {
      setMateriaSelecionada({ materia, minutos })
      return
    }
    const esquerda = Math.min(
      Math.max(MARGEM_TELA, e.clientX),
      window.innerWidth - LARGURA_POPOVER - MARGEM_TELA,
    )
    const altura = Math.min(420, window.innerHeight - MARGEM_TELA * 2)
    const topo = Math.max(MARGEM_TELA, Math.min(e.clientY, window.innerHeight - altura - MARGEM_TELA))
    setPopover({ materia, minutos, top: topo, left: esquerda })
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <IconSchedule className="h-4 w-4" />
          Planejamento semanal
        </h2>
        <p className="text-sm text-muted">
          Sugestão de como distribuir o tempo disponível de cada dia entre as matérias, proporcional à
          importância delas. Clique numa matéria pra ver quais tópicos focar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DIAS_ORDEM.map(({ chave, label }) => {
          const horas = disponibilidade[chave]
          const alocacoes = alocarDia(horas, materias)
          return (
            <div key={chave} className="rounded-md bg-soft p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-ink">{label}</p>
                <span className="text-xs text-muted">{horas}h disponíveis</span>
              </div>

              {alocacoes.length === 0 ? (
                <p className="text-sm text-muted">Sem tempo disponível.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {alocacoes.map(({ materia, minutos }: AlocacaoMateria) => {
                    const estilo = SUBJECT_STYLES[materia.cor]
                    return (
                      <li key={materia.id}>
                        <button
                          type="button"
                          onClick={(e) => abrirTopicos(e, materia, minutos)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-line hover:bg-hover"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${estilo.dot}`} />
                            <span className="truncate text-sm text-ink">{materia.nome}</span>
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-xs text-muted">
                            {formatarMinutos(minutos)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {materiaSelecionada && (
        <Modal titulo={materiaSelecionada.materia.nome} onFechar={() => setMateriaSelecionada(null)}>
          <p className="mb-3 text-sm text-muted">
            {formatarMinutos(materiaSelecionada.minutos)} sugeridos, priorizando os tópicos mais difíceis.
          </p>
          <ul className="flex flex-col gap-2">
            {alocarTopicos(materiaSelecionada.materia, materiaSelecionada.minutos).map((t) => (
              <li
                key={t.topicoId}
                className="flex items-center justify-between rounded-lg bg-soft px-3 py-2 text-sm"
              >
                <span className="text-ink">{t.nome}</span>
                <span className="text-muted">{formatarMinutos(t.minutos)}</span>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="planning-topic-popover animate-modal fixed z-50 flex w-72 flex-col rounded-lg border border-line bg-surface p-4 shadow-2xl shadow-black/40"
            style={{ top: popover.top, left: popover.left }}
          >
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <p className="truncate font-semibold text-ink">{popover.materia.nome}</p>
              <button
                type="button"
                onClick={() => setPopover(null)}
                aria-label="Fechar"
                className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-hover hover:text-ink"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 shrink-0 text-xs text-muted">
              {formatarMinutos(popover.minutos)} sugeridos, priorizando os tópicos mais difíceis.
            </p>
            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {alocarTopicos(popover.materia, popover.minutos).map((t) => (
                <li
                  key={t.topicoId}
                  className="flex items-center justify-between gap-2 rounded-lg bg-soft px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-ink">{t.nome}</span>
                  <span className="shrink-0 text-muted">{formatarMinutos(t.minutos)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
