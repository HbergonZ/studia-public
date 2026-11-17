import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { useEstudo } from '../context/EstudoContext'
import { EDITAL_ANALYSIS_PROMPT } from '../lib/editalPrompt'

function TelaLendoEdital() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-navy-950">
      <div className="relative h-[210px] w-[208px]">
        <div className="absolute left-0 top-3.5 flex h-[168px] w-[132px] flex-col gap-2.5 overflow-hidden rounded-[14px] border border-white/10 bg-navy-850 p-4 shadow-[0_20px_50px_rgba(108,76,232,0.18)]">
          <div
            className="animate-linha-revelar h-1.5 w-[70%] rounded bg-white/10"
            style={{ animationDelay: '0s', ['--linha-cor' as string]: 'var(--color-brand-400)' }}
          />
          <div
            className="animate-linha-revelar h-1.5 w-[90%] rounded bg-white/10"
            style={{ animationDelay: '0.3s', ['--linha-cor' as string]: 'var(--color-brand-400)' }}
          />
          <div
            className="animate-linha-revelar h-1.5 w-[55%] rounded bg-white/10"
            style={{ animationDelay: '0.6s', ['--linha-cor' as string]: 'var(--color-chart-questoes)' }}
          />
          <div className="h-1.5" />
          <div
            className="animate-linha-revelar h-1.5 w-[85%] rounded bg-white/10"
            style={{ animationDelay: '0.9s', ['--linha-cor' as string]: 'var(--color-chart-questoes)' }}
          />
          <div
            className="animate-linha-revelar h-1.5 w-[65%] rounded bg-white/10"
            style={{ animationDelay: '1.2s', ['--linha-cor' as string]: 'var(--color-chart-desempenho)' }}
          />
          <div className="h-1.5" />
          <div
            className="animate-linha-revelar h-1.5 w-[75%] rounded bg-white/10"
            style={{ animationDelay: '1.5s', ['--linha-cor' as string]: 'var(--color-chart-desempenho)' }}
          />
          <div
            className="animate-linha-revelar h-1.5 w-[45%] rounded bg-white/10"
            style={{ animationDelay: '1.8s', ['--linha-cor' as string]: '#34d399' }}
          />

          <div
            className="animate-brilho-descer absolute left-2 right-2 top-3.5 h-[3px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--color-brand-400), transparent)',
              boxShadow: '0 0 14px 2px rgba(156,136,249,0.7)',
            }}
          />
        </div>

        <svg width="150" height="140" viewBox="0 0 150 140" className="absolute right-2 top-2.5 z-10">
          <g className="animate-bichinho-balancar">
            <ellipse cx="90" cy="86" rx="34" ry="27" fill="var(--color-brand-500)" />
            <circle cx="65" cy="59" r="10" fill="var(--color-brand-500)" />
            <circle cx="115" cy="59" r="10" fill="var(--color-brand-500)" />
            <circle cx="65" cy="59" r="5" fill="var(--color-brand-600)" />
            <circle cx="115" cy="59" r="5" fill="var(--color-brand-600)" />
            <circle cx="73" cy="92" r="4.5" fill="var(--color-brand-300)" opacity="0.5" />
            <circle cx="107" cy="92" r="4.5" fill="var(--color-brand-300)" opacity="0.5" />
            <rect x="65" y="76" width="50" height="16" rx="2.5" fill="#0f1428" stroke="var(--color-brand-300)" strokeWidth="1.5" />
            <line x1="90" y1="76" x2="90" y2="92" stroke="var(--color-brand-300)" strokeWidth="1.2" />
            <path d="M79 82 q4 -3 8 0" stroke="#0f1428" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M96 82 q4 -3 8 0" stroke="#0f1428" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M83 98 q7 4 14 0" stroke="#0f1428" strokeWidth="2" fill="none" strokeLinecap="round" />
            <ellipse cx="42" cy="88" rx="11" ry="9" fill="var(--color-brand-500)" />
          </g>
        </svg>

        <div className="animate-lupa-descer absolute left-[96px] top-0.5 h-[42px] w-[42px]">
          <svg width="42" height="42" viewBox="0 0 46 46" fill="none">
            <circle cx="19" cy="19" r="13" fill="rgba(19,25,51,0.6)" stroke="var(--color-brand-400)" strokeWidth="3" />
            <line x1="28.5" y1="28.5" x2="40" y2="40" stroke="var(--color-brand-400)" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="font-display text-xl font-semibold text-white">Lendo seu edital…</p>
        <p className="mt-1 max-w-[320px] text-sm text-slate-400">Separando as matérias e os tópicos pra você.</p>
        <p className="mt-3 max-w-[320px] text-xs text-slate-500">A análise pode levar alguns minutos. Tentaremos outra IA gratuita se a resposta não passar pela validação.</p>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="animate-pontos-loop h-1.5 w-1.5 rounded-full bg-brand-400" style={{ animationDelay: '0s' }} />
        <span className="animate-pontos-loop h-1.5 w-1.5 rounded-full bg-brand-400" style={{ animationDelay: '0.2s' }} />
        <span className="animate-pontos-loop h-1.5 w-1.5 rounded-full bg-brand-400" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}

