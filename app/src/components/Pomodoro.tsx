import { useEffect } from 'react'
import { LABELS_POMODORO, formatarTempo, type PomodoroEstado } from '../lib/pomodoro'
import { IconPause, IconPlay, IconReset } from './icons'

function clamp(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor))
}

// Ilustração alternativa do Pomodoro (exportada, não usada no momento).
export function Bichinho({ tipo, ativo }: { tipo: 'dormindo' | 'lanchando'; ativo: boolean }) {
  return (
    <div className="relative mb-2 flex h-24 w-24 items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className={`h-24 w-24 ${ativo ? (tipo === 'dormindo' ? 'animate-bichinho-respirar' : 'animate-bichinho-mastigar') : ''}`}
      >
        <ellipse cx="50" cy="62" rx="34" ry="27" fill="var(--color-brand-500)" />
        <circle cx="25" cy="35" r="10" fill="var(--color-brand-500)" />
        <circle cx="75" cy="35" r="10" fill="var(--color-brand-500)" />
        <circle cx="25" cy="35" r="5" fill="var(--color-brand-600)" />
        <circle cx="75" cy="35" r="5" fill="var(--color-brand-600)" />
        <circle cx="33" cy="68" r="4.5" fill="var(--color-brand-300)" opacity="0.5" />
        <circle cx="67" cy="68" r="4.5" fill="var(--color-brand-300)" opacity="0.5" />

        {tipo === 'dormindo' ? (
          <>
            <path d="M36 58 q6 6 12 0" stroke="#0f1428" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M52 58 q6 6 12 0" stroke="#0f1428" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M45 71 q5 4 10 0" stroke="#0f1428" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="41" cy="58" r="3.2" fill="#0f1428" />
            <circle cx="59" cy="58" r="3.2" fill="#0f1428" />
            <ellipse cx="50" cy="70" rx="6" ry="4" fill="#0f1428" />
          </>
        )}
      </svg>

      {tipo === 'dormindo' ? (
        <>
          <span
            className={`absolute -top-1 right-1 text-lg font-bold text-brand-300 ${ativo ? 'animate-zzz' : 'opacity-0'}`}
            style={{ animationDelay: '0s' }}
          >
            z
          </span>
          <span
            className={`absolute -top-3 right-5 text-sm font-bold text-brand-300 ${ativo ? 'animate-zzz' : 'opacity-0'}`}
            style={{ animationDelay: '0.5s' }}
          >
            z
          </span>
          <span
            className={`absolute -top-5 right-9 text-xs font-bold text-brand-300 ${ativo ? 'animate-zzz' : 'opacity-0'}`}
            style={{ animationDelay: '1s' }}
          >
            z
          </span>
        </>
      ) : (
        <>
          <span className="absolute bottom-3 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-300">
            <span className="grid grid-cols-2 gap-[2px]">
              <span className="h-[3px] w-[3px] rounded-full bg-amber-700" />
              <span className="h-[3px] w-[3px] rounded-full bg-amber-700" />
              <span className="h-[3px] w-[3px] rounded-full bg-amber-700" />
              <span className="h-[3px] w-[3px] rounded-full bg-amber-700" />
            </span>
          </span>
          {ativo && (
            <>
              <span
                className="animate-migalha absolute bottom-2 right-2 h-1 w-1 rounded-full bg-amber-400"
                style={{ animationDelay: '0.1s', ['--migalha-x' as string]: '4px' }}
              />
              <span
                className="animate-migalha absolute bottom-2 right-4 h-1 w-1 rounded-full bg-amber-400"
                style={{ animationDelay: '0.5s', ['--migalha-x' as string]: '-3px' }}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function PomodoroFoco({ estado, onRegistrar }: { estado: PomodoroEstado; onRegistrar?: () => void }) {
  const { modo, duracaoBase, restante, rodando, modoFoco, reiniciar, alternarPlay, encerrar, aplicarTempo } = estado

  useEffect(() => {
    if (!modoFoco) return
    function handleFullscreenChange() {
      if (!document.fullscreenElement) encerrar()
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoFoco])

  if (!modoFoco) return null

  function alternarComTelaCheia() {
    if (!rodando) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
    alternarPlay()
  }

  function encerrarSessao() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    encerrar()
    if (estado.segundosEstudados > 0) onRegistrar?.()
  }

  const horas = Math.floor(restante / 3600)
  const minutos = Math.floor((restante % 3600) / 60)
  const segundos = restante % 60
  const progresso = duracaoBase > 0 ? restante / duracaoBase : 0

  const relogio = rodando ? (
    <p className="text-center text-[clamp(2.5rem,9vw,6rem)] font-semibold tabular-nums text-white">
      {horas > 0 ? `${String(horas).padStart(2, '0')}:` : ''}
      {formatarTempo(restante % 3600)}
    </p>
  ) : (
    <div className="flex items-center justify-center gap-1">
      <CampoTempo rotulo="Horas" valor={horas} max={99} onChange={(v) => aplicarTempo(v, minutos, segundos)} />
      <span className="text-[clamp(1.75rem,7vw,4.5rem)] font-semibold text-slate-500">:</span>
      <CampoTempo rotulo="Minutos" valor={minutos} max={59} onChange={(v) => aplicarTempo(horas, v, segundos)} />
      <span className="text-[clamp(1.75rem,7vw,4.5rem)] font-semibold text-slate-500">:</span>
      <CampoTempo rotulo="Segundos" valor={segundos} max={59} onChange={(v) => aplicarTempo(horas, minutos, v)} />
    </div>
  )

  const diametro = 460
  const espessura = 11
  const raio = diametro / 2 - espessura / 2 - 6
  const centro = diametro / 2
  const circunferencia = 2 * Math.PI * raio
  const offset = circunferencia * (1 - progresso)

  return (
    <div className="animate-overlay fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-focus-950">
      <div className="absolute inset-0 bg-brand-600/70 mix-blend-multiply" />
      <div className="absolute inset-0 bg-focus-950/60" />

      <div className="relative z-10 flex w-full flex-col items-center justify-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">
          {restante === 0 ? 'Tempo concluído' : LABELS_POMODORO[modo]}
        </p>

        <div className="relative mx-auto mb-6 aspect-square w-[clamp(200px,min(70vw,52vh),460px)] sm:mb-8">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${diametro} ${diametro}`}
            className="absolute inset-0 -rotate-90"
          >
            {[0, 90, 180, 270].map((deg) => (
              <line
                key={deg}
                x1={centro}
                y1={6}
                x2={centro}
                y2={18}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={3}
                strokeLinecap="round"
                transform={`rotate(${deg} ${centro} ${centro})`}
              />
            ))}
            <circle cx={centro} cy={centro} r={raio} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={espessura} />
            <circle
              cx={centro}
              cy={centro}
              r={raio}
              fill="none"
              stroke={rodando ? 'var(--color-brand-400)' : 'var(--color-brand-600)'}
              strokeWidth={espessura}
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 900ms linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">{relogio}</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 px-4 sm:gap-3">
          <button
            type="button"
            onClick={alternarComTelaCheia}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-500 active:scale-[0.97] sm:px-6 sm:py-3 sm:text-base"
          >
            {rodando ? <IconPause className="h-5 w-5" /> : <IconPlay className="h-5 w-5" />}
            {rodando ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            type="button"
            onClick={() => reiniciar()}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 sm:px-5 sm:py-3 sm:text-base"
          >
            <IconReset className="h-5 w-5" />
            Reiniciar
          </button>
          <button
            type="button"
            onClick={encerrarSessao}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 sm:px-5 sm:py-3 sm:text-base"
          >
            {onRegistrar && estado.segundosEstudados > 0 ? 'Encerrar e registrar' : 'Encerrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CampoTempo({
  rotulo,
  valor,
  max,
  onChange,
}: {
  rotulo: string
  valor: number
  max: number
  onChange: (valor: number) => void
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={String(valor).padStart(2, '0')}
      aria-label={rotulo}
      onChange={(e) => onChange(clamp(Number(e.target.value), 0, max))}
      className="campo-tempo-pomodoro w-[clamp(2.75rem,12vw,6rem)] rounded-lg bg-transparent text-center text-[clamp(1.75rem,7vw,4.5rem)] font-semibold tabular-nums text-white outline-none transition-colors hover:bg-focus-850 focus:bg-focus-850"
    />
  )
}
