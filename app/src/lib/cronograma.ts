import type { ItemCronograma, Materia, StatusItem } from '../types'
import { inicioDoDia, proximaRevisao } from './curva'

export function montarCronograma(materias: Materia[], hoje: Date = new Date()): ItemCronograma[] {
  const hojeInicio = inicioDoDia(hoje)
  const itens: ItemCronograma[] = []

  for (const materia of materias) {
    for (const topico of materia.topicos) {
      if (!topico.ultimaRevisao) {
        itens.push({
          materiaId: materia.id,
          materiaNome: materia.nome,
          peso: materia.peso,
          cor: materia.cor,
          topico,
          status: 'novo',
          dataPrevista: hojeInicio,
        })
        continue
      }

      const data = proximaRevisao(topico)
      if (!data) continue

      let status: StatusItem
      if (data.getTime() < hojeInicio.getTime()) status = 'atrasada'
      else if (data.getTime() === hojeInicio.getTime()) status = 'hoje'
      else status = 'futura'

      itens.push({
        materiaId: materia.id,
        materiaNome: materia.nome,
        peso: materia.peso,
        cor: materia.cor,
        topico,
        status,
        dataPrevista: data,
      })
    }
  }

  const ordemStatus: Record<StatusItem, number> = { atrasada: 0, hoje: 1, novo: 2, futura: 3 }

  return itens.sort((a, b) => {
    const statusDiff = ordemStatus[a.status] - ordemStatus[b.status]
    if (statusDiff !== 0) return statusDiff
    if (a.status === 'futura') return a.dataPrevista.getTime() - b.dataPrevista.getTime()
    return b.peso - a.peso
  })
}

export function itensDoDia(itens: ItemCronograma[]): ItemCronograma[] {
  return itens.filter((i) => i.status === 'atrasada' || i.status === 'hoje' || i.status === 'novo')
}
