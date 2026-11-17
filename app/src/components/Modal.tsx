import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  titulo: string
  onFechar: () => void
  children: ReactNode
  largura?: 'sm' | 'md' | 'lg' | 'xl'
  rodape?: ReactNode
}

const LARGURAS: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
}

export default function Modal({ titulo, onFechar, children, largura = 'sm', rodape }: ModalProps) {
  const tituloId = useId()
  const painel = useRef<HTMLDivElement>(null)
  const fechar = useRef(onFechar)
  useEffect(() => { fechar.current = onFechar }, [onFechar])
  useEffect(() => {
    const overflow = document.body.style.overflow
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.getElementById('root')
    const inert = root?.inert ?? false
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    const elementos = () => Array.from(painel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0)
    const initial = elementos().find(el => el.matches('input, textarea, select') && !el.hasAttribute('readonly')) ?? painel.current
    initial?.focus({ preventScroll: true })
    function teclado(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar.current() }
      if (e.key !== 'Tab') return
      const list = elementos(), first = list[0], last = list.at(-1)
      if (!first) { e.preventDefault(); painel.current?.focus(); return }
      if (!painel.current?.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) { e.preventDefault(); (e.shiftKey ? last : first)?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    function foco(e: FocusEvent) { if (!painel.current?.contains(e.target as Node)) painel.current?.focus({ preventScroll: true }) }
    document.addEventListener('keydown', teclado, true)
    document.addEventListener('focusin', foco)
    return () => {
      document.removeEventListener('keydown', teclado, true); document.removeEventListener('focusin', foco)
      document.body.style.overflow = overflow
      if (root) root.inert = inert
      if (anterior?.isConnected) anterior.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <div
      className="animate-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onFechar}
    >
      <div
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(e) => e.stopPropagation()}
        data-tamanho={largura}
        className={`modal-panel animate-modal flex min-w-0 w-full flex-col ${LARGURAS[largura]} rounded-lg border border-line bg-surface p-4 sm:p-5`}
      >
        <div className="modal-heading mb-4 flex min-h-0 shrink-0 items-start justify-between gap-3">
          <p id={tituloId} tabIndex={0} className="modal-title min-w-0 font-semibold text-ink">{titulo}</p>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="modal-close shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
        </div>
        <div className="modal-body min-h-0 min-w-0 flex-1 overflow-y-auto pr-1 [overflow-wrap:anywhere]" tabIndex={0}>{children}</div>
        {rodape && <div className="modal-footer">{rodape}</div>}
      </div>
    </div>, document.body
  )
}
