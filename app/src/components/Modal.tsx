import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  titulo: string
  onFechar: () => void
  children: ReactNode
  largura?: 'sm' | 'md' | 'lg'
}

const LARGURAS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Modal({ titulo, onFechar, children, largura = 'sm' }: ModalProps) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onFechar])

  return (
    <div
      className="animate-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`animate-modal flex max-h-[80vh] w-full flex-col ${LARGURAS[largura]} rounded-2xl border border-white/10 bg-navy-900 p-5 shadow-xl`}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <p className="font-semibold text-white">{titulo}</p>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-navy-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  )
}