export default function UploadEdital() {
  const { iniciarProcessamento, importarRespostaIa, iniciarCadastroManual } = useEstudo()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)
  const navigate = useNavigate()
  const [mostrarImportacao, setMostrarImportacao] = useState(false)
  const [respostaIa, setRespostaIa] = useState('')
  const [importando, setImportando] = useState(false)
  const [statusCopia, setStatusCopia] = useState<'idle' | 'copiado' | 'erro'>('idle')

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
    setErro(''); setProcessando(true)
    try {
      const id = await iniciarProcessamento(arquivo, nome.trim() || arquivo.name.replace(/\.pdf$/i, '').slice(0, 180))
      navigate(`/editais/${id}/revisar`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível importar o edital.')
    } finally { setProcessando(false) }
  }

  if (processando) {
    return <TelaLendoEdital />
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link to="/editais" className="text-sm text-brand-300">Voltar aos editais</Link>
      <div>
        <h1 className="text-xl font-semibold text-white">Enviar edital</h1>
        <p className="text-sm text-slate-400">
          Envie um PDF com texto selecionável para que a IA identifique as matérias e os tópicos.
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm text-slate-300">
        Nome do edital
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={180} placeholder="Ex.: Concurso da universidade 2026" className="rounded-xl border border-white/10 bg-navy-900 px-4 py-3 text-white" />
        <span className="text-xs text-slate-500">Opcional. O nome identificado pela IA será preenchido após a importação e poderá ser editado na revisão.</span>
      </label>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-navy-900 px-6 py-12 text-center transition-colors hover:border-brand-400/60">
        <span className="text-3xl">📄</span>
        <span className="font-medium text-slate-200">Clique para escolher um PDF</span>
        <span className="text-xs text-slate-500">ou arraste o arquivo aqui</span>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0]
            e.target.value = ''
            void handleProcessar(arquivo)
          }}
        />
      </label>

      <button
        type="button"
        onClick={() => {
          setStatusCopia('idle')
          setMostrarImportacao(true)
        }}
        className="rounded-xl border border-brand-400/30 bg-brand-500/10 px-4 py-3 text-sm font-medium text-brand-200 transition-colors hover:bg-brand-500/15"
      >
        Colar resposta do ChatGPT
      </button>

      {mostrarImportacao && (
        <Modal titulo="Importar resposta do ChatGPT" largura="lg" onFechar={() => setMostrarImportacao(false)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const resposta = respostaIa.trim()
            if (!resposta || importando) return
            setImportando(true)
            setErro('')
            void importarRespostaIa(resposta, nome.trim() || 'Meu edital')
              .then((id) => navigate(`/editais/${id}/revisar`))
              .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível importar a resposta.'))
              .finally(() => setImportando(false))
          }}
        >
          <div className="rounded-xl border border-brand-400/20 bg-brand-500/10 p-4">
            <p className="text-sm text-slate-300">
              Anexe o edital ao ChatGPT e envie o prompt abaixo. Depois, cole nesta janela o JSON recebido.
            </p>
            <button
              type="button"
              onClick={() => void copiarPrompt()}
              className="mt-3 w-full rounded-xl border border-brand-400/40 px-4 py-2.5 text-sm font-medium text-brand-200 transition-colors hover:bg-brand-500/15"
            >
              {statusCopia === 'copiado' ? 'Prompt copiado' : 'Copiar prompt'}
            </button>
            {statusCopia === 'erro' && (
              <p role="alert" className="mt-2 text-xs text-red-300">
                Não foi possível acessar a área de transferência. Verifique a permissão do navegador.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="resposta-ia" className="text-sm font-medium text-slate-200">
              Resposta JSON da IA
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Cole o objeto completo com options, groups e os indicadores de cobertura. Blocos iniciados com ```json também são aceitos.
            </p>
          </div>
          <textarea
            id="resposta-ia"
            value={respostaIa}
            onChange={(e) => setRespostaIa(e.target.value)}
            rows={12}
            required
            spellCheck={false}
            placeholder="Cole aqui o objeto JSON completo retornado pelo ChatGPT"
            className="resize-y rounded-xl border border-white/10 bg-navy-850 px-4 py-3 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-brand-400/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={importando || respostaIa.trim() === ''}
            className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importando ? 'Validando e importando…' : 'Importar e revisar'}
          </button>
          {erro && (
            <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {erro}
            </p>
          )}
        </form>
        </Modal>
      )}

      {erro && !mostrarImportacao && (
        <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {erro}
        </p>
      )}

      <button
        type="button"
        disabled={importando}
        onClick={() => {
          setErro(''); setImportando(true)
          void iniciarCadastroManual(nome.trim() || 'Meu plano de estudos')
            .then((id) => navigate(`/editais/${id}/revisar`))
            .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível criar o edital.'))
            .finally(() => setImportando(false))
        }}
        className="text-sm text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-300"
      >
        Prefiro cadastrar matérias manualmente
      </button>
    </div>
  )
}
