import { useMemo, useState } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { itensDoDia, montarCronograma } from '../lib/cronograma'
import { inicioDoDia } from '../lib/curva'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import StatusBadge from './StatusBadge'
import RegistrarSessaoModal from './RegistrarSessaoModal'
import Tooltip from './Tooltip'
import { IconClock, IconPlay } from './icons'
import type { ItemCronograma } from '../types'

const diasSemana: (keyof ReturnType<typeof useEstudo>['disponibilidade'])[] = [
  'domingo',
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
]

const HORAS_POR_TOPICO = 1

function formatarEyebrow(data: Date) {
  const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function AlertaHoje() {
  const { materias, disponibilidade } = useEstudo()
  const hoje = useMemo(() => inicioDoDia(new Date()), [])
  const [diaSelecionado, setDiaSelecionado] = useState(hoje)
  const ehHoje = diaSelecionado.getTime() === hoje.getTime()

  const cronogramaDoDia = useMemo(
    () => montarCronograma(materias, diaSelecionado),
    [materias, diaSelecionado],
  )
  const doDia = itensDoDia(cronogramaDoDia)

  const diaSemana = diasSemana[diaSelecionado.getDay()]
  const horasDisponiveis = disponibilidade[diaSemana]
  const cabemNoDia = Math.floor(horasDisponiveis / HORAS_POR_TOPICO)

  const [itemSessao, setItemSessao] = useState<ItemCronograma | null>(null)
  const [finalizados, setFinalizados] = useState<ItemCronograma[]>([])

  function irParaDia(delta: number) {
    setDiaSelecionado((atual) => {
      const proximo = new Date(atual)
      proximo.setDate(proximo.getDate() + delta)
      return proximo
    })
  }

  const cabecalho = (
    <div className="mb-4 shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => irParaDia(-1)}
          disabled={ehHoje}
          aria-label="Dia anterior"
          className="rounded-lg px-1.5 py-0.5 text-muted transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          ‹
        </button>
        <p className="text-xs font-medium text-muted">
          {formatarEyebrow(diaSelecionado)}
        </p>
        <button
          type="button"
          onClick={() => irParaDia(1)}
          aria-label="Próximo dia"
          className="rounded-lg px-1.5 py-0.5 text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          ›
        </button>
        {!ehHoje && (
          <button
            type="button"
            onClick={() => setDiaSelecionado(hoje)}
            className="text-xs text-brand-600 underline underline-offset-2 transition-colors hover:text-brand-600"
          >
            voltar para hoje
          </button>
        )}
      </div>
      <h2 className="font-display mt-1 text-2xl font-semibold text-ink">
        {ehHoje ? 'O que estudar hoje' : 'O que estudar nesse dia'}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {horasDisponiveis}h disponíveis. Tempo para cerca de {cabemNoDia} {cabemNoDia === 1 ? 'tópico' : 'tópicos'}.
      </p>
    </div>
  )

  const finalizadosHoje = ehHoje ? finalizados : []

  if (doDia.length === 0 && finalizadosHoje.length === 0) {
    return (
      <div className="h-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
        {cabecalho}
        <p className="font-medium text-emerald-700">Nada pendente {ehHoje ? 'para hoje' : 'para esse dia'} 🎉</p>
        <p className="text-sm text-emerald-700/80">Tudo em dia com o cronograma.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-brand-500/20 bg-surface p-5 lg:h-[584px]">
      {cabecalho}

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {doDia.map((item, index) => (
          <li
            key={item.topico.id}
            className={`flex flex-col gap-2 rounded-md border-l-[3px] bg-soft p-3 sm:flex-row sm:items-center sm:justify-between ${SUBJECT_STYLES[item.cor].border}`}
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                {index >= cabemNoDia && (
                  <Tooltip texto="Fora do tempo disponível hoje. Se não for estudado, passa para o dia seguinte.">
                    <IconClock className="h-4 w-4 text-amber-700" />
                  </Tooltip>
                )}
              </div>
              <p className={`text-xs font-medium ${SUBJECT_STYLES[item.cor].text}`}>{item.materiaNome}</p>
              <p className="font-medium text-ink">{item.topico.nome}</p>
            </div>
            {ehHoje ? (
              <button
                type="button"
                onClick={() => setItemSessao(item)}
                aria-label={`Registrar sessão de ${item.topico.nome}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-full bg-brand-600 text-on-brand transition-all duration-150 hover:scale-110 hover:bg-brand-500 active:scale-95 sm:self-auto"
              >
                <IconPlay className="ml-0.5 h-4 w-4" />
              </button>
            ) : (
              <span className="shrink-0 text-xs text-muted">prévia · registro só vale para hoje</span>
            )}
          </li>
        ))}
        {finalizadosHoje.map((item) => (
          <li
            key={item.topico.id}
            className={`flex flex-col gap-2 rounded-md border-l-[3px] bg-soft p-3 opacity-60 sm:flex-row sm:items-center sm:justify-between ${SUBJECT_STYLES[item.cor].border}`}
          >
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${SUBJECT_STYLES[item.cor].text}`}>{item.materiaNome}</p>
              <p className="font-medium text-ink line-through decoration-slate-500">{item.topico.nome}</p>
            </div>
            <span className="shrink-0 self-start whitespace-nowrap rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-xs font-medium text-emerald-700 sm:self-auto">
              ✓ Finalizado
            </span>
          </li>
        ))}
      </ul>

      {itemSessao && (
        <RegistrarSessaoModal
          materiaId={itemSessao.materiaId}
          materiaNome={itemSessao.materiaNome}
          topicoId={itemSessao.topico.id}
          topicoNome={itemSessao.topico.nome}
          dificuldadeAtual={itemSessao.topico.dificuldade}
          onFechar={() => setItemSessao(null)}
          onSalvar={() => {
            setFinalizados((atual) => [...atual, itemSessao])
          }}
        />
      )}
    </div>
  )
}
