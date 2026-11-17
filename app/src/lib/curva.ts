import type { Topico } from '../types'
import { lerData } from './datas'

// Sequência de revisão baseada na curva de Ebbinghaus (regra definida em docs/planejamento.md)
export const INTERVALOS_DIAS = [1, 7, 16, 35, 90]
export const INTERVALO_MANUTENCAO_DIAS = 180

// Dificuldade vai de 0 (domino completamente) a 10 (não conheço nada).
// Quanto maior a dificuldade, mais perto do início da curva o tópico começa.
export function posicaoInicial(dificuldade: number): number {
  const d = Math.min(10, Math.max(0, dificuldade))
  const posicao = Math.round(((10 - d) / 10) * INTERVALOS_DIAS.length)
  return Math.min(INTERVALOS_DIAS.length, posicao)
}

export function intervaloPorPosicao(posicao: number): number {
  const pos = Math.max(0, posicao)
  if (pos < INTERVALOS_DIAS.length) return INTERVALOS_DIAS[pos]
  return INTERVALO_MANUTENCAO_DIAS
}

export type Desempenho = 'bom' | 'ruim' | 'indefinido'

export function calcularDesempenho(questoes: { acertos: number; erros: number }): Desempenho {
  const total = questoes.acertos + questoes.erros
  if (total === 0) return 'indefinido'
  const taxa = questoes.acertos / total
  if (taxa >= 0.8) return 'bom'
  if (taxa < 0.5) return 'ruim'
  return 'indefinido'
}

export function ajustarPosicao(posicaoAtual: number, desempenho: Desempenho): number {
  if (desempenho === 'bom') return Math.min(posicaoAtual + 1, INTERVALOS_DIAS.length)
  if (desempenho === 'ruim') return Math.max(posicaoAtual - 1, 0)
  return posicaoAtual
}

export function proximaPosicao(topico: Topico): number {
  return ajustarPosicao(topico.posicaoCurva, calcularDesempenho(topico.questoes))
}

export function proximaRevisao(topico: Topico): Date | null {
  if (!topico.proximaRevisao) return null
  return inicioDoDia(lerData(topico.proximaRevisao))
}

export function inicioDoDia(data: Date): Date {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  return d
}
