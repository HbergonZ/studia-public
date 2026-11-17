import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AreaEstudo, Disponibilidade, Materia, Metas, OpcaoEstudo, Sessao } from '../types'
import { montarCronograma } from '../lib/cronograma'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { useLocation } from 'react-router-dom'

export type StatusEdital = 'vazio' | 'processando' | 'extraido' | 'confirmado' | 'inativo' | 'finalizado'
interface DadosSessao { tempoMinutos: number; acertos: number; erros: number; dificuldade: number }
interface ApiDashboard { edital?: { id: string | number; nome: string; status: string; temConteudoProgramatico?: boolean | null }; opcoes?: OpcaoEstudo[]; areas?: AreaEstudo[]; materias?: Materia[]; sessoes?: Sessao[]; configuracao?: { disponibilidade?: Disponibilidade; metas?: Metas }; data?: ApiDashboard }
interface EstudoContextValue {
  nomeEdital: string; editalId: string | number | null; statusEdital: StatusEdital; temConteudoProgramatico: boolean | null; opcoes: OpcaoEstudo[]; areas: AreaEstudo[]; todasMaterias: Materia[]; materias: Materia[]; disponibilidade: Disponibilidade
  cronograma: ReturnType<typeof montarCronograma>; sessoes: Sessao[]; metas: Metas; carregando: boolean; erro: string
  recarregar: () => Promise<void>; iniciarProcessamento: (entrada?: File | string, nome?: string) => Promise<string | number>; importarRespostaIa: (resposta: string, nome?: string) => Promise<string | number>; iniciarCadastroManual: (nome?: string) => Promise<string | number>; confirmarExtracao: () => Promise<void>; desativarEditalAtual: () => Promise<void>
  adicionarMateria: (nome: string) => Promise<void>; atualizarNomeMateria: (id: string, nome: string) => void; removerMateria: (id: string) => void
  atualizarNomeTopico: (m: string, t: string, nome: string) => void; atualizarDificuldadeTopico: (m: string, t: string, d: number) => void
  removerTopico: (m: string, t: string) => void; adicionarTopico: (m: string, nome: string) => void; atualizarPesoMateria: (m: string, p: number) => void
  atualizarSelecaoArea: (areaId: string, selecionada: boolean) => Promise<void>
  atualizarSelecaoOpcao: (opcaoId: string, selecionada: boolean) => Promise<void>
  setDisponibilidade: (v: Disponibilidade) => void; setMetas: (v: Metas) => void; salvarConfiguracao: () => Promise<void>
  registrarSessao: (m: string, t: string, d: DadosSessao) => void; marcarComoRevisado: (m: string, t: string) => void
}
const EstudoContext = createContext<EstudoContextValue | null>(null)
const disponibilidadePadrao: Disponibilidade = { segunda: 0, terca: 0, quarta: 0, quinta: 0, sexta: 0, sabado: 0, domingo: 0 }
const metasPadrao: Metas = { questoesPorSemana: 0, minutosPorSemana: 0 }
const unwrap = (p: ApiDashboard) => p.data ?? p
const statusDaApi: Record<string, StatusEdital> = {
  confirmed: 'confirmado', extracted: 'extraido', inactive: 'inativo', completed: 'finalizado',
  processing: 'processando', draft: 'extraido', failed: 'extraido',
}
const normalizarDisponibilidade = (valor?: Partial<Disponibilidade>): Disponibilidade => ({
  ...disponibilidadePadrao,
  ...Object.fromEntries(Object.entries(valor ?? {}).map(([dia, horas]) => [dia, Number.isFinite(Number(horas)) ? Number(horas) : 0])),
})

