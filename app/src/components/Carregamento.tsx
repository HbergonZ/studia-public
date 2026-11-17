interface Props {
  telaInteira?: boolean
  rotulo?: string
}

export default function Carregamento({ telaInteira = false, rotulo = 'Carregando seus estudos' }: Props) {
  return (
    <div className={`study-loading${telaInteira ? ' study-loading-screen' : ''}`} role="status">
      <span className="study-loading-symbol" aria-hidden="true">
        <span className="study-loading-ring" />
        <svg className="study-loading-paper" width="32" height="38" viewBox="0 0 32 38" fill="none">
          <path d="M7 2h13l7 7v26H5V4a2 2 0 0 1 2-2Z" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M20 2v8h7M10 17h12M10 22h12M10 27h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="sr-only">{rotulo}</span>
    </div>
  )
}
