const MARCADORES = Array.from({ length: 11 }, (_, i) => i)

interface SliderDificuldadeProps {
  valor: number
  onChange: (valor: number) => void
  disabled?: boolean
  rotulo?: string
}

export default function SliderDificuldade({ valor, onChange, disabled, rotulo = 'Dificuldade' }: SliderDificuldadeProps) {
  const percentual = (valor / 10) * 100

  return (
    <div>
      <div className="relative h-2 w-full rounded-full bg-navy-700">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-[width] duration-150"
          style={{ width: `${percentual}%` }}
        />
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={valor}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={rotulo}
          className="slider-dificuldade absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        {MARCADORES.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  )
}
