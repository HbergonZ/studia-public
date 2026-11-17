import { useEffect, useRef, useState } from 'react'

export type ModoPomodoro = 'foco' | 'curta' | 'longa'

export const DURACOES_POMODORO: Record<ModoPomodoro, number> = {
  foco: 25 * 60,
  curta: 5 * 60,
  longa: 15 * 60,
}

export const LABELS_POMODORO: Record<ModoPomodoro, string> = {
  foco: 'Foco',
  curta: 'Pausa curta',
  longa: 'Pausa longa',
}

export function formatarTempo(segundos: number) {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function clamp(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor))
}

export function usePomodoro() {
  const [modo, setModo] = useState<ModoPomodoro>('foco')
  const [duracaoBase, setDuracaoBase] = useState(DURACOES_POMODORO.foco)
  const [restante, setRestante] = useState(DURACOES_POMODORO.foco)
  const [rodando, setRodando] = useState(false)
  const [modoFoco, setModoFoco] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!rodando) return
    intervalRef.current = setInterval(() => {
      setRestante((atual) => {
        if (atual <= 1) {
          setRodando(false)
          return 0
        }
        return atual - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [rodando])

  function encerrar() {
    setRodando(false)
    setModoFoco(false)
  }

  useEffect(() => {
    if (!modoFoco) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') encerrar()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [modoFoco])

  function trocarModo(novoModo: ModoPomodoro) {
    setModo(novoModo)
    setDuracaoBase(DURACOES_POMODORO[novoModo])
    setRestante(DURACOES_POMODORO[novoModo])
    setRodando(false)
  }

  function alternarPlay() {
    setRodando((atual) => {
      const novoRodando = !atual
      if (novoRodando) setModoFoco(true)
      return novoRodando
    })
  }

  function reiniciar() {
    setRestante(duracaoBase)
    setRodando(false)
  }

  function aplicarTempo(horas: number, minutos: number, segundos: number) {
    const total = clamp(horas, 0, 99) * 3600 + clamp(minutos, 0, 59) * 60 + clamp(segundos, 0, 59)
    const seguro = Math.max(1, total)
    setDuracaoBase(seguro)
    setRestante(seguro)
  }

  return {
    modo,
    duracaoBase,
    restante,
    rodando,
    modoFoco,
    setModoFoco,
    trocarModo,
    alternarPlay,
    reiniciar,
    encerrar,
    aplicarTempo,
  }
}

export type PomodoroEstado = ReturnType<typeof usePomodoro>
