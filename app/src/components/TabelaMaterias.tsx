import { useMemo } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { corDesempenho } from '../lib/corDesempenho'
import AnelPercentual from './AnelPercentual'
import { IconTable } from './icons'

function formatarTempo(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

export default function TabelaMaterias() {
  const { materias, sessoes } = useEstudo()

  const linhas = useMemo(() => {
    return materias.map((materia) => {
      const sessoesMateria = sessoes.filter((s) => s.materiaId === materia.id)
      const tempoTotal = sessoesMateria.reduce((soma, s) => soma + s.tempoMinutos, 0)
      const questoesTotal = sessoesMateria.reduce((soma, s) => soma + s.acertos + s.erros, 0)
      const acertosTotal = sessoesMateria.reduce((soma, s) => soma + s.acertos, 0)
      const pctAcerto = questoesTotal === 0 ? 0 : Math.round((acertosTotal / questoesTotal) * 100)
      return { materia, tempoTotal, questoesTotal, pctAcerto }
    })
  }, [materias, sessoes])

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <IconTable className="h-4 w-4" />
        Matérias
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="pb-2 pr-3 font-medium">Matéria</th>
              <th className="pb-2 pr-3 text-center font-medium">Tempo total</th>
              <th className="pb-2 pr-3 text-center font-medium">Questões</th>
              <th className="pb-2 text-center font-medium">Desempenho</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ materia, tempoTotal, questoesTotal, pctAcerto }) => {
              const estilo = SUBJECT_STYLES[materia.cor]
              return (
                <tr key={materia.id} className="border-t border-line">
                  <td className="py-2 pr-3">
                    <span className={`inline-block h-2 w-2 rounded-full ${estilo.dot}`} /> {' '}
                    <span className="text-ink">{materia.nome}</span>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-center text-ink">
                    {formatarTempo(tempoTotal)}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-center text-ink">{questoesTotal}</td>
                  <td className="py-2 text-center text-ink">
                    {questoesTotal > 0 ? (
                      <div className="flex justify-center">
                        <AnelPercentual valor={pctAcerto} cor={corDesempenho(pctAcerto)} />
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
