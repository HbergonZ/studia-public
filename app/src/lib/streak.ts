import type { Sessao } from '../types'

export function chaveDia(data: Date) {
  return data.toISOString().slice(0, 10)
}

export function diasEstudadosDe(sessoes: Sessao[]): Set<string> {
  return new Set(sessoes.map((s) => chaveDia(new Date(s.data))))
}

export function calcularStreak(diasEstudados: Set<string>, hoje: Date): number {
  let cursor = new Date(hoje)
  if (!diasEstudados.has(chaveDia(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!diasEstudados.has(chaveDia(cursor))) return 0
  }
  let streak = 0
  while (diasEstudados.has(chaveDia(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
