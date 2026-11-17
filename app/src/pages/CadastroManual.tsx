import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Carregamento from '../components/Carregamento'
import { useEstudo } from '../context/EstudoContext'
import { api } from '../lib/api'

interface Materia { id: string | number; name: string; topics: { id: string | number; name: string }[] }
interface Edital { title: string; source: string; status: string; subjects: Materia[] }
const etapas = ['Nome do edital', 'Matérias', 'Tópicos', 'Conferência']
const campo = 'min-w-0 w-full rounded-lg border border-line bg-surface px-3 py-3 text-ink placeholder:text-muted'

export default function CadastroManual() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { recarregar } = useEstudo()
  const [etapa, setEtapa] = useState(0)
  const [nome, setNome] = useState('')
  const [materias, setMaterias] = useState<Materia[]>([])
  const [novaMateria, setNovaMateria] = useState('')
  const [topicos, setTopicos] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(!!id)
  const [salvando, setSalvando] = useState(false)
  const ocupado = useRef(false)
  const requestKey = useRef(crypto.randomUUID())
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!id) return
    let ativo = true
    setCarregando(true)
    void api<Edital>(`/v1/editais/${id}`).then(d => {
      if (!ativo) return
      if (d.source !== 'manual' || d.status !== 'draft') { navigate(`/editais/${id}/revisar`, { replace: true }); return }
      setNome(d.title); setMaterias(d.subjects)
      setEtapa(d.subjects.length ? 2 : 1)
    }).catch(e => { if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar o rascunho.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [id, navigate])

  useEffect(() => { heading.current?.focus() }, [etapa, carregando])

  async function executar(acao: () => Promise<void>) {
    if (ocupado.current) return
    ocupado.current = true; setSalvando(true); setErro('')
    try { await acao() }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.') }
    finally { ocupado.current = false; setSalvando(false) }
  }

  async function salvarNome() {
    if (!nome.trim()) { setErro('Informe o nome do edital.'); return }
    await executar(async () => {
      if (id) {
        await api(`/v1/editais/${id}`, { method: 'PATCH', body: JSON.stringify({ title: nome.trim() }) })
        setEtapa(1)
      } else {
        const d = await api<{ id: string | number }>('/v1/editais', { method: 'POST', body: JSON.stringify({ title: nome.trim(), source: 'manual', request_key: requestKey.current }) })
        navigate(`/editais/${d.id}/manual`, { replace: true })
      }
    })
  }

  const completo = materias.length > 0 && materias.every(m => m.topics.length > 0)
  const textoPendente = materias.some(m => (topicos[m.id] ?? '').trim())
  if (carregando) return <Carregamento rotulo="Carregando cadastro manual" />

  return <div className="mx-auto flex max-w-3xl flex-col gap-6">
    <Link to="/editais" className="quiet-link">Voltar aos editais</Link>
    <header><h1 className="text-2xl font-semibold text-ink">Cadastrar edital manualmente</h1><p className="mt-2 text-muted">Monte seu conteúdo de estudo sem enviar PDF ou usar IA.</p></header>
    <ol aria-label="Etapas do cadastro" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{etapas.map((label, i) => <li key={label} aria-current={etapa === i ? 'step' : undefined} className={etapa === i ? 'font-semibold text-brand-600' : 'text-muted'}>{i + 1}. {label}</li>)}</ol>
    <section className="rounded-lg bg-surface p-5 sm:p-7" aria-busy={salvando}>
      <h2 ref={heading} tabIndex={-1} className="mb-4 text-xl font-semibold text-ink">{etapas[etapa]}</h2>
      <fieldset disabled={salvando || (!!id && !!erro && !nome)} className="min-w-0">
        {etapa === 0 && <form onSubmit={e => { e.preventDefault(); void salvarNome() }} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">Nome do edital<input className={campo} required maxLength={180} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Prefeitura 2026, Assistente administrativo" /></label>
          <p className="text-sm text-muted">Você pode incluir o cargo no nome para identificar seu plano.</p>
          <button className="daily-button daily-button-primary self-start" disabled={!nome.trim()}>{salvando ? 'Salvando…' : 'Salvar e continuar'}</button>
        </form>}
        {etapa === 1 && <div className="flex flex-col gap-5">
          <p className="text-muted">Adicione as matérias cobradas para o seu cargo, incluindo conhecimentos gerais e específicos.</p>
          <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); if (!novaMateria.trim()) return; void executar(async () => {
            const d = await api<{ id: string | number }>(`/v1/editais/${id}/materias`, { method: 'POST', body: JSON.stringify({ name: novaMateria.trim(), weight: 5, color: materias.length % 6 + 1 }) })
            setMaterias(ms => [...ms, { id: d.id, name: novaMateria.trim(), topics: [] }]); setNovaMateria('')
          }) }}>
            <label className="flex min-w-0 flex-1 flex-col gap-2">Nome da matéria<input className={campo} required maxLength={240} value={novaMateria} onChange={e => setNovaMateria(e.target.value)} placeholder="Ex.: Língua Portuguesa" /></label>
            <button className="daily-button" disabled={!novaMateria.trim()}>Adicionar matéria</button>
          </form>
          {novaMateria.trim() && <p className="text-sm text-muted">Clique em Adicionar matéria para salvar o nome digitado antes de continuar.</p>}
          <ul className="divide-y divide-line">{materias.map(m => <li key={m.id} className="flex items-center justify-between gap-3 py-3"><span>{m.name}</span><button type="button" className="quiet-link" aria-label={`Remover matéria ${m.name}`} onClick={() => void executar(async () => { await api(`/v1/materias/${m.id}`, { method: 'DELETE' }); setMaterias(ms => ms.filter(x => x.id !== m.id)) })}>Remover</button></li>)}</ul>
          {!materias.length && <p className="text-sm text-muted">Adicione a primeira matéria para continuar.</p>}
        </div>}
        {etapa === 2 && <div className="flex flex-col gap-6">
          <p className="text-muted">Cadastre um tópico por vez em cada matéria. Cada tópico será um assunto para estudar e revisar.</p>
          {materias.map(m => <div key={m.id} className="border-b border-line pb-5">
            <h3 className="mb-3 font-semibold">{m.name}</h3>
            <ul className="mb-3 max-h-64 overflow-y-auto">{m.topics.map(t => <li key={t.id} className="flex items-start justify-between gap-3 py-2"><span className="min-w-0 break-words">{t.name}</span><button type="button" className="quiet-link shrink-0" aria-label={`Remover tópico ${t.name}`} onClick={() => void executar(async () => { await api(`/v1/topicos/${t.id}`, { method: 'DELETE' }); setMaterias(ms => ms.map(x => x.id === m.id ? { ...x, topics: x.topics.filter(y => y.id !== t.id) } : x)) })}>Remover</button></li>)}</ul>
            <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); const name = (topicos[m.id] ?? '').trim(); if (!name) return; void executar(async () => {
              const d = await api<{ id: string | number }>(`/v1/materias/${m.id}/topicos`, { method: 'POST', body: JSON.stringify({ name, difficulty: 5 }) })
              setMaterias(ms => ms.map(x => x.id === m.id ? { ...x, topics: [...x.topics, { id: d.id, name }] } : x)); setTopicos(ts => ({ ...ts, [m.id]: '' }))
            }) }}>
              <label className="flex flex-col gap-2 text-sm">Novo tópico de {m.name}<textarea className={campo} rows={2} required maxLength={20000} value={topicos[m.id] ?? ''} onChange={e => setTopicos(ts => ({ ...ts, [m.id]: e.target.value }))} placeholder="Ex.: Compreensão e interpretação de textos" /></label>
              <button className="daily-button self-start" disabled={!(topicos[m.id] ?? '').trim()}>Adicionar tópico</button>
            </form>
            {!m.topics.length && <p className="mt-2 text-sm text-muted">Adicione pelo menos um tópico nesta matéria.</p>}
          </div>)}
          {textoPendente && <p role="status" className="text-sm text-muted">Há um tópico digitado. Clique em Adicionar tópico para salvá-lo antes de continuar.</p>}
        </div>}
        {etapa === 3 && <div className="flex flex-col gap-4">
          <p className="font-semibold">{nome}</p><p className="text-muted">{materias.length} matérias e {materias.reduce((n, m) => n + m.topics.length, 0)} tópicos. Confira o conteúdo antes de ativar.</p>
          <div className="max-h-[50dvh] overflow-y-auto">{materias.map(m => <div key={m.id} className="mb-4"><h3 className="font-semibold">{m.name}</h3><ul className="list-inside list-disc break-words">{m.topics.map(t => <li key={t.id}>{t.name}</li>)}</ul></div>)}</div>
          <p className="text-sm text-muted">Ao ativar, este edital será usado no planejamento. O histórico dos outros editais será preservado. Depois, você configura sua rotina.</p>
          <button className="daily-button daily-button-primary self-start" disabled={!completo} onClick={() => void executar(async () => { await api(`/v1/editais/${id}/ativar`, { method: 'POST' }); await recarregar(); navigate('/configuracao') })}>{salvando ? 'Ativando…' : 'Ativar edital e configurar rotina'}</button>
        </div>}
      </fieldset>
      {erro && <p role="alert" className="daily-error mt-4">{erro} {id && !nome && <button className="quiet-link" onClick={() => window.location.reload()}>Tentar novamente</button>}</p>}
      {etapa > 0 && <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button type="button" className="daily-button" disabled={salvando} onClick={() => { setErro(''); setEtapa(e => e - 1) }}>Voltar</button>
        {etapa < 3 && <button type="button" className="daily-button daily-button-primary" disabled={salvando || (etapa === 1 ? !materias.length || !!novaMateria.trim() : !completo || textoPendente)} onClick={() => { setErro(''); setEtapa(e => e + 1) }}>{etapa === 1 ? 'Continuar para tópicos' : 'Conferir edital'}</button>}
      </div>}
    </section>
    {id && <p className="text-sm text-muted">O que você adicionou já está salvo. Para retomar depois, abra Editais e escolha Continuar cadastro. Textos ainda não adicionados ficam apenas nesta página.</p>}
  </div>
}
