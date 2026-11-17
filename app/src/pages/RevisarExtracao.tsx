import CampoSalvavel from '../components/CampoSalvavel'
import Carregamento from '../components/Carregamento'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { api } from '../lib/api'

export default function RevisarExtracao() {
  const { editalId, recarregar, nomeEdital, carregando, erro: erroCarga, statusEdital, temConteudoProgramatico, opcoes, todasMaterias, materias, atualizarSelecaoOpcao, adicionarMateria, atualizarNomeMateria, removerMateria, atualizarNomeTopico, removerTopico, adicionarTopico, atualizarPesoMateria, confirmarExtracao, desativarEditalAtual, alteracoesPendentes } =
    useEstudo()
  const navigate = useNavigate()
  const [novoTopico, setNovoTopico] = useState<Record<string, string>>({})
  const [novaMateria, setNovaMateria] = useState('')
  const [erro, setErro] = useState('')
  const [adicionandoTopico, setAdicionandoTopico] = useState<string | null>(null)
  const [adicionandoMateria, setAdicionandoMateria] = useState(false)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [nomeSalvo, setNomeSalvo] = useState(false)
  const [buscaCargo, setBuscaCargo] = useState('')
  const [atualizandoCargo, setAtualizandoCargo] = useState(false)
  const normalizarBusca = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const opcoesVisiveis = opcoes.filter((opcao) => normalizarBusca(`${opcao.codigo ?? ''} ${opcao.nome}`).includes(normalizarBusca(buscaCargo.trim())))

  useEffect(() => {
    if (!carregando && !erroCarga && statusEdital === 'vazio') {
      navigate('/editais')
    }
  }, [statusEdital, carregando, erroCarga, navigate])

  if (carregando) return <Carregamento rotulo="Carregando edital" />
  if (erroCarga) return <div role="alert" className="text-red-700">{erroCarga} <Link to="/editais" className="underline">Voltar aos editais</Link></div>

  if (statusEdital === 'vazio') {
    return null
  }

  if (statusEdital === 'processando') {
    return (
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-md bg-brand-500/10 p-4 text-sm text-brand-600">
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
    <div className="agenda-notice-review mx-auto flex max-w-6xl flex-col gap-6">
      <Link to="/editais" className="text-sm text-brand-600">Voltar aos editais</Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{nomeEdital}</h1>
          <p className="text-sm text-muted">
            Organize as matérias e informe os tópicos que farão parte do seu plano de estudos.
          </p>
        </div>

      </div>

      <div className={`agenda-review-columns ${opcoes.length ? '' : 'without-options'}`}><aside>{opcoes.length > 0 && (
        <section className="agenda-cargo-selector rounded-lg border border-line bg-surface p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-ink">Selecione seu cargo</h2>
            <p className="text-sm text-muted">Marque seu cargo para ver as matérias gerais e específicas correspondentes. Se escolher mais de um, o plano reunirá os conteúdos aplicáveis.</p>
          </div>
          <label className="mb-3 flex flex-col gap-2 text-sm text-ink">
            Buscar por nome ou código
            <input type="search" value={buscaCargo} onChange={(e) => setBuscaCargo(e.target.value)} className="min-w-0 rounded-md border border-line bg-soft px-3 py-2 focus:border-brand-400/60 focus:outline-none" />
          </label>
          <p role="status" className="mb-3 text-sm text-muted">{atualizandoCargo ? 'Atualizando conteúdos…' : `${opcoes.filter((opcao) => opcao.selecionada).length} selecionados de ${opcoes.length} opções`}</p>
          {opcoesVisiveis.length === 0 && <p className="text-sm text-muted">Nenhum cargo encontrado. Tente outro nome ou código.</p>}
          <div role="group" aria-label="Cargos disponíveis" tabIndex={0} className="grid max-h-80 gap-3 overflow-y-auto overscroll-contain pr-2 sm:grid-cols-2">
            {opcoesVisiveis.map((opcao) => {
              const disciplinas = todasMaterias.filter((materia) => materia.aplicaATodos || materia.opcaoIds.includes(opcao.id))
              const topicos = disciplinas.reduce((total, materia) => total + materia.topicos.length, 0)
              return (
                <label key={opcao.id} className={`flex cursor-pointer gap-3 rounded-md border p-4 transition-colors ${opcao.selecionada ? 'border-brand-400/60 bg-brand-500/10' : 'border-line bg-soft hover:border-line'}`}>
                  <input type="checkbox" checked={opcao.selecionada} disabled={atualizandoCargo} onChange={async (e) => {
                    if (atualizandoCargo) return
                    setAtualizandoCargo(true)
                    setErro('')
                    try { await atualizarSelecaoOpcao(opcao.id, e.target.checked) }
                    catch (erro) { setErro(erro instanceof Error ? erro.message : 'Não foi possível atualizar a opção.') }
                    finally { setAtualizandoCargo(false) }
                  }} className="mt-1 h-4 w-4 accent-blue-500 disabled:cursor-wait" />
                  <span><span className="block text-sm font-medium text-ink">{opcao.codigo ? `${opcao.codigo} · ` : ''}{opcao.nome}</span><span className="text-xs text-muted">{disciplinas.length} disciplinas, {topicos} assuntos e temas</span></span>
                </label>
              )
            })}
          </div>
        </section>
      )}</aside><div className="agenda-review-subjects">

      <div>
        <h2 className="font-semibold text-ink">Disciplinas, assuntos e temas</h2>
        <p className="text-sm text-muted">{opcoes.length > 0 ? 'As matérias abaixo correspondem aos cargos selecionados, incluindo os conhecimentos gerais aplicáveis.' : 'Confira as matérias e os tópicos do seu edital.'}</p>
      </div>

      {temConteudoProgramatico === false && (
        <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-900">
          <h3 className="font-semibold">Análise concluída: edital sem conteúdo programático</h3>
          <p className="mt-2">A análise não encontrou conteúdo programático estudável neste edital. Seleções exclusivamente por títulos ou experiência profissional podem não ter matérias de prova. Nenhuma matéria foi criada automaticamente.</p>
        </div>
      )}

      {todasMaterias.length === 0 && temConteudoProgramatico !== false && (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
          Nenhuma matéria cadastrada. Abra “Ajustar dados do edital” abaixo para adicionar a primeira matéria.
        </div>
      )}

      {todasMaterias.length > 0 && materias.length === 0 && (
        <div className="rounded-lg border border-dashed border-brand-400/30 bg-brand-500/5 p-6 text-center text-sm text-ink">
          Selecione ao menos um cargo, perfil ou especialidade para visualizar seus conteúdos.
        </div>
      )}

      <div className="rounded-lg border border-line bg-canvas/40 p-3 sm:p-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {materias.map((materia) => {
          const estilo = SUBJECT_STYLES[materia.cor]
          return (
            <article key={materia.id} className="flex h-[28rem] min-w-0 flex-col rounded-lg border border-line bg-surface p-4">
              <p className="mb-2 text-xs font-medium text-muted">
                {materia.tipoConhecimento === 'general' ? `Conhecimentos gerais · ${materia.grupoNome}` : materia.grupoNome}
              </p>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex w-full min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${estilo.dot}`} />
                  <CampoSalvavel
                    aria-label={`Nome da matéria ${materia.nome}`}
                    valor={materia.nome}
                    onSalvar={value => atualizarNomeMateria(materia.id, value)}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-semibold text-ink hover:border-line focus:border-brand-400/60 focus:bg-soft focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted">
                  peso no edital
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={materia.peso}
                    onChange={(e) => atualizarPesoMateria(materia.id, Number(e.target.value))}
                    className="w-16 rounded-lg border border-line bg-soft px-2 py-1 text-ink transition-colors focus:border-brand-400/60 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removerMateria(materia.id)}
                  className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-700 hover:bg-red-500/10"
                  aria-label={`Remover matéria ${materia.nome}`}
                >
                  remover
                </button>
              </div>

              <p className="mb-2 text-sm text-muted">{materia.topicos.length} tópicos</p>
              <ul tabIndex={0} aria-label={`Tópicos de ${materia.nome}`} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-2 focus-visible:outline-2 focus-visible:outline-brand-600">
                {materia.topicos.map((topico) => (
                  <li key={topico.id} className="flex shrink-0 items-center gap-2">
                    <CampoSalvavel
                      aria-label={`Nome do tópico ${topico.nome}`}
                      valor={topico.nome}
                      onSalvar={value => atualizarNomeTopico(materia.id, topico.id, value)}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400/60 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removerTopico(materia.id, topico.id)}
                      className="rounded-lg border border-red-500/30 px-2 py-2 text-xs text-red-700 transition-colors hover:bg-red-500/10"
                      aria-label={`Remover ${topico.nome}`}
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex shrink-0 items-center gap-2 pt-3">
                <input
                  aria-label={`Novo tópico de ${materia.nome}`} placeholder="Adicionar tópico…"
                  value={novoTopico[materia.id] ?? ''}
                  onChange={(e) => setNovoTopico((s) => ({ ...s, [materia.id]: e.target.value }))}
                  className="min-w-0 flex-1 rounded-lg border border-dashed border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-slate-600 transition-colors focus:border-brand-400/60 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={adicionandoTopico !== null}
                  onClick={async () => {
                    const nome = (novoTopico[materia.id] ?? '').trim()
                    if (!nome || adicionandoTopico) return
                    setAdicionandoTopico(materia.id); setErro('')
                    try { await adicionarTopico(materia.id, nome); setNovoTopico(current => current[materia.id]?.trim() === nome ? { ...current, [materia.id]: '' } : current) }
                    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível adicionar o tópico.') }
                    finally { setAdicionandoTopico(null) }
                  }}
                  className="rounded-lg bg-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-line-strong"
                >
                  Adicionar
                </button>
              </div>
            </article>
          )
        })}
      </div>
      </div>

      </div></div>

      <details className="agenda-notice-maintenance"><summary>Ajustar dados do edital</summary><div>
      <form className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-end" onSubmit={async (e) => {
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
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-ink">
          Nome do edital
          <input key={nomeEdital} name="nome" defaultValue={nomeEdital} required maxLength={180} disabled={salvandoNome} onChange={() => setNomeSalvo(false)} className="rounded-md border border-line bg-soft px-4 py-3 text-ink focus:border-brand-400/60 focus:outline-none" />
        </label>
        <button type="submit" disabled={salvandoNome} className="rounded-md bg-brand-600 px-4 py-3 text-sm font-medium text-on-brand disabled:opacity-50">{salvandoNome ? 'Salvando…' : 'Salvar nome'}</button>
        {nomeSalvo && <span role="status" className="text-sm text-emerald-700">Nome salvo.</span>}
      </form>

      <form
        className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          const nome = novaMateria.trim()
          if (!nome || adicionandoMateria) return
          setErro(''); setAdicionandoMateria(true)
          void adicionarMateria(nome).then(() => setNovaMateria('')).catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível adicionar a matéria.')).finally(() => setAdicionandoMateria(false))
        }}
      >
        <input
          disabled={adicionandoMateria} value={novaMateria}
          onChange={(e) => setNovaMateria(e.target.value)}
          aria-label="Nome da nova matéria" placeholder="Nome da matéria"
          className="flex-1 rounded-md border border-line bg-soft px-4 py-3 text-ink placeholder:text-slate-600 focus:border-brand-400/60 focus:outline-none"
        />
        <button type="submit" disabled={adicionandoMateria} className="rounded-md bg-brand-600 px-5 py-3 font-medium text-on-brand hover:bg-brand-500">
          Adicionar matéria
        </button>
      </form>

      {editalId && <Link to={`/editais/${editalId}/organizar`} className="quiet-link">Organizar em unidades de estudo</Link>}
        {statusEdital === 'confirmado' && <button
          type="button"
          onClick={() => void handleDesativar()}
          className="shrink-0 rounded-md border border-red-500/30 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10"
        >
          Desativar este edital
        </button>}
      </div></details>

      {erro && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">{erro}</p>}

      <button
        type="button"
        onClick={() => void handleConfirmar()}
        disabled={temConteudoProgramatico === false || atualizandoCargo || alteracoesPendentes}
        className="rounded-md bg-brand-600 px-4 py-3 font-medium text-on-brand transition-all duration-150 hover:scale-[1.015] hover:bg-brand-500 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirmar conteúdo e ativar edital
      </button>
    </div>
  )
}
