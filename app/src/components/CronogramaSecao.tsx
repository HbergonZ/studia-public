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
    <div className="review-kanban">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <IconClipboardList className="h-4 w-4" />
          Quadro de revisões
        </h2>
        <p className="text-sm text-muted">
          Este quadro mostra todo o conteúdo. O plano escolhe o que cabe no dia, equilibrando até duas revisões para um conteúdo novo quando ambos estão disponíveis.
        </p>
      </div>

      <div className="review-kanban-columns">
        {grupos.map((grupo) => {
          const itens = porStatus(grupo.status)
          return (
            <section key={grupo.status} className={`review-kanban-column status-${grupo.status}`}>
              <h3 className="review-kanban-heading">
                {grupo.titulo}<span>{itens.length}</span>
              </h3>
              {itens.length === 0 ? (
                <p className="rounded-md border border-dashed border-line p-3 text-sm text-muted">
                  Nada por aqui.
                </p>
              ) : (
              <ul className="flex max-h-[536px] flex-col gap-2 overflow-y-auto pr-1">
                {itens.map((item) => {
                  const estilo = SUBJECT_STYLES[item.cor]
                  return (
                    <li
                      key={item.topico.id}
                      className={`review-kanban-card ${estilo.border}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />
                        <span className="text-xs text-muted">{item.status === 'novo' ? (item.topico.emAndamento ? 'Em andamento' : 'Ainda não iniciado') : formatarData(item.dataPrevista)}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${estilo.text}`}>
                            {item.materiaNome} · peso {item.peso}
                          </p>
                          <p className="font-medium text-ink">{item.topico.nome}</p>
                        </div>
                        {item.status !== 'futura' && (
                          <button
                            type="button"
                            onClick={() => setItemSessao(item)}
                            className="self-start whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-on-brand transition-all duration-150 hover:scale-[1.04] hover:bg-brand-500 active:scale-95"
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
          concluirInicial={itemSessao.status !== 'novo' && !itemSessao.topico.emAndamento}
          onFechar={() => setItemSessao(null)}
        />
      )}
    </div>
  )
}
