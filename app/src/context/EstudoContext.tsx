import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AreaEstudo, Disponibilidade, Materia, Metas, OpcaoEstudo, Sessao, Topico } from '../types'
import { montarCronograma } from '../lib/cronograma'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { dataLocal, diaNoFuso, lerData } from '../lib/datas'
import { useLocation } from 'react-router-dom'

export type StatusEdital = 'vazio' | 'processando' | 'extraido' | 'confirmado' | 'inativo' | 'finalizado'
interface DadosSessao { tempoMinutos: number; acertos: number; erros: number; dificuldade: number; dataEstudo?: string; concluiuAssunto?: boolean; requestKey?: string; planoId?: string; blocoId?: string }
export interface ResultadoSessao { id: string | number; nextReviewAt?: string | null }
interface ApiDashboard { edital?: { id: string | number; nome: string; status: string; temConteudoProgramatico?: boolean | null }; opcoes?: OpcaoEstudo[]; areas?: AreaEstudo[]; materias?: Materia[]; origens?: (Topico & { materiaId: string })[]; sessoes?: Sessao[]; configuracao?: { disponibilidade?: Disponibilidade; metas?: Metas; blocoMinutos?: number; pausaMinutos?: number; hoje?: string; timezone?: string }; data?: ApiDashboard }
export interface RotinaEstudo { disponibilidade: Disponibilidade; metas: Metas; blocoMinutos: number; pausaMinutos: number; timezone: string }
interface EstudoContextValue {
  timezone: string; origens: (Topico & { materiaId: string })[]; alteracoesPendentes: boolean; statusAlteracoes: string; falhaAlteracoes: boolean; repetirAlteracoes: () => void; restaurarPesoMateria: (id: string) => void
  nomeEdital: string; editalId: string | number | null; statusEdital: StatusEdital; temConteudoProgramatico: boolean | null; opcoes: OpcaoEstudo[]; areas: AreaEstudo[]; todasMaterias: Materia[]; materias: Materia[]; disponibilidade: Disponibilidade
  hoje: string; blocoMinutos: number; pausaMinutos: number; setBlocoMinutos: (v: number) => void; setPausaMinutos: (v: number) => void
  cronograma: ReturnType<typeof montarCronograma>; sessoes: Sessao[]; metas: Metas; carregando: boolean; erro: string
  recarregar: () => Promise<void>; iniciarProcessamento: (entrada?: File | string, nome?: string, retomarId?: string) => Promise<string | number>; importarRespostaIa: (resposta: string, nome?: string, retomarId?: string) => Promise<string | number>; iniciarCadastroManual: (nome?: string) => Promise<string | number>; confirmarExtracao: () => Promise<void>; desativarEditalAtual: () => Promise<void>
  adicionarMateria: (nome: string) => Promise<void>; atualizarNomeMateria: (id: string, nome: string) => void; removerMateria: (id: string) => void
  atualizarNomeTopico: (m: string, t: string, nome: string) => void; atualizarDificuldadeTopico: (m: string, t: string, d: number) => void
  removerTopico: (m: string, t: string) => void; adicionarTopico: (m: string, nome: string) => Promise<void>; atualizarPesoMateria: (m: string, p: number) => void
  atualizarSelecaoArea: (areaId: string, selecionada: boolean) => Promise<void>
  atualizarSelecaoOpcao: (opcaoId: string, selecionada: boolean) => Promise<void>
  setDisponibilidade: (v: Disponibilidade) => void; setMetas: (v: Metas) => void; salvarConfiguracao: (rotina?: RotinaEstudo) => Promise<void>
  registrarSessao: (m: string, t: string, d: DadosSessao) => Promise<ResultadoSessao>; marcarComoRevisado: (m: string, t: string) => Promise<ResultadoSessao>
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
  const chaveDados = useRef('')
  const fila = useRef(Promise.resolve())
  const falhas = useRef(new Map<string, () => Promise<unknown>>())
  const [pendentes, setPendentes] = useState(0)
  const [quantidadeFalhas, setQuantidadeFalhas] = useState(0)
  const [statusAlteracoes, setStatusAlteracoes] = useState('')
  const [timezone, setTimezone] = useState('America/Manaus')
  const [origens, setOrigens] = useState<(Topico & { materiaId: string })[]>([])
  const [editalId, setEditalId] = useState<string | number | null>(null), [nomeEdital, setNomeEdital] = useState('Meu edital')
  const [temConteudoProgramatico, setTemConteudoProgramatico] = useState<boolean | null>(null)
  const [statusEdital, setStatusEdital] = useState<StatusEdital>('vazio'), [todasMaterias, setTodasMaterias] = useState<Materia[]>([]), [areas, setAreas] = useState<AreaEstudo[]>([]), [opcoes, setOpcoes] = useState<OpcaoEstudo[]>([])
  const [disponibilidade, setDisponibilidade] = useState(disponibilidadePadrao), [sessoes, setSessoes] = useState<Sessao[]>([])
  const [blocoMinutos, setBlocoMinutos] = useState(25), [pausaMinutos, setPausaMinutos] = useState(5), [hoje, setHoje] = useState(dataLocal())
  const [metas, setMetas] = useState(metasPadrao), [erro, setErro] = useState('')
  const carregar = useCallback(async () => {
    if (!usuario || usuario.mustChangePassword) return
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
      setOrigens(d.origens ?? []); setTimezone(d.configuracao?.timezone ?? 'America/Manaus'); chaveDados.current = chaveCarga
      setDisponibilidade(normalizarDisponibilidade(d.configuracao?.disponibilidade))
      setMetas(d.configuracao?.metas ?? metasPadrao)
      setBlocoMinutos(d.configuracao?.blocoMinutos ?? 25); setPausaMinutos(d.configuracao?.pausaMinutos ?? 5); setHoje(d.configuracao?.hoje ?? dataLocal())
    } catch (e) {
      if (carga !== ultimaCarga.current) return
      if (chaveDados.current !== chaveCarga) { setEditalId(null); setStatusEdital('vazio'); setTodasMaterias([]); setSessoes([]); setAreas([]); setOpcoes([]); setOrigens([]) }
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
  const cronograma = useMemo(() => montarCronograma(materias, lerData(hoje)), [materias, hoje])
  useEffect(() => {
    const atualizarDia = () => { if (document.visibilityState === 'visible') setHoje(diaNoFuso(timezone)) }
    const timer = window.setInterval(atualizarDia, 15000)
    window.addEventListener('focus', atualizarDia); document.addEventListener('visibilitychange', atualizarDia)
    return () => { clearInterval(timer); window.removeEventListener('focus', atualizarDia); document.removeEventListener('visibilitychange', atualizarDia) }
  }, [timezone])
  function agendar(chave: string, tarefa: () => Promise<unknown>) {
    setPendentes(p => p + 1); setStatusAlteracoes('Salvando alterações...')
    fila.current = fila.current.then(async () => {
      try { await tarefa(); falhas.current.delete(chave); setStatusAlteracoes(falhas.current.size ? 'Há alterações não salvas. Tente novamente.' : 'Alterações salvas.') }
      catch (e) { falhas.current.set(chave, tarefa); setStatusAlteracoes(e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.') }
      finally { setQuantidadeFalhas(falhas.current.size); setPendentes(p => p - 1) }
    })
  }
  async function aguardarGravacoes() { await fila.current; if (falhas.current.size) throw new Error('Há alterações não salvas. Tente salvá-las novamente antes de continuar.') }
  function repetirAlteracoes() { for (const [chave, tarefa] of falhas.current) agendar(chave, tarefa) }
  async function criarEdital(nome: string, source: string, importacao = false) {
    let requestKey: string | undefined
    if (importacao) { try { const key = `studia:importKey:${usuario?.id}`; requestKey = sessionStorage.getItem(key) ?? crypto.randomUUID(); sessionStorage.setItem(key, requestKey) } catch { requestKey = crypto.randomUUID() } }
    const criado = await api<{ id: string | number }>('/v1/editais', {
      method: 'POST', body: JSON.stringify({ title: nome.trim(), source, request_key: requestKey }),
    })
    return criado.id
  }
  async function iniciarProcessamento(entrada?: File | string, nome = 'Meu edital', retomarId?: string) {
    setErro('')
    const id = retomarId ?? await criarEdital(nome, entrada instanceof File ? 'pdf' : 'text', true)
    try { sessionStorage.setItem(`studia:importacao:${usuario?.id}`, String(id)) } catch { /* Retry remains available through Editais. */ }
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
  async function importarRespostaIa(resposta: string, nome = 'Meu edital', retomarId?: string) {
    setErro('')
    const id = retomarId ?? await criarEdital(nome, 'text', true)
    try { sessionStorage.setItem(`studia:importacao:${usuario?.id}`, String(id)) } catch { /* Retry remains available through Editais. */ }
    await api(`/v1/editais/${id}/importar-resposta`, {
      method: 'POST', body: JSON.stringify({ response: resposta }),
    })
    return id
  }
  async function confirmarExtracao() { await aguardarGravacoes(); if (editalId) { await api(`/v1/editais/${editalId}/confirmar`, { method: 'POST' }); setStatusEdital('confirmado') } }
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
  async function adicionarMateria(nome: string) { await aguardarGravacoes(); if (!editalId) throw new Error('Inicie o cadastro manual primeiro.'); await api(`/v1/editais/${editalId}/materias`, { method: 'POST', body: JSON.stringify({ name: nome, weight: 5, color: (todasMaterias.length % 6) + 1 }) }); await carregar() }
  function atualizarNomeMateria(id: string, nome: string) { setTodasMaterias(ms => ms.map(x => x.id === id ? { ...x, nome } : x)); agendar(`materia:${id}:nome`, () => api(`/v1/materias/${id}`, { method: 'PATCH', body: JSON.stringify({ name: nome }) })) }
  function removerMateria(id: string) { if (!window.confirm('Remover esta matéria e seus tópicos? Conteúdos com estudos ou planos salvos serão preservados.')) return; agendar(`materia:${id}:remover`, async () => { await api(`/v1/materias/${id}`, { method: 'DELETE' }); setTodasMaterias(ms => ms.filter(x => x.id !== id)) }) }
  function patchTopico(m: string, t: string, patch: object) { setTodasMaterias(ms => ms.map(x => x.id !== m ? x : { ...x, topicos: x.topicos.map(y => y.id === t ? { ...y, ...patch } : y) })); agendar(`topico:${t}:${Object.keys(patch).join()}`, () => api(`/v1/topicos/${t}`, { method: 'PATCH', body: JSON.stringify(patch) })) }
  function atualizarNomeTopico(m: string, t: string, nome: string) { patchTopico(m, t, { nome, name: nome }) }
  function atualizarDificuldadeTopico(m: string, t: string, dificuldade: number) { patchTopico(m, t, { dificuldade, difficulty: dificuldade }) }
  function removerTopico(m: string, t: string) { if (!window.confirm('Remover este tópico? Conteúdos com estudos ou planos salvos serão preservados.')) return; agendar(`topico:${t}:remover`, async () => { await api(`/v1/topicos/${t}`, { method: 'DELETE' }); setTodasMaterias(ms => ms.map(x => x.id !== m ? x : { ...x, topicos: x.topicos.filter(y => y.id !== t) })) }) }
  async function adicionarTopico(m: string, nome: string) { await aguardarGravacoes(); await api(`/v1/materias/${m}/topicos`, { method: 'POST', body: JSON.stringify({ name: nome, difficulty: 10 }) }); await carregar() }
  function atualizarPesoMateria(m: string, peso: number) { setTodasMaterias(ms => ms.map(x => x.id === m ? { ...x, peso, pesoPersonalizado: true } : x)); agendar(`materia:${m}:peso`, () => api(`/v1/materias/${m}`, { method: 'PATCH', body: JSON.stringify({ weight: peso }) })) }
  function restaurarPesoMateria(m: string) { agendar(`materia:${m}:peso`, async () => { await api(`/v1/materias/${m}`, { method: 'PATCH', body: JSON.stringify({ reset_weight: true }) }); await carregar() }) }
  async function atualizarSelecaoArea(areaId: string, selecionada: boolean) { await aguardarGravacoes(); if (!editalId) return; setAreas((as) => as.map((a) => a.id === areaId ? { ...a, selecionada } : a)); setTodasMaterias((ms) => ms.map((m) => m.areaId === areaId ? { ...m, selecionada } : m)); try { await api(`/v1/editais/${editalId}/areas/${areaId}`, { method: 'PATCH', body: JSON.stringify({ selected: selecionada }) }) } catch (e) { await carregar(); throw e } }
  async function atualizarSelecaoOpcao(opcaoId: string, selecionada: boolean) {
    await aguardarGravacoes()
    if (!editalId) return
    const proximasOpcoes = opcoes.map((opcao) => opcao.id === opcaoId ? { ...opcao, selecionada } : opcao)
    const idsSelecionados = new Set(proximasOpcoes.filter((opcao) => opcao.selecionada).map((opcao) => opcao.id))
    setOpcoes(proximasOpcoes)
    setTodasMaterias((lista) => lista.map((materia) => ({
      ...materia,
      selecionada: materia.aplicaATodos || materia.opcaoIds.some((id) => idsSelecionados.has(id)),
    })))
    try {
      await api(`/v1/editais/${editalId}/opcoes/${opcaoId}`, { method: 'PATCH', body: JSON.stringify({ selected: selecionada }) })
      await carregar()
    } catch (e) {
      await carregar()
      throw e
    }
  }
  async function salvarConfiguracao(rotina?: RotinaEstudo) { await aguardarGravacoes(); const r = rotina ?? { disponibilidade, metas, blocoMinutos, pausaMinutos, timezone }; const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const; const availability = Object.fromEntries(dias.map((dia, i) => [i, Math.round(r.disponibilidade[dia] * 60)])); await api('/v1/configuracao', { method: 'PUT', body: JSON.stringify({ availability, block_minutes: r.blocoMinutos, break_minutes: r.pausaMinutos, weekly_question_goal: r.metas.questoesPorSemana, weekly_minutes_goal: r.metas.minutosPorSemana, timezone: r.timezone }) }); await carregar() }
  async function registrarSessao(_m: string, t: string, d: DadosSessao): Promise<ResultadoSessao> {
    setErro('')
    const result = await api<ResultadoSessao>('/v1/sessoes', { method: 'POST', body: JSON.stringify({ topic_id: t, studied_on: d.dataEstudo ?? hoje, minutes: d.tempoMinutos, correct_answers: d.acertos, wrong_answers: d.erros, difficulty: d.dificuldade, completes_topic: d.concluiuAssunto ?? true, request_key: d.requestKey, plan_id: d.planoId, block_id: d.blocoId }) })
    await carregar()
    window.dispatchEvent(new Event('studia:study-saved'))
    return result
  }
  function marcarComoRevisado(m: string, t: string) { return registrarSessao(m, t, { tempoMinutos: 0, acertos: 0, erros: 0, dificuldade: materias.find((x) => x.id === m)?.topicos.find((x) => x.id === t)?.dificuldade ?? 5 }) }
  return <EstudoContext.Provider value={{ timezone, origens, alteracoesPendentes: pendentes > 0 || quantidadeFalhas > 0, falhaAlteracoes: quantidadeFalhas > 0, statusAlteracoes, repetirAlteracoes, restaurarPesoMateria, hoje, blocoMinutos, pausaMinutos, setBlocoMinutos, setPausaMinutos, nomeEdital, editalId, statusEdital, temConteudoProgramatico, opcoes, areas, todasMaterias, materias, disponibilidade, cronograma, sessoes, metas, carregando: chaveCarregada !== chaveCarga, erro, recarregar: carregar, iniciarProcessamento, importarRespostaIa, iniciarCadastroManual, confirmarExtracao, desativarEditalAtual, adicionarMateria, atualizarNomeMateria, removerMateria, atualizarNomeTopico, atualizarDificuldadeTopico, removerTopico, adicionarTopico, atualizarPesoMateria, atualizarSelecaoArea, atualizarSelecaoOpcao, setDisponibilidade, setMetas, salvarConfiguracao, registrarSessao, marcarComoRevisado }}>{children}</EstudoContext.Provider>
}
export function useEstudo() { const c = useContext(EstudoContext); if (!c) throw new Error('useEstudo precisa estar dentro de EstudoProvider'); return c }
