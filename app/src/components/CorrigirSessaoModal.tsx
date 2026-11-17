import { useRef, useState } from 'react'
import Modal from './Modal'
import { api } from '../lib/api'
import { useEstudo } from '../context/EstudoContext'
import { lerData } from '../lib/datas'
import type { Sessao } from '../types'

export default function CorrigirSessaoModal({ sessao, onFechar }: { sessao: Sessao; onFechar: () => void }) {
  const { recarregar } = useEstudo()
  const [original] = useState({ minutes: sessao.tempoMinutos, correct_answers: sessao.acertos, wrong_answers: sessao.erros, difficulty: sessao.dificuldade, completes_topic: sessao.concluiuAssunto ?? true })
  const [valores, setValores] = useState(original)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const busy = useRef(false)
  async function salvar() {
    if (busy.current) return
    busy.current = true; setSalvando(true); setErro('')
    try {
      await api(`/v1/sessoes/${sessao.id}`, { method: 'PATCH', body: JSON.stringify({ ...valores, expected: original, reason: motivo }) })
      await recarregar(); window.dispatchEvent(new Event('studia:study-saved')); onFechar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível corrigir o registro.') }
    finally { busy.current = false; setSalvando(false) }
  }
  return <Modal titulo="Corrigir registro" largura="md" onFechar={() => { if (!busy.current) onFechar() }} rodape={<button type="submit" form="corrigir-sessao" disabled={salvando} className="daily-button daily-button-primary">{salvando ? 'Salvando...' : 'Salvar correção'}</button>}>
    <p className="mb-4 text-sm text-muted">Sessão de {lerData(sessao.data).toLocaleDateString('pt-BR')}. A correção preserva o registro original na trilha de alterações e recalcula as revisões em ordem cronológica.</p>
    <form id="corrigir-sessao" className="daily-edit-form" onSubmit={e => { e.preventDefault(); void salvar() }}><fieldset disabled={salvando} className="flex flex-col gap-4">
      {([{ field: 'minutes', label: 'Minutos estudados', max: 1440 },{ field: 'correct_answers', label: 'Acertos', max: 100000 },{ field: 'wrong_answers', label: 'Erros', max: 100000 },{ field: 'difficulty', label: 'Dificuldade', max: 10 }] as const).map(f => <label key={f.field}>{f.label}<input required type="number" min={0} max={f.max} step={1} value={valores[f.field]} onChange={e => setValores(v => ({ ...v, [f.field]: Number(e.target.value) }))} /></label>)}
      <label><input type="checkbox" checked={valores.completes_topic} onChange={e => setValores(v => ({ ...v, completes_topic: e.target.checked }))} /> Concluí o estudo ou a revisão nesta sessão</label>
      <label>Motivo da correção<textarea required maxLength={500} rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
    </fieldset></form>{erro && <p role="alert" className="daily-error">{erro}</p>}
  </Modal>
}
