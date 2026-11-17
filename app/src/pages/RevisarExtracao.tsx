import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { api } from '../lib/api'

export default function RevisarExtracao() {
  const { editalId, recarregar, nomeEdital, carregando, erro: erroCarga, statusEdital, temConteudoProgramatico, opcoes, todasMaterias, materias, atualizarSelecaoOpcao, adicionarMateria, atualizarNomeMateria, removerMateria, atualizarNomeTopico, removerTopico, adicionarTopico, atualizarPesoMateria, confirmarExtracao, desativarEditalAtual } =
    useEstudo()
  const navigate = useNavigate()
  const [novoTopico, setNovoTopico] = useState<Record<string, string>>({})
  const [novaMateria, setNovaMateria] = useState('')
  const [erro, setErro] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [nomeSalvo, setNomeSalvo] = useState(false)
  const [materiasExpandidas, setMateriasExpandidas] = useState<Set<string>>(new Set())

  function alternarMateria(materiaId: string) {
    setMateriasExpandidas((atuais) => {
      const proximas = new Set(atuais)
      if (proximas.has(materiaId)) proximas.delete(materiaId)
      else proximas.add(materiaId)
      return proximas
    })
  }

  useEffect(() => {
    if (!carregando && !erroCarga && statusEdital === 'vazio') {
      navigate('/editais')
    }
  }, [statusEdital, carregando, erroCarga, navigate])

  if (carregando) return <p className="text-slate-400">Carregando edital…</p>
  if (erroCarga) return <div role="alert" className="text-red-300">{erroCarga} <Link to="/editais" className="underline">Voltar aos editais</Link></div>

  if (statusEdital === 'vazio') {
    return null
  }

  if (statusEdital === 'processando') {
    return (
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-xl bg-brand-500/10 p-4 text-sm text-brand-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        Lendo o edital…
      </div>
    )
  }

  async function handleConfirmar() {
    if (materias.length === 0 || materias.some((materia) => materia.nome.trim() === '' || materia.topicos.length === 0)) {
      setErro('Adicione pelo menos uma matéria e um tópico em cada matéria antes de continuar.')
      return
    }
    if (opcoes.length > 0 && !opcoes.some((opcao) => opcao.selecionada)) {
      setErro('Selecione pelo menos uma opção de cargo, perfil ou especialidade antes de continuar.')
      return
    }
    try {
      await confirmarExtracao()
      navigate('/configuracao')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ativar o edital.')
    }
  }

  async function handleDesativar() {
    const confirmado = window.confirm('Desativar este edital? Os dados serão preservados e você poderá enviar um novo edital.')
    if (!confirmado) return
    setErro('')
    try {
      await desativarEditalAtual()
      navigate('/edital')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível desativar o edital.')
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link to="/editais" className="text-sm text-brand-300">Voltar aos editais</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{nomeEdital}</h1>
          <p className="text-sm text-slate-400">
            Organize as matérias e informe os tópicos que farão parte do seu plano de estudos.
          </p>
        </div>
        {statusEdital === 'confirmado' && <button
          type="button"
          onClick={() => void handleDesativar()}
          className="shrink-0 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Desativar este edital
        </button>}
      </div>

      <form className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-navy-900 p-4 sm:flex-row sm:items-end" onSubmit={async (e) => {
        e.preventDefault()
        if (salvandoNome || !editalId) return
        const nome = String(new FormData(e.currentTarget).get('nome') ?? '').trim()
        if (!nome) { setErro('Informe o nome do edital.'); return }
        setSalvandoNome(true); setErro(''); setNomeSalvo(false)
        try {
          await api(`/v1/editais/${editalId}`, { method: 'PATCH', body: JSON.stringify({ title: nome }) })
          await recarregar()
          setNomeSalvo(true)
        } catch (e) {
          setErro(e instanceof Error ? e.message : 'Não foi possível salvar o nome.')
        } finally { setSalvandoNome(false) }
      }}>
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-slate-300">
          Nome do edital
          <input key={nomeEdital} name="nome" defaultValue={nomeEdital} required maxLength={180} disabled={salvandoNome} onChange={() => setNomeSalvo(false)} className="rounded-xl border border-white/10 bg-navy-850 px-4 py-3 text-slate-100 focus:border-brand-400/60 focus:outline-none" />
        </label>
        <button type="submit" disabled={salvandoNome} className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">{salvandoNome ? 'Salvando…' : 'Salvar nome'}</button>
        {nomeSalvo && <span role="status" className="text-sm text-emerald-300">Nome salvo.</span>}
      </form>

      <form
        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-navy-900 p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          const nome = novaMateria.trim()
          if (!nome) return
          setErro('')
          void adicionarMateria(nome).then(() => setNovaMateria('')).catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível adicionar a matéria.'))
        }}
      >
        <input
          value={novaMateria}
          onChange={(e) => setNovaMateria(e.target.value)}
          placeholder="Nome da matéria"
          className="flex-1 rounded-xl border border-white/10 bg-navy-850 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:border-brand-400/60 focus:outline-none"
        />
        <button type="submit" className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-500">
          Adicionar matéria
        </button>
      </form>

      {opcoes.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-navy-900 p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-white">Opções do edital</h2>
            <p className="text-sm text-slate-400">Selecione um ou mais cargos, perfis ou especialidades. O plano incluirá a união dos conteúdos aplicáveis.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {opcoes.map((opcao) => {
              const disciplinas = todasMaterias.filter((materia) => materia.opcaoIds.includes(opcao.id))
              const topicos = disciplinas.reduce((total, materia) => total + materia.topicos.length, 0)
              return (
                <label key={opcao.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${opcao.selecionada ? 'border-brand-400/60 bg-brand-500/10' : 'border-white/10 bg-navy-850 hover:border-white/20'}`}>
                  <input type="checkbox" checked={opcao.selecionada} onChange={(e) => void atualizarSelecaoOpcao(opcao.id, e.target.checked).catch((erro) => setErro(erro instanceof Error ? erro.message : 'Não foi possível atualizar a opção.'))} className="mt-1 h-4 w-4 accent-blue-500" />
                  <span><span className="block text-sm font-medium text-slate-100">{opcao.codigo ? `${opcao.codigo} · ` : ''}{opcao.nome}</span><span className="text-xs text-slate-400">{disciplinas.length} disciplinas, {topicos} assuntos e temas</span></span>
                </label>
              )
            })}
          </div>
        </section>
      )}

      <div>
        <h2 className="font-semibold text-white">Disciplinas, assuntos e temas</h2>
        <p className="text-sm text-slate-400">Conhecimentos gerais são obrigatórios. Disciplinas específicas acompanham a seleção dos perfis acima.</p>
      </div>

      {temConteudoProgramatico === false && (
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">
          <h3 className="font-semibold">Análise concluída: edital sem conteúdo programático</h3>
          <p className="mt-2">A análise não encontrou conteúdo programático estudável neste edital. Seleções exclusivamente por títulos ou experiência profissional podem não ter matérias de prova. Nenhuma matéria foi criada automaticamente.</p>
        </div>
      )}

      {todasMaterias.length === 0 && temConteudoProgramatico !== false && (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
          Nenhuma matéria cadastrada. Adicione a primeira matéria acima.
        </div>
      )}

      {todasMaterias.length > 0 && materias.length === 0 && (
        <div className="rounded-2xl border border-dashed border-brand-400/30 bg-brand-500/5 p-6 text-center text-sm text-slate-300">
          Selecione ao menos um cargo, perfil ou especialidade para visualizar seus conteúdos.
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-navy-950/40 p-3 sm:p-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {materias.map((materia) => {
          const estilo = SUBJECT_STYLES[materia.cor]
          const expandida = materiasExpandidas.has(materia.id)
          const topicosVisiveis = expandida ? materia.topicos : materia.topicos.slice(0, 3)
          return (
            <article key={materia.id} className={`flex flex-col rounded-2xl border border-white/10 bg-navy-900 p-4 transition-all ${expandida ? 'lg:col-span-2' : 'h-72'}`}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {materia.tipoConhecimento === 'general' ? `Conhecimentos gerais · ${materia.grupoNome}` : materia.grupoNome}
              </p>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${estilo.dot}`} />
                  <input
                    value={materia.nome}
                    onChange={(e) => atualizarNomeMateria(materia.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-semibold text-slate-100 hover:border-white/10 focus:border-brand-400/60 focus:bg-navy-850 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  peso no edital
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={materia.peso}
                    onChange={(e) => atualizarPesoMateria(materia.id, Number(e.target.value))}
                    className="w-16 rounded-lg border border-white/10 bg-navy-850 px-2 py-1 text-slate-100 transition-colors focus:border-brand-400/60 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removerMateria(materia.id)}
                  className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  aria-label={`Remover matéria ${materia.nome}`}
                >
                  remover
                </button>
              </div>

              <ul className={`flex min-h-0 flex-col gap-2 ${expandida ? 'max-h-[28rem] overflow-y-auto pr-1' : 'overflow-hidden'}`}>
                {topicosVisiveis.map((topico) => (
                  <li key={topico.id} className="flex items-center gap-2">
                    <input
                      value={topico.nome}
                      onChange={(e) => atualizarNomeTopico(materia.id, topico.id, e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-navy-850 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-brand-400/60 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removerTopico(materia.id, topico.id)}
                      className="rounded-lg border border-red-500/30 px-2 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/10"
                      aria-label={`Remover ${topico.nome}`}
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>

              {!expandida && materia.topicos.length > 3 && (
                <p className="mt-2 text-xs text-slate-500">Mais {materia.topicos.length - 3} assunto(s) oculto(s)</p>
              )}

              <div className="mt-auto flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => alternarMateria(materia.id)}
                  aria-expanded={expandida}
                  className="shrink-0 rounded-lg border border-brand-400/30 px-3 py-2 text-xs font-medium text-brand-200 transition-colors hover:bg-brand-500/10"
                >
                  {expandida ? 'Recolher' : `Expandir (${materia.topicos.length})`}
                </button>
                <input
                  placeholder="Adicionar tópico…"
                  value={novoTopico[materia.id] ?? ''}
                  onChange={(e) => setNovoTopico((s) => ({ ...s, [materia.id]: e.target.value }))}
                  className="flex-1 rounded-lg border border-dashed border-white/15 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-brand-400/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nome = (novoTopico[materia.id] ?? '').trim()
                    if (!nome) return
                    adicionarTopico(materia.id, nome)
                    setNovoTopico((s) => ({ ...s, [materia.id]: '' }))
                  }}
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-slate-100 transition-colors hover:bg-white/15"
                >
                  Adicionar
                </button>
              </div>
            </article>
          )
        })}
      </div>
      </div>

      {erro && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erro}</p>}

      <button
        type="button"
        onClick={() => void handleConfirmar()}
        disabled={temConteudoProgramatico === false}
        className="rounded-xl bg-brand-600 px-4 py-3 font-medium text-white transition-all duration-150 hover:scale-[1.015] hover:bg-brand-500 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirmar conteúdo e ativar edital
      </button>
    </div>
  )
}
