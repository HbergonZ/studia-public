interface AnelPercentualProps {
  valor: number
  tamanho?: number
  cor?: string
}

export default function AnelPercentual({ valor, tamanho = 40, cor = 'var(--color-brand-400)' }: AnelPercentualProps) {
  const espessura = Math.max(3, Math.round(tamanho * 0.1))
  const raio = (tamanho - espessura) / 2
  const centro = tamanho / 2
  const circunferencia = 2 * Math.PI * raio
  const seguro = Math.max(0, Math.min(100, valor))
  const offset = circunferencia * (1 - seguro / 100)

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="-rotate-90">
        <circle cx={centro} cy={centro} r={raio} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={espessura} />
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-white">{Math.round(valor)}%</span>
    </div>
  )
}
