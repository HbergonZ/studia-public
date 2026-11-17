const MARCADORES = Array.from({ length: 11 }, (_, i) => i)

interface SliderDificuldadeProps {
  valor: number
  onChange: (valor: number) => void
  disabled?: boolean
  rotulo?: string
  maximo?: number
}

export default function SliderDificuldade({ valor, onChange, disabled, rotulo = 'Dificuldade', maximo = 10 }: SliderDificuldadeProps) {
  const percentual = (Math.min(maximo, valor) / maximo) * 100

  return (
    <div>
      <div className="relative h-2 w-full rounded-full bg-line-strong">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-[width] duration-150"
          style={{ width: `${percentual}%` }}
        />
        <input
          type="range"
          min={0}
          max={maximo}
          step={1}
          value={valor}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={rotulo}
          className="slider-dificuldade absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        {MARCADORES.map((n) => (
          <span key={n}>{Math.round(n * maximo / 10)}</span>
        ))}
      </div>
    </div>
  )
}
