import type { Disponibilidade, Materia } from '../types'

export const DIAS_ORDEM: { chave: keyof Disponibilidade; label: string }[] = [
  { chave: 'segunda', label: 'Segunda' },
  { chave: 'terca', label: 'Terça' },
  { chave: 'quarta', label: 'Quarta' },
  { chave: 'quinta', label: 'Quinta' },
  { chave: 'sexta', label: 'Sexta' },
  { chave: 'sabado', label: 'Sábado' },
  { chave: 'domingo', label: 'Domingo' },
]

export interface AlocacaoMateria {
  materia: Materia
  minutos: number
}

// Distribui as horas disponíveis do dia entre as matérias, proporcional ao peso de cada uma no edital.
export function alocarDia(horasDisponiveis: number, materias: Materia[]): AlocacaoMateria[] {
  const comTopicos = materias.filter((m) => m.topicos.length > 0)
  const somaPesos = comTopicos.reduce((s, m) => s + m.peso, 0)
  if (somaPesos === 0 || horasDisponiveis === 0) return []

  const minutosTotais = horasDisponiveis * 60

  return comTopicos
    .map((materia) => {
      const minutos = Math.round((minutosTotais * (materia.peso / somaPesos)) / 5) * 5
      return { materia, minutos }
    })
    .filter((a) => a.minutos > 0)
    .sort((a, b) => b.minutos - a.minutos)
}

export interface AlocacaoTopico {
  topicoId: string
  nome: string
  minutos: number
}

// Dentro do tempo de uma matéria no dia, prioriza os tópicos mais difíceis e divide o tempo entre eles.
export function alocarTopicos(materia: Materia, minutosDisponiveis: number): AlocacaoTopico[] {
  const topicos = [...materia.topicos].sort((a, b) => b.dificuldade - a.dificuldade).slice(0, 3)
  if (topicos.length === 0) return []

  const minutosPorTopico = Math.round(minutosDisponiveis / topicos.length / 5) * 5
  return topicos.map((t) => ({ topicoId: t.id, nome: t.nome, minutos: minutosPorTopico }))
}
