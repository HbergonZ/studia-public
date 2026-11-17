import { useAuth } from '../context/AuthContext'
import { IconFile } from '../components/icons'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import PreviaUnidades from '../components/PreviaUnidades'
import type { PreviaImportacao } from '../lib/studyUnits'
import { api } from '../lib/api'
import { useEstudo } from '../context/EstudoContext'
import { EDITAL_ANALYSIS_PROMPT } from '../lib/editalPrompt'

function TelaLendoEdital() {
  return <section role="status" aria-live="polite" className="daily-empty"><IconFile className="mx-auto h-10 w-10 text-brand-600" /><h1>Lendo seu edital</h1><p>A análise pode levar alguns minutos. Se a conexão for interrompida, você poderá retomar o mesmo edital pela lista de editais.</p><p>O progresso fica salvo para você retomar depois.</p></section>
}

export default function UploadEdital() {
  const { usuario } = useAuth()
  const chaveImportacao = `studia:importacao:${usuario?.id}`
  const chaveResposta = `studia:resposta-ia:${usuario?.id}`
  const [retomarId, setRetomarId] = useState<string | undefined>(() => {
    const params = new URLSearchParams(location.search); if (params.get('manual') === '1') return undefined
    const id = params.get('retomar')
    try { const saved = id ?? sessionStorage.getItem(chaveImportacao); return saved && /^\d+$/.test(saved) ? saved : undefined } catch { return id && /^\d+$/.test(id) ? id : undefined }
  })
  const limparRascunho = useCallback(() => { try { sessionStorage.removeItem(chaveImportacao); sessionStorage.removeItem(chaveResposta); sessionStorage.removeItem(`studia:importKey:${usuario?.id}`) } catch { /* Storage may be unavailable. */ } }, [chaveImportacao, chaveResposta, usuario?.id])
  const guardarRetomada = () => { try { setRetomarId(sessionStorage.getItem(chaveImportacao) ?? undefined) } catch { /* The list still exposes the draft. */ } }
  const { importarRespostaIa } = useEstudo()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)
  const navigate = useNavigate()
  const [mostrarImportacao, setMostrarImportacao] = useState(false)
  const [respostaIa, setRespostaIa] = useState(() => { try { return sessionStorage.getItem(chaveResposta) ?? '' } catch { return '' } })
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null)
  const [importando, setImportando] = useState(false)
  const [statusCopia, setStatusCopia] = useState<'idle' | 'copiado' | 'erro'>('idle')

  useEffect(() => {
    if (!retomarId) return
    let ativo = true
    let timer: ReturnType<typeof setTimeout> | undefined
    async function consultar() {
      try {
        const value = await api<{title: string; status: string; extraction_error?: string; job_import_pending?: boolean}>(`/v1/editais/${retomarId}`)
        if (!ativo) return
        if (value.job_import_pending) { navigate(`/editais/${retomarId}/cargo`, { replace: true }); return }
        setNome(current => current || value.title)
        if (value.status === 'extracted' || value.status === 'confirmed') { limparRascunho(); navigate(`/editais/${retomarId}/revisar`, { replace: true }); return }
        if (value.status === 'processing') timer = setTimeout(() => void consultar(), 5000)
        if (value.status === 'failed' && value.extraction_error) setErro(value.extraction_error)
      } catch (e) { if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível consultar a importação.') }
    }
    void consultar()
    return () => { ativo = false; clearTimeout(timer) }
  }, [retomarId, limparRascunho, navigate])
  useEffect(() => { try { if (respostaIa) sessionStorage.setItem(chaveResposta, respostaIa); else sessionStorage.removeItem(chaveResposta); sessionStorage.removeItem(`studia:importKey:${usuario?.id}`) } catch { /* Large responses can still be imported without a local copy. */ } }, [respostaIa, chaveResposta])

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(EDITAL_ANALYSIS_PROMPT)
      setStatusCopia('copiado')
    } catch {
      setStatusCopia('erro')
    }
  }

  async function handleProcessar(arquivo?: File) {
    if (!arquivo || processando || importando) return
    if (arquivo.size > 15 * 1024 * 1024) { setErro('Envie um PDF de até 15 MB.'); return }
    setErro(''); setProcessando(true)
    try {
      let requestKey: string = crypto.randomUUID()
      try { const key = `studia:importKey:${usuario?.id}`; requestKey = sessionStorage.getItem(key) ?? requestKey; sessionStorage.setItem(key, requestKey) } catch { /* Retry remains available in Editais. */ }
      const id = retomarId ?? (await api<{id: string | number}>('/v1/editais', { method: 'POST', body: JSON.stringify({title: nome.trim() || arquivo.name.replace(/\.pdf$/i, '').slice(0, 180), source: 'pdf', request_key: requestKey}) })).id
      setRetomarId(String(id))
      try { sessionStorage.setItem(chaveImportacao, String(id)) } catch { /* The draft stays on the server. */ }
      const form = new FormData(); form.append('file', arquivo); form.append('background', '1')
      await api(`/v1/editais/${id}/importacao-cargo/preparar`, { method: 'POST', body: form })
      limparRascunho(); navigate(`/editais/${id}/cargo`)
    } catch (e) {
      guardarRetomada(); setErro(e instanceof Error ? e.message : 'Não foi possível importar o edital.')
    } finally { setProcessando(false) }
  }

  if (new URLSearchParams(location.search).get('manual') === '1') return <Navigate to="/editais/manual" replace />

  if (processando) {
    return <TelaLendoEdital />
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link to="/editais" className="text-sm text-brand-600">Voltar aos editais</Link>
      <div>
        <h1 className="text-xl font-semibold text-ink">{retomarId ? 'Retomar importação' : 'Enviar edital'}</h1>
        <p className="text-sm text-muted">
          Envie o PDF, escolha seu cargo e confira os conhecimentos gerais e específicos. Depois de enviar, você poderá usar a IA integrada ou copiar o prompt para outra IA.
        </p>
      </div>

      <Link to="/editais/manual" className="quiet-link">Prefiro cadastrar manualmente, sem PDF</Link>

      {retomarId && <p role="status" className="daily-hint">Você está retomando o mesmo edital, sem criar outro rascunho. Se a leitura ainda estiver em andamento, aguarde antes de tentar novamente. <button type="button" className="quiet-link" onClick={() => { limparRascunho(); setRetomarId(undefined); setNome(''); setRespostaIa('') }}>Começar outra importação</button></p>}
      <label className="flex flex-col gap-2 text-sm text-ink">
        Nome do edital
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={180} placeholder="Ex.: Concurso da universidade 2026" className="rounded-md border border-line bg-surface px-4 py-3 text-ink" />
        <span className="text-xs text-muted">Opcional. O nome identificado pela IA será preenchido após a importação e poderá ser editado na revisão.</span>
      </label>

      <details className="text-sm"><summary className="cursor-pointer py-3">Já tenho uma resposta JSON completa</summary><p className="mb-3 text-muted">Use esta opção para importar uma resposta já organizada. Para começar pelo cargo, envie o PDF abaixo.</p><button
        type="button"
        onClick={() => {
          setStatusCopia('idle')
          setMostrarImportacao(true)
        }}
        className="rounded-md border border-brand-600 bg-brand-600 px-4 py-3 text-sm font-medium text-on-brand transition-colors hover:bg-brand-500"
      >
        Usar minha IA: copiar prompt e importar resposta
      </button></details>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-surface px-6 py-12 text-center transition-colors hover:border-brand-400/60">
        <IconFile className="h-8 w-8" />
        <span className="font-medium text-ink">Enviar PDF e escolher meu cargo</span>
        <span className="text-xs text-muted">PDF de até 15 MB. Funciona com IA integrada ou com sua própria IA.</span>
        <input
          type="file"
          accept="application/pdf" disabled={processando || importando}
          aria-label="Escolher PDF de até 15 MB"
          className="mt-3 block max-w-full text-sm"
          onChange={(e) => {
            const arquivo = e.target.files?.[0]
            e.target.value = ''
            void handleProcessar(arquivo)
          }}
        />
      </label>



      {mostrarImportacao && (
        <Modal titulo="Importar resposta da IA" largura="lg" onFechar={() => { if (!importando) setMostrarImportacao(false) }} rodape={          <button
            type="submit" form="import-response-form"
            disabled={importando || respostaIa.trim() === ''}
            className="rounded-md bg-brand-600 px-4 py-3 text-sm font-medium text-on-brand transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importando ? 'Aguarde…' : previa ? 'Aplicar importação' : 'Conferir organização'}
          </button>}>
        <form
          id="import-response-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const resposta = respostaIa.trim()
            if (!resposta || importando) return
            setImportando(true)
            setErro('')
            const action = previa
              ? importarRespostaIa(resposta, nome.trim() || 'Meu edital', retomarId).then(id => { limparRascunho(); navigate(`/editais/${id}/revisar`) })
              : api<PreviaImportacao>('/v1/editais/prever-importacao', { method: 'POST', body: JSON.stringify({ response: resposta }) }).then(value => { setPrevia(value) })
            void action.catch(e => { guardarRetomada(); setErro(e instanceof Error ? e.message : 'Não foi possível validar a resposta.') }).finally(() => setImportando(false))
          }}
        >
          {!previa && <><div className="rounded-md border border-brand-400/20 bg-brand-500/10 p-4">
            <p className="text-sm text-ink">
              Anexe o edital à IA de sua escolha e envie este prompt. Ele já pede a divisão automática em unidades de estudo. Depois, cole a resposta aqui; você não precisa organizar cada assunto.
            </p>
            <button
              type="button"
              onClick={() => void copiarPrompt()}
              className="mt-3 w-full rounded-md border border-brand-400/40 px-4 py-2.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-500/15"
            >
              {statusCopia === 'copiado' ? 'Prompt copiado' : 'Copiar prompt'}
            </button>
            {statusCopia === 'erro' && (
              <p role="alert" className="mt-2 text-xs text-red-700">
                Não foi possível acessar a área de transferência. Verifique a permissão do navegador.
              </p>
            )}
            <details className="mt-3 text-sm"><summary className="cursor-pointer">Ver prompt para copiar manualmente</summary><textarea aria-label="Prompt de importação" readOnly value={EDITAL_ANALYSIS_PROMPT} rows={8} className="mt-2 w-full min-w-0 rounded-md border border-line bg-soft p-3 text-sm" /></details>
          </div>
          <div>
            <label htmlFor="resposta-ia" className="text-sm font-medium text-ink">
              Resposta JSON da IA
            </label>
            <p className="mt-1 text-xs text-muted">
              Cole o objeto completo com options, groups e os indicadores de cobertura. Blocos iniciados com ```json também são aceitos.
            </p>
          </div>
          <textarea
            id="resposta-ia"
            value={respostaIa}
            onChange={(e) => { setRespostaIa(e.target.value); setPrevia(null) }}
            rows={12}
            required
            spellCheck={false}
            placeholder="Cole aqui o objeto JSON completo retornado pelo ChatGPT"
            className="resize-y rounded-md border border-line bg-soft px-4 py-3 font-mono text-xs text-ink placeholder:text-slate-600 focus:border-brand-400/60 focus:outline-none"
          />
          </>}
          {previa && <><PreviaUnidades previa={previa} /><button type="button" disabled={importando} className="quiet-link" onClick={() => setPrevia(null)}>Editar resposta</button></>}

          {erro && (
            <p role="alert" className="rounded-md border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-700">
              {erro}
            </p>
          )}
        </form>
        </Modal>
      )}

      {erro && !mostrarImportacao && (
        <p role="alert" className="rounded-md border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}


    </div>
  )
}
