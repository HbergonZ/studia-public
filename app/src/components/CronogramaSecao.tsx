import { useState } from 'react'
import { useEstudo } from '../context/EstudoContext'
import StatusBadge from './StatusBadge'
import RegistrarSessaoModal from './RegistrarSessaoModal'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { IconClipboardList } from './icons'
import type { ItemCronograma, StatusItem } from '../types'

const grupos: { status: StatusItem; titulo: string }[] = [
  { status: 'atrasada', titulo: 'Atrasadas' },
  { status: 'hoje', titulo: 'Para hoje' },
  { status: 'novo', titulo: 'Conteúdo novo' },
  { status: 'futura', titulo: 'Próximas revisões' },
]

function formatarData(data: Date) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function CronogramaSecao() {
  const { cronograma } = useEstudo()
  const [itemSessao, setItemSessao] = useState<ItemCronograma | null>(null)

  function porStatus(status: StatusItem): ItemCronograma[] {
    return cronograma.filter((i) => i.status === status)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900 p-4">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <IconClipboardList className="h-4 w-4" />
          Cronograma completo
        </h2>
        <p className="text-sm text-slate-400">
          Prioridade do dia: revisões atrasadas primeiro, depois as de hoje, depois conteúdo novo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 xl:items-start">
        {grupos.map((grupo) => {
          const itens = porStatus(grupo.status)
          return (
            <section key={grupo.status}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {grupo.titulo} ({itens.length})
              </h3>
              {itens.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-500">
                  Nada por aqui.
                </p>
              ) : (
              <ul className="flex max-h-[536px] flex-col gap-2 overflow-y-auto pr-1">
                {itens.map((item) => {
                  const estilo = SUBJECT_STYLES[item.cor]
                  return (
                    <li
                      key={item.topico.id}
                      className={`flex shrink-0 flex-col gap-2 rounded-xl border-l-4 bg-navy-850 p-3 ${estilo.border}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />
                        <span className="text-xs text-slate-500">{formatarData(item.dataPrevista)}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${estilo.text}`}>
                            {item.materiaNome} · peso {item.peso}
                          </p>
                          <p className="font-medium text-slate-100">{item.topico.nome}</p>
                        </div>
                        {item.status !== 'futura' && (
                          <button
                            type="button"
                            onClick={() => setItemSessao(item)}
                            className="self-start whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white transition-all duration-150 hover:scale-[1.04] hover:bg-brand-500 active:scale-95"
                          >
                            Registrar sessão
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              )}
            </section>
          )
        })}
      </div>

      {itemSessao && (
        <RegistrarSessaoModal
          materiaId={itemSessao.materiaId}
          materiaNome={itemSessao.materiaNome}
          topicoId={itemSessao.topico.id}
          topicoNome={itemSessao.topico.nome}
          dificuldadeAtual={itemSessao.topico.dificuldade}
          onFechar={() => setItemSessao(null)}
        />
      )}
    </div>
  )
}
