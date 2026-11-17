import type { Sessao } from '../types'

function diaISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

// Dia da semana atual (0 = domingo ... 6 = sábado), sempre dentro da semana em curso.
// Assim o gráfico "Sua semana" nunca aparece vazio, não importa em que dia a pessoa abrir o app.
function diaDaSemanaAtualISO(indiceDiaSemana: number): string {
  const hoje = new Date()
  const domingo = new Date(hoje)
  domingo.setDate(hoje.getDate() - hoje.getDay())
  domingo.setDate(domingo.getDate() + indiceDiaSemana)
  domingo.setHours(9, 0, 0, 0)
  return domingo.toISOString()
}

const TOPICOS = [
  { materiaId: 'portugues', topicoId: 'portugues-interpretacao' },
  { materiaId: 'portugues', topicoId: 'portugues-crase' },
  { materiaId: 'portugues', topicoId: 'portugues-concordancia' },
  { materiaId: 'constitucional', topicoId: 'constitucional-direitos' },
  { materiaId: 'constitucional', topicoId: 'constitucional-controle' },
  { materiaId: 'constitucional', topicoId: 'constitucional-organizacao' },
  { materiaId: 'administrativo', topicoId: 'administrativo-atos' },
  { materiaId: 'administrativo', topicoId: 'administrativo-licitacao' },
  { materiaId: 'raciocinio', topicoId: 'raciocinio-proposicoes' },
  { materiaId: 'raciocinio', topicoId: 'raciocinio-probabilidade' },
  { materiaId: 'informatica', topicoId: 'informatica-planilhas' },
  { materiaId: 'informatica', topicoId: 'informatica-seguranca' },
]

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gerarHistorico(): Sessao[] {
  const aleatorio = mulberry32(20260101)
  const sessoes: Sessao[] = []
  let contador = 0

  for (let n = 7; n < 320; n++) {
    const diaDaSemana = new Date(Date.now() - n * 86400000).getDay()
    const fimDeSemana = diaDaSemana === 0 || diaDaSemana === 6
    const chanceDeEstudar = fimDeSemana ? 0.2 : 0.55

    if (aleatorio() > chanceDeEstudar) continue

    const numSessoesNoDia = aleatorio() < 0.25 ? 2 : 1
    for (let s = 0; s < numSessoesNoDia; s++) {
      const topico = TOPICOS[Math.floor(aleatorio() * TOPICOS.length)]
      contador++
      sessoes.push({
        id: `h${contador}`,
        materiaId: topico.materiaId,
        topicoId: topico.topicoId,
        data: diaISO(n),
        tempoMinutos: 25 + Math.floor(aleatorio() * 60),
        acertos: 2 + Math.floor(aleatorio() * 8),
        erros: Math.floor(aleatorio() * 5),
        dificuldade: 1 + Math.floor(aleatorio() * 9),
      })
    }
  }

  return sessoes
}

export const sessoesIniciais: Sessao[] = [
  { id: 's1', materiaId: 'portugues', topicoId: 'portugues-interpretacao', data: diaDaSemanaAtualISO(1), tempoMinutos: 45, acertos: 8, erros: 2, dificuldade: 2 },
  { id: 's2', materiaId: 'constitucional', topicoId: 'constitucional-direitos', data: diaDaSemanaAtualISO(1), tempoMinutos: 60, acertos: 6, erros: 1, dificuldade: 4 },
  { id: 's3', materiaId: 'administrativo', topicoId: 'administrativo-atos', data: diaDaSemanaAtualISO(2), tempoMinutos: 50, acertos: 5, erros: 3, dificuldade: 5 },
  { id: 's4', materiaId: 'raciocinio', topicoId: 'raciocinio-proposicoes', data: diaDaSemanaAtualISO(3), tempoMinutos: 40, acertos: 4, erros: 4, dificuldade: 7 },
  { id: 's5', materiaId: 'informatica', topicoId: 'informatica-planilhas', data: diaDaSemanaAtualISO(3), tempoMinutos: 30, acertos: 8, erros: 0, dificuldade: 1 },
  { id: 's6', materiaId: 'constitucional', topicoId: 'constitucional-controle', data: diaDaSemanaAtualISO(4), tempoMinutos: 55, acertos: 3, erros: 5, dificuldade: 7 },
  { id: 's7', materiaId: 'portugues', topicoId: 'portugues-crase', data: diaDaSemanaAtualISO(5), tempoMinutos: 35, acertos: 3, erros: 5, dificuldade: 7 },
  { id: 's8', materiaId: 'administrativo', topicoId: 'administrativo-atos', data: diaDaSemanaAtualISO(6), tempoMinutos: 65, acertos: 7, erros: 2, dificuldade: 3 },
  { id: 's9', materiaId: 'informatica', topicoId: 'informatica-seguranca', data: diaDaSemanaAtualISO(6), tempoMinutos: 25, acertos: 4, erros: 3, dificuldade: 4 },
  ...gerarHistorico(),
]
