import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  texto: string
  children: ReactNode
  onClick?: () => void
}

export default function Tooltip({ texto, children, onClick }: TooltipProps) {
  const gatilhoRef = useRef<HTMLButtonElement>(null)
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null)

  function abrir() {
    const rect = gatilhoRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosicao({ top: rect.top - 8, left: rect.left + rect.width / 2 })
  }

  function fechar() {
    setPosicao(null)
  }

  return (
    <span className="inline-flex">
      <button
        ref={gatilhoRef}
        type="button"
        className="flex items-center"
        aria-label={texto}
        onMouseEnter={abrir}
        onMouseLeave={fechar}
        onFocus={abrir}
        onBlur={fechar}
        onClick={onClick}
      >
        {children}
      </button>
      {posicao &&
        createPortal(
          <span
            role="tooltip"
            className="animate-tooltip pointer-events-none fixed z-50 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-lg bg-canvas px-2.5 py-1.5 text-center text-xs font-medium normal-case leading-snug tracking-normal text-ink shadow-[0_4px_16px_rgba(0,0,0,0.4)] ring-1 ring-line"
            style={{ top: posicao.top, left: posicao.left }}
          >
            {texto}
            <span className="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 rounded-[2px] bg-canvas ring-1 ring-line" />
          </span>,
          document.body,
        )}
    </span>
  )
}
