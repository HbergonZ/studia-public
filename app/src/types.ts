export interface Topico {
  id: string
  nome: string
  dificuldade: number
  posicaoCurva: number
  primeiraRevisao?: string
  ultimaRevisao?: string
  questoes: {
    acertos: number
    erros: number
  }
}

export type CorMateria = 1 | 2 | 3 | 4 | 5 | 6

export interface Materia {
  id: string
  areaId: string
  nome: string
  grupoNome: string
  opcaoIds: string[]
  tipoConhecimento: 'general' | 'specific'
  selecionada: boolean
  peso: number
  cor: CorMateria
  topicos: Topico[]
}

export interface AreaEstudo {
  id: string
  nome: string
  tipoConhecimento: 'general' | 'specific'
  selecionada: boolean
}

export interface OpcaoEstudo {
  id: string
  codigo?: string
  nome: string
  tipo: string
  selecionada: boolean
}

export interface Disponibilidade {
  segunda: number
  terca: number
  quarta: number
  quinta: number
  sexta: number
  sabado: number
  domingo: number
}

export type StatusItem = 'atrasada' | 'hoje' | 'futura' | 'novo'

export interface ItemCronograma {
  materiaId: string
  materiaNome: string
  peso: number
  cor: CorMateria
  topico: Topico
  status: StatusItem
  dataPrevista: Date
}

export interface Sessao {
  id: string
  materiaId: string
  topicoId: string
  data: string
  tempoMinutos: number
  acertos: number
  erros: number
  dificuldade: number
}

export interface Metas {
  questoesPorSemana: number
  minutosPorSemana: number
}
