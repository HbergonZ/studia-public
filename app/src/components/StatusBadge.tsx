import type { StatusItem } from '../types'

const estilos: Record<StatusItem, { label: string; classes: string }> = {
  atrasada: { label: 'Atrasada', classes: 'bg-red-500/15 text-red-700' },
  hoje: { label: 'Hoje', classes: 'bg-brand-500/20 text-brand-600' },
  futura: { label: 'Agendada', classes: 'bg-line text-ink' },
  novo: { label: 'Conteúdo novo', classes: 'bg-emerald-500/15 text-emerald-700' },
}

export default function StatusBadge({ status }: { status: StatusItem }) {
  const estilo = estilos[status]
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${estilo.classes}`}>
      {estilo.label}
    </span>
  )
}
