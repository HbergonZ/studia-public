import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { useEstudo } from '../context/EstudoContext'
import type { BlocoPlano, PlanoDia } from '../types'

export function usePlanoDia(date: string) {
  const { editalId, statusEdital } = useEstudo()
  const [plano, setPlano] = useState<PlanoDia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')
  const generation = useRef(0)
  const busy = useRef(false)
  const planoAtual = useRef<PlanoDia | null>(null)
  const recarregar = useCallback(async () => {
    const current = ++generation.current
    if (!editalId || statusEdital !== 'confirmado') { setPlano(null); setCarregando(false); return }
    const temDados = planoAtual.current?.date === date && planoAtual.current.noticeId === String(editalId)
    setCarregando(!temDados)
    setAtualizando(temDados)
    try {
      const data = await api<PlanoDia>(`/v1/plano?date=${encodeURIComponent(date)}`)
      if (current === generation.current) { planoAtual.current = data; setPlano(data); setErro('') }
    } catch (e) { if (current === generation.current) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar o plano.'); if (!temDados) { planoAtual.current = null; setPlano(null) } } }
    finally { if (current === generation.current) { setCarregando(false); setAtualizando(false) } }
  }, [date, editalId, statusEdital])
  useEffect(() => {
    planoAtual.current = null; setPlano(null); void recarregar()
    const update = () => { void recarregar() }
    window.addEventListener('studia:study-saved', update)
    return () => { generation.current++; window.removeEventListener('studia:study-saved', update) }
  }, [recarregar])

  async function salvar(blocks: BlocoPlano[], blockMinutes = plano?.blockMinutes ?? 25, breakMinutes = plano?.breakMinutes ?? 5): Promise<PlanoDia> {
    if (!plano || busy.current) throw new Error('Aguarde o plano carregar.')
    busy.current = true; setSalvando(true); setErro('')
    const current = generation.current
    try {
      const result = await api<PlanoDia>('/v1/plano', { method: 'PUT', body: JSON.stringify({ date: plano.date, noticeId: plano.noticeId, version: plano.version, blockMinutes, breakMinutes, blocks: blocks.map(({ id, topicId, minutes, status }) => ({ id, topicId, minutes, status })) }) })
      if (current === generation.current) { planoAtual.current = result; setPlano(result) }
      window.dispatchEvent(new Event('studia:plan-saved'))
      return result
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar o plano.'); throw e }
    finally { busy.current = false; setSalvando(false) }
  }
  return { plano, carregando, atualizando, salvando, erro, recarregar, salvar }
}