export function EstudoProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const editalEmRevisao = pathname.match(/^\/editais\/(\d+)\/revisar$/)?.[1]
  const chaveCarga = `${usuario?.id ?? ''}:${editalEmRevisao ?? 'ativo'}`
  const [chaveCarregada, setChaveCarregada] = useState('')
  const ultimaCarga = useRef(0)
  const [editalId, setEditalId] = useState<string | number | null>(null), [nomeEdital, setNomeEdital] = useState('Meu edital')
  const [temConteudoProgramatico, setTemConteudoProgramatico] = useState<boolean | null>(null)
  const [statusEdital, setStatusEdital] = useState<StatusEdital>('vazio'), [todasMaterias, setTodasMaterias] = useState<Materia[]>([]), [areas, setAreas] = useState<AreaEstudo[]>([]), [opcoes, setOpcoes] = useState<OpcaoEstudo[]>([])
  const [disponibilidade, setDisponibilidade] = useState(disponibilidadePadrao), [sessoes, setSessoes] = useState<Sessao[]>([])
  const [metas, setMetas] = useState(metasPadrao), [erro, setErro] = useState('')
  const carregar = useCallback(async () => {
    if (!usuario) return
    const carga = ++ultimaCarga.current
    try {
      const d = unwrap(await api<ApiDashboard>(editalEmRevisao ? `/v1/dashboard?edital_id=${editalEmRevisao}` : '/v1/dashboard'))
      if (carga !== ultimaCarga.current) return
      setErro('')
      setEditalId(d.edital?.id ?? null)
      setNomeEdital(d.edital?.nome ?? 'Meu edital')
      setTemConteudoProgramatico(d.edital?.temConteudoProgramatico ?? null)
      setStatusEdital(statusDaApi[d.edital?.status ?? ''] ?? 'vazio')
      setAreas(d.areas ?? []); setOpcoes(d.opcoes ?? []); setTodasMaterias(d.materias ?? [])
      setSessoes(d.sessoes ?? [])
      setDisponibilidade(normalizarDisponibilidade(d.configuracao?.disponibilidade))
      setMetas(d.configuracao?.metas ?? metasPadrao)
    } catch (e) {
      if (carga !== ultimaCarga.current) return
      setEditalId(null); setStatusEdital('vazio'); setTodasMaterias([]); setSessoes([]); setAreas([]); setOpcoes([])
      setErro(e instanceof Error ? e.message : 'Falha ao carregar dados.')
    } finally {
      if (carga === ultimaCarga.current) setChaveCarregada(chaveCarga)
    }
  }, [usuario, editalEmRevisao, chaveCarga])
  useEffect(() => {
    const controleCarga = ultimaCarga
    void carregar()
    return () => { controleCarga.current++ }
  }, [carregar])
  const materias = useMemo(() => todasMaterias.filter((materia) => materia.selecionada), [todasMaterias])
  const cronograma = useMemo(() => montarCronograma(materias), [materias])
  async function criarEdital(nome: string, source: string) {
    const criado = await api<{ id: string | number }>('/v1/editais', {
      method: 'POST', body: JSON.stringify({ title: nome.trim(), source }),
    })
    return criado.id
  }
  async function iniciarProcessamento(entrada?: File | string, nome = 'Meu edital') {
    setErro('')
    const id = await criarEdital(nome, entrada instanceof File ? 'pdf' : 'text')
    const init: RequestInit = { method: 'POST' }
    if (entrada instanceof File) {
      const form = new FormData(); form.append('file', entrada); init.body = form
    } else {
      const form = new FormData(); form.append('text', entrada ?? ''); init.body = form
    }
    await api(`/v1/editais/${id}/extrair`, init)
    return id
  }
  async function iniciarCadastroManual(nome = 'Meu plano de estudos') {
    return criarEdital(nome, 'manual')
  }
  async function importarRespostaIa(resposta: string, nome = 'Meu edital') {
    setErro('')
    const id = await criarEdital(nome, 'text')
    await api(`/v1/editais/${id}/importar-resposta`, {
      method: 'POST', body: JSON.stringify({ response: resposta }),
    })
    return id
  }
  async function confirmarExtracao() { if (editalId) { await api(`/v1/editais/${editalId}/confirmar`, { method: 'POST' }); setStatusEdital('confirmado') } }
  async function desativarEditalAtual() {
    if (!editalId) return
    setErro('')
    await api(`/v1/editais/${editalId}/desativar`, { method: 'POST' })
    setEditalId(null)
    setNomeEdital('Meu edital')
    setStatusEdital('vazio')
    setTodasMaterias([])
    setAreas([])
    setOpcoes([])
    setTemConteudoProgramatico(null)
  }
  async function adicionarMateria(nome: string) { if (!editalId) throw new Error('Inicie o cadastro manual primeiro.'); await api(`/v1/editais/${editalId}/materias`, { method: 'POST', body: JSON.stringify({ name: nome, weight: 5, color: (todasMaterias.length % 6) + 1 }) }); await carregar() }
  function atualizarNomeMateria(id: string, nome: string) { setTodasMaterias((ms) => ms.map((x) => x.id === id ? { ...x, nome } : x)); void api(`/v1/materias/${id}`, { method: 'PATCH', body: JSON.stringify({ name: nome }) }).catch(() => void carregar()) }
  function removerMateria(id: string) { setTodasMaterias((ms) => ms.filter((x) => x.id !== id)); void api(`/v1/materias/${id}`, { method: 'DELETE' }).catch(() => void carregar()) }
  function patchTopico(m: string, t: string, patch: object) { setTodasMaterias((ms) => ms.map((x) => x.id !== m ? x : { ...x, topicos: x.topicos.map((y) => y.id === t ? { ...y, ...patch } : y) })); void api(`/v1/topicos/${t}`, { method: 'PATCH', body: JSON.stringify(patch) }).catch(() => void carregar()) }
  function atualizarNomeTopico(m: string, t: string, nome: string) { patchTopico(m, t, { nome, name: nome }) }
  function atualizarDificuldadeTopico(m: string, t: string, dificuldade: number) { patchTopico(m, t, { dificuldade, difficulty: dificuldade }) }
  function removerTopico(m: string, t: string) { setTodasMaterias((ms) => ms.map((x) => x.id !== m ? x : { ...x, topicos: x.topicos.filter((y) => y.id !== t) })); void api(`/v1/topicos/${t}`, { method: 'DELETE' }).catch(() => void carregar()) }
  function adicionarTopico(m: string, nome: string) { void api(`/v1/materias/${m}/topicos`, { method: 'POST', body: JSON.stringify({ name: nome, difficulty: 10 }) }).then(carregar).catch((e) => setErro(e.message)) }
  function atualizarPesoMateria(m: string, peso: number) { setTodasMaterias((ms) => ms.map((x) => x.id === m ? { ...x, peso } : x)); void api(`/v1/materias/${m}`, { method: 'PATCH', body: JSON.stringify({ weight: peso }) }).catch(() => void carregar()) }
  async function atualizarSelecaoArea(areaId: string, selecionada: boolean) { if (!editalId) return; setAreas((as) => as.map((a) => a.id === areaId ? { ...a, selecionada } : a)); setTodasMaterias((ms) => ms.map((m) => m.areaId === areaId ? { ...m, selecionada } : m)); try { await api(`/v1/editais/${editalId}/areas/${areaId}`, { method: 'PATCH', body: JSON.stringify({ selected: selecionada }) }) } catch (e) { await carregar(); throw e } }
  async function atualizarSelecaoOpcao(opcaoId: string, selecionada: boolean) {
    if (!editalId) return
    const proximasOpcoes = opcoes.map((opcao) => opcao.id === opcaoId ? { ...opcao, selecionada } : opcao)
    const idsSelecionados = new Set(proximasOpcoes.filter((opcao) => opcao.selecionada).map((opcao) => opcao.id))
    setOpcoes(proximasOpcoes)
    setTodasMaterias((lista) => lista.map((materia) => ({
      ...materia,
      selecionada: materia.tipoConhecimento === 'general' || materia.opcaoIds.some((id) => idsSelecionados.has(id)),
    })))
    try {
      await api(`/v1/editais/${editalId}/opcoes/${opcaoId}`, { method: 'PATCH', body: JSON.stringify({ selected: selecionada }) })
      await carregar()
    } catch (e) {
      await carregar()
      throw e
    }
  }
  async function salvarConfiguracao() { const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const; const availability = Object.fromEntries(dias.map((dia, i) => [i, Math.round(disponibilidade[dia] * 60)])); await api('/v1/configuracao', { method: 'PUT', body: JSON.stringify({ availability, weekly_question_goal: metas.questoesPorSemana, weekly_minutes_goal: metas.minutosPorSemana }) }) }
  function registrarSessao(_m: string, t: string, d: DadosSessao) { void api('/v1/sessoes', { method: 'POST', body: JSON.stringify({ topic_id: t, minutes: d.tempoMinutos, correct_answers: d.acertos, wrong_answers: d.erros, difficulty: d.dificuldade }) }).then(carregar).catch((e) => setErro(e.message)) }
  function marcarComoRevisado(m: string, t: string) { registrarSessao(m, t, { tempoMinutos: 0, acertos: 0, erros: 0, dificuldade: materias.find((x) => x.id === m)?.topicos.find((x) => x.id === t)?.dificuldade ?? 5 }) }
  return <EstudoContext.Provider value={{ nomeEdital, editalId, statusEdital, temConteudoProgramatico, opcoes, areas, todasMaterias, materias, disponibilidade, cronograma, sessoes, metas, carregando: chaveCarregada !== chaveCarga, erro, recarregar: carregar, iniciarProcessamento, importarRespostaIa, iniciarCadastroManual, confirmarExtracao, desativarEditalAtual, adicionarMateria, atualizarNomeMateria, removerMateria, atualizarNomeTopico, atualizarDificuldadeTopico, removerTopico, adicionarTopico, atualizarPesoMateria, atualizarSelecaoArea, atualizarSelecaoOpcao, setDisponibilidade, setMetas, salvarConfiguracao, registrarSessao, marcarComoRevisado }}>{usuario && chaveCarregada !== chaveCarga ? <div className="p-8 text-slate-400">Carregando...</div> : children}</EstudoContext.Provider>
}
export function useEstudo() { const c = useContext(EstudoContext); if (!c) throw new Error('useEstudo precisa estar dentro de EstudoProvider'); return c }
