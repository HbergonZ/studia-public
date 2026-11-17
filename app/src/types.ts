export interface Topico {
  id: string
  nome: string
  textoOriginal?: string | null
  origemId?: string | null
  dificuldade: number
  posicaoCurva: number
  primeiraRevisao?: string
  ultimaRevisao?: string
  proximaRevisao?: string | null
  emAndamento?: boolean
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
  aplicaATodos: boolean
  tipoConhecimento: 'general' | 'specific'
  selecionada: boolean
  peso: number
  pesoPadrao?: number
  pesoPersonalizado?: boolean
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
  concluiuAssunto?: boolean
  corrigida?: boolean
}

export interface TopicoPlano {
  id: string; subjectId: string; title: string; subjectName: string; weight: number; color: CorMateria
  difficulty: number; nextReviewAt: string | null; continuation: boolean
  sourceText?: string | null; isSource?: boolean
}
export interface BlocoPlano {
  id: string; topicId: string; minutes: number; status: 'planned' | 'completed' | 'deferred'; reason: string
  topic: TopicoPlano | null; actualMinutes?: number; sessionId?: string
}
export interface PlanoDia {
  id: string | null; noticeId: string; date: string; today: string; version: number
  capacityMinutes: number; spentMinutes: number; blockMinutes: number; breakMinutes: number
  blocks: BlocoPlano[]; topics: TopicoPlano[]
}

export interface Metas {
  questoesPorSemana: number
  minutosPorSemana: number
}
