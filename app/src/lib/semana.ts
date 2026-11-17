import type { Sessao } from '../types'
import { inicioDoDia } from './curva'

export const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function diasDaSemana(referencia: Date): Date[] {
  const inicio = inicioDoDia(referencia)
  inicio.setDate(inicio.getDate() - inicio.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    return d
  })
}

function chaveDia(data: Date) {
  return inicioDoDia(data).toISOString().slice(0, 10)
}

export interface AgregadoDia {
  data: Date
  tempoMinutos: number
  questoes: number
  acertos: number
  desempenho: number
}

export function agruparSessoesPorDia(sessoes: Sessao[], dias: Date[]): AgregadoDia[] {
  const mapa = new Map<string, { tempoMinutos: number; questoes: number; acertos: number }>()
  for (const s of sessoes) {
    const chave = chaveDia(new Date(s.data))
    const atual = mapa.get(chave) ?? { tempoMinutos: 0, questoes: 0, acertos: 0 }
    atual.tempoMinutos += s.tempoMinutos
    atual.questoes += s.acertos + s.erros
    atual.acertos += s.acertos
    mapa.set(chave, atual)
  }

  return dias.map((dia) => {
    const chave = chaveDia(dia)
    const agregado = mapa.get(chave) ?? { tempoMinutos: 0, questoes: 0, acertos: 0 }
    const desempenho = agregado.questoes === 0 ? 0 : Math.round((agregado.acertos / agregado.questoes) * 100)
    return { data: dia, ...agregado, desempenho }
  })
}

export function sessoesNoIntervalo(sessoes: Sessao[], dias: Date[]): Sessao[] {
  const chaves = new Set(dias.map(chaveDia))
  return sessoes.filter((s) => chaves.has(chaveDia(new Date(s.data))))
}
