import { useState } from 'react'
import { useEstudo } from '../context/EstudoContext'
import Modal from './Modal'
import SliderDificuldade from './SliderDificuldade'

interface RegistrarSessaoModalProps {
  materiaId: string
  materiaNome: string
  topicoId: string
  topicoNome: string
  dificuldadeAtual: number
  onFechar: () => void
  onSalvar?: () => void
}

export default function RegistrarSessaoModal({
  materiaId,
  materiaNome,
  topicoId,
  topicoNome,
  dificuldadeAtual,
  onFechar,
  onSalvar,
}: RegistrarSessaoModalProps) {
  const { registrarSessao } = useEstudo()
  const [dificuldade, setDificuldade] = useState(dificuldadeAtual)
  const [horas, setHoras] = useState('0')
  const [minutos, setMinutos] = useState('0')
  const [totalQuestoes, setTotalQuestoes] = useState('')
  const [acertos, setAcertos] = useState('')

  const numTotal = Math.max(0, Number(totalQuestoes) || 0)
  const numAcertos = Math.min(numTotal, Math.max(0, Number(acertos) || 0))
  const numErros = numTotal - numAcertos
  const percentual = numTotal === 0 ? 0 : Math.round((numAcertos / numTotal) * 100)
  const tempoMinutos = Math.max(0, Number(horas) || 0) * 60 + Math.max(0, Number(minutos) || 0)

  function handleSalvar() {
    registrarSessao(materiaId, topicoId, {
      tempoMinutos,
      acertos: numAcertos,
      erros: numErros,
      dificuldade,
    })
    onSalvar?.()
    onFechar()
  }

  return (
    <Modal titulo="Registrar sessão" onFechar={onFechar}>
      <p className="mb-4 text-sm text-slate-400">
        {materiaNome} · {topicoNome}
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
            <span>Dificuldade</span>
            <span className="font-medium text-white">{dificuldade}/10</span>
          </div>
          <SliderDificuldade valor={dificuldade} onChange={setDificuldade} />
        </div>

        <div>
          <p className="mb-1 text-sm text-slate-300">Tempo</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className="w-16 rounded-lg border border-white/10 bg-navy-850 px-3 py-2 text-center text-slate-100 transition-colors focus:border-brand-400/60 focus:outline-none"
            />
            <span className="text-sm text-slate-500">h</span>
            <input
              type="number"
              min={0}
              max={59}
              inputMode="numeric"
              value={minutos}
              onChange={(e) => setMinutos(e.target.value)}
              className="w-16 rounded-lg border border-white/10 bg-navy-850 px-3 py-2 text-center text-slate-100 transition-colors focus:border-brand-400/60 focus:outline-none"
            />
            <span className="text-sm text-slate-500">min</span>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
            <span>Questões</span>
            <span className="font-medium text-white">{percentual}% de acerto</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
              Total
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={totalQuestoes}
                onChange={(e) => setTotalQuestoes(e.target.value)}
                placeholder="0"
                className="rounded-lg border border-white/10 bg-navy-850 px-3 py-2 text-slate-100 transition-colors focus:border-brand-400/60 focus:outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
              Acertos
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={acertos}
                onChange={(e) => setAcertos(e.target.value)}
                placeholder="0"
                className="rounded-lg border border-white/10 bg-navy-850 px-3 py-2 text-slate-100 transition-colors focus:border-brand-400/60 focus:outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Ao salvar, o tópico é marcado como estudado hoje e a próxima revisão é recalculada.
      </p>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onFechar}
          className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-200"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSalvar}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.03] hover:bg-brand-500 active:scale-95"
        >
          Salvar sessão
        </button>
      </div>
    </Modal>
  )
}
