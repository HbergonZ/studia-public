import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEstudo, type ResultadoSessao } from '../context/EstudoContext'
import Modal from './Modal'
import SliderDificuldade from './SliderDificuldade'
import ConteudoOriginal from './ConteudoOriginal'

interface RegistrarSessaoModalProps {
  materiaId: string
  materiaNome: string
  topicoId: string
  topicoNome: string
  textoOriginal?: string | null
  dificuldadeAtual: number
  onFechar: () => void
  dataInicial?: string
  tempoInicial?: number
  planoId?: string
  blocoId?: string
  concluirInicial?: boolean
  onSalvar?: (resultado: ResultadoSessao) => void
}

export default function RegistrarSessaoModal({
  materiaId,
  materiaNome,
  topicoId,
  topicoNome,
  textoOriginal,
  dificuldadeAtual,
  onFechar,
  onSalvar, dataInicial, tempoInicial = 0, planoId, blocoId, concluirInicial = false,
}: RegistrarSessaoModalProps) {
  const { registrarSessao, hoje, editalId } = useEstudo()
  const { usuario } = useAuth()
  const [dataEstudo] = useState(dataInicial ?? hoje)
  const chave = `studia:registro:${usuario?.id}:${editalId}:${topicoId}:${blocoId ?? 'manual'}:${dataEstudo}`
  const [anterior] = useState<null | { dificuldade: number; horas: string; minutos: string; concluiu: boolean; totalQuestoes: string; acertos: string; requestKey: string }>(() => {
    try { const value = JSON.parse(sessionStorage.getItem(chave) ?? 'null'); if (value && typeof value.dificuldade === 'number' && typeof value.horas === 'string' && typeof value.minutos === 'string' && typeof value.concluiu === 'boolean' && typeof value.totalQuestoes === 'string' && typeof value.acertos === 'string' && typeof value.requestKey === 'string') return value } catch { /* Registration remains available without local storage. */ }
    return null
  })
  const [dificuldade, setDificuldade] = useState(anterior?.dificuldade ?? dificuldadeAtual)
  const [horas, setHoras] = useState(anterior?.horas ?? String(Math.floor(tempoInicial / 60)))
  const [minutos, setMinutos] = useState(anterior?.minutos ?? String(tempoInicial % 60))
  const [concluiu, setConcluiu] = useState(anterior?.concluiu ?? concluirInicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const requestKey = useRef(anterior?.requestKey ?? crypto.randomUUID())
  const confirmado = useRef(false)
  const busy = useRef(false)
  const [totalQuestoes, setTotalQuestoes] = useState(anterior?.totalQuestoes ?? '')
  const [acertos, setAcertos] = useState(anterior?.acertos ?? '')
  useEffect(() => {
    if (confirmado.current) return
    try { sessionStorage.setItem(chave, JSON.stringify({ dificuldade, horas, minutos, concluiu, totalQuestoes, acertos, requestKey: requestKey.current })) } catch { /* Keep the form usable if storage is full. */ }
  }, [chave, dificuldade, horas, minutos, concluiu, totalQuestoes, acertos])

  const numTotal = Math.max(0, Number(totalQuestoes) || 0)
  const numAcertos = Math.min(numTotal, Math.max(0, Number(acertos) || 0))
  const numErros = numTotal - numAcertos
  const percentual = numTotal === 0 ? 0 : Math.round((numAcertos / numTotal) * 100)
  const tempoMinutos = Math.max(0, Number(horas) || 0) * 60 + Math.max(0, Number(minutos) || 0)

  async function handleSalvar() {
    if (busy.current) return
    if (!Number.isInteger(tempoMinutos) || Number(minutos) > 59 || Number(horas) < 0 || Number(minutos) < 0 || tempoMinutos > 1440 || !Number.isInteger(numTotal) || !Number.isInteger(numAcertos)) { setErro('Revise o tempo e as quantidades de questões.'); return }
    if (!concluiu && tempoMinutos === 0 && numTotal === 0) { setErro('Informe o tempo estudado ou as questões realizadas.'); return }
    busy.current = true; setSalvando(true); setErro('')
    try {
      const resultado = await registrarSessao(materiaId, topicoId, { tempoMinutos, acertos: numAcertos, erros: numErros, dificuldade, concluiuAssunto: concluiu, dataEstudo: dataEstudo, requestKey: requestKey.current, planoId, blocoId })
      confirmado.current = true
      try { sessionStorage.removeItem(chave) } catch { /* Server confirmation remains authoritative. */ }
      onSalvar?.(resultado)
      onFechar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.') }
    finally { busy.current = false; setSalvando(false) }
  }

  return (
    <Modal titulo="Registrar sessão" largura="md" onFechar={() => { if (!busy.current) onFechar() }} rodape={<>
        <button
          type="button"
          disabled={salvando} onClick={onFechar}
          className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={salvando} onClick={() => void handleSalvar()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-on-brand transition-all duration-150 hover:scale-[1.03] hover:bg-brand-500 active:scale-95"
        >
          {salvando ? 'Salvando...' : 'Salvar sessão'}
        </button>
       </>}>
      <p className="mb-4 max-h-32 overflow-y-auto text-sm text-muted">
        {materiaNome} · {topicoNome}
      </p>
      <ConteudoOriginal texto={textoOriginal} />
      <p className="mb-4 text-sm text-muted">{anterior ? 'Rascunho do formulário recuperado. ' : ''}Se fechar antes de salvar, o formulário ficará como rascunho nesta aba.</p>

      <fieldset disabled={salvando} className="flex min-w-0 flex-col gap-4 disabled:opacity-70">
        <div className="study-completion-choice">
          <p className="font-medium">Como ficou este assunto?</p>
          <label><input type="radio" name="conclusao" checked={!concluiu} onChange={() => setConcluiu(false)} /> Vou continuar estudando este assunto</label>
          <label><input type="radio" name="conclusao" checked={concluiu} onChange={() => setConcluiu(true)} /> Concluí o estudo ou a revisão deste assunto</label>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm text-ink">
            <span>Dificuldade</span>
            <span className="font-medium text-ink">{dificuldade}/10</span>
          </div>
          <SliderDificuldade valor={dificuldade} onChange={setDificuldade} />
        </div>

        <div>
          <p className="mb-1 text-sm text-ink">Tempo</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              aria-label="Horas estudadas"
              min={0}
              inputMode="numeric"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className="w-16 rounded-lg border border-line bg-soft px-3 py-2 text-center text-ink transition-colors focus:border-brand-400/60 focus:outline-none"
            />
            <span className="text-sm text-muted">h</span>
            <input
              type="number"
              aria-label="Minutos estudados"
              min={0}
              max={59}
              inputMode="numeric"
              value={minutos}
              onChange={(e) => setMinutos(e.target.value)}
              className="w-16 rounded-lg border border-line bg-soft px-3 py-2 text-center text-ink transition-colors focus:border-brand-400/60 focus:outline-none"
            />
            <span className="text-sm text-muted">min</span>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-ink">
            <span>Questões</span>
            <span className="font-medium text-ink">{percentual}% de acerto</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
              Total
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={totalQuestoes}
                onChange={(e) => setTotalQuestoes(e.target.value)}
                placeholder="0"
                className="min-w-0 w-full rounded-lg border border-line bg-soft px-3 py-2 text-ink transition-colors focus:border-brand-400/60 focus:outline-none"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
              Acertos
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={acertos}
                onChange={(e) => setAcertos(e.target.value)}
                placeholder="0"
                className="min-w-0 w-full rounded-lg border border-line bg-soft px-3 py-2 text-ink transition-colors focus:border-brand-400/60 focus:outline-none"
              />
            </label>
          </div>
        </div>
      </fieldset>

      <p className="mt-4 text-xs text-muted">{concluiu ? 'A próxima revisão será calculada com o resultado desta sessão.' : 'O tempo e as questões ficam registrados. O assunto permanece para continuar, sem avançar a revisão.'}</p>
      {concluiu && tempoMinutos === 0 && numTotal === 0 && <p role="status" className="mt-3 text-sm text-muted">Você está registrando somente a conclusão do assunto. Nenhum tempo ou questão será somado aos indicadores.</p>}
      {erro && <p role="alert" className="mt-3 text-sm text-red-700">{erro}</p>}


    </Modal>
  )
}
