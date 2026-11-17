import Carregamento from '../components/Carregamento'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'
import { useEstudo } from '../context/EstudoContext'
import { api } from '../lib/api'

interface Edital {
  id: string | number
  title: string
  status: 'draft' | 'processing' | 'extracted' | 'confirmed' | 'failed' | 'inactive' | 'completed'
  source: string
  original_filename: string | null
  created_at: string
  confirmed_at: string | null
  extraction_error?: string | null
  job_import_pending?: boolean
}

const situacoes: Record<Edital['status'], string> = {
  draft: 'Rascunho', processing: 'Em processamento', extracted: 'Aguardando revisão',
  confirmed: 'Ativo', failed: 'Falha na importação', inactive: 'Inativo', completed: 'Finalizado',
}
const botao = 'rounded-lg border border-line px-3 py-2 text-sm text-ink transition-colors hover:bg-hover disabled:opacity-50'
type Acao = 'ativar' | 'desativar' | 'finalizar' | 'excluir' | 'renomear'
const rotulos: Record<Acao, string> = { ativar: 'Ativar', desativar: 'Desativar', finalizar: 'Finalizar', excluir: 'Excluir', renomear: 'Renomear' }

export default function Editais() {
  const { recarregar } = useEstudo()
  const [editais, setEditais] = useState<Edital[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmacao, setConfirmacao] = useState<{ edital: Edital; acao: Acao } | null>(null)
  const [nome, setNome] = useState('')
  const [sucesso, setSucesso] = useState('')

  const carregar = useCallback(async () => {
    const dados = await api<Edital[]>('/v1/editais')
    setEditais(dados)
  }, [])

  useEffect(() => {
    let cancelado = false
    void api<Edital[]>('/v1/editais').then((dados) => { if (!cancelado) setEditais(dados) })
      .catch((e) => { if (!cancelado) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os editais.') })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [])

  function abrir(edital: Edital, acao: Acao) {
    setErro(''); setSucesso(''); setNome(edital.title); setConfirmacao({ edital, acao })
  }

  async function executar() {
    if (!confirmacao || salvando) return
    const { edital, acao } = confirmacao
    setSalvando(true); setErro('')
    try {
      const caminho = `/v1/editais/${edital.id}`
      if (acao === 'excluir') await api(caminho, { method: 'DELETE' })
      else if (acao === 'renomear') await api(caminho, { method: 'PATCH', body: JSON.stringify({ title: nome.trim() }) })
      else await api(`${caminho}/${acao}`, { method: 'POST' })
      await carregar()
      await recarregar()
      setConfirmacao(null)
      setSucesso('Editais atualizados.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a ação.')
    } finally { setSalvando(false) }
  }

  const ativo = editais.find((edital) => edital.status === 'confirmed')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Editais</h1>
          <p className="mt-1 text-sm text-muted">Gerencie seus editais e escolha qual usar nos estudos.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row" role="group" aria-label="Cadastrar edital">
          <Link to="/editais/manual" className="daily-button">Cadastrar manualmente</Link>
          <Link to="/editais/novo" className="daily-button daily-button-primary">Importar edital</Link>
        </div>
      </header>

      {!carregando && (
        <div className="rounded-md border border-brand-400/20 bg-brand-500/10 p-4 text-sm text-ink">
          {ativo ? <>Edital ativo: <strong className="text-ink">{ativo.title}</strong>. O início e o cronograma usam este edital.</> : 'Nenhum edital ativo. Ative um edital abaixo ou importe um novo.'}
        </div>
      )}
      {sucesso && <p role="status" className="text-sm text-emerald-700">{sucesso}</p>}
      {erro && !confirmacao && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      {carregando ? <Carregamento rotulo="Carregando editais" /> : editais.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center text-muted">Você ainda não tem editais cadastrados.</div>
      ) : (
        <div className="max-h-[65dvh] overflow-y-auto rounded-lg border border-line bg-surface/40 p-4" role="region" aria-label="Lista de editais" tabIndex={0}>
          <div className="grid gap-4 md:grid-cols-2">
          {editais.map((edital) => (
            <article key={edital.id} className={`flex flex-col gap-4 rounded-lg border bg-surface p-5 ${edital.status === 'confirmed' ? 'border-brand-400/50' : 'border-line'}`}>
              <div>
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${edital.status === 'confirmed' ? 'bg-brand-600 text-on-brand' : edital.status === 'completed' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-hover text-muted'}`}>{situacoes[edital.status]}</span>
                <h2 className="mt-3 break-words text-lg font-semibold text-ink">{edital.title}</h2>
                <p className="mt-1 text-xs text-muted">Importado em {new Date(edital.created_at.replace(' ', 'T')).toLocaleDateString('pt-BR')}</p>
                {edital.extraction_error && <p className="daily-error">{edital.extraction_error}</p>}
                {edital.original_filename && <p className="mt-1 break-words text-xs text-muted">{edital.original_filename}</p>}
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                {['failed','draft','processing'].includes(edital.status) && edital.source !== 'manual' && <Link to={edital.job_import_pending ? `/editais/${edital.id}/cargo` : `/editais/novo?retomar=${edital.id}`} className={botao}>Retomar importação</Link>}
                {edital.source === 'manual' && edital.status === 'draft' && <Link to={`/editais/${edital.id}/manual`} className={botao}>Continuar cadastro</Link>}
                {edital.status !== 'processing' && <Link to={`/editais/${edital.id}/organizar`} className={botao}>Organizar estudos</Link>}
                {edital.status !== 'processing' && <Link to={`/editais/${edital.id}/revisar`} className={botao}>Revisar conteúdo</Link>}
                {edital.status !== 'confirmed' && edital.status !== 'processing' && <button className={botao} onClick={() => abrir(edital, 'ativar')}>{edital.status === 'completed' ? 'Reativar' : 'Ativar'}</button>}
                {edital.status === 'confirmed' && <button className={botao} onClick={() => abrir(edital, 'desativar')}>Desativar</button>}
                {edital.confirmed_at && ['confirmed', 'inactive'].includes(edital.status) && <button className={botao} onClick={() => abrir(edital, 'finalizar')}>Finalizar</button>}
                <button className={botao} onClick={() => abrir(edital, 'renomear')}>Renomear</button>
                {edital.status !== 'processing' && <button className={`${botao} text-red-700`} onClick={() => abrir(edital, 'excluir')}>Excluir</button>}
              </div>
            </article>
          ))}
          </div>
        </div>
      )}

      {confirmacao && (
        <Modal titulo={`${rotulos[confirmacao.acao]} edital`} onFechar={() => { if (!salvando) setConfirmacao(null) }} rodape={<>
              <button type="button" disabled={salvando} className={botao} onClick={() => setConfirmacao(null)}>Cancelar</button>
              <button type="submit" form="edital-action-form" disabled={salvando || (confirmacao.acao === 'renomear' && !nome.trim())} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-on-brand disabled:opacity-50">{salvando ? 'Salvando…' : rotulos[confirmacao.acao]}</button>
             </>}>
          <form id="edital-action-form" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void executar() }}>
            <p className="break-words font-medium text-ink">{confirmacao.edital.title}</p>
            {confirmacao.acao === 'renomear' ? (
              <label className="flex flex-col gap-2 text-sm text-ink">Nome do edital
                <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={180} className="rounded-lg border border-line bg-soft px-3 py-2 text-ink" />
              </label>
            ) : (
              <p className="text-sm text-muted">
                {confirmacao.acao === 'ativar' && 'Este será o edital usado nos estudos. O edital ativo atual ficará inativo, com o histórico preservado.'}
                {confirmacao.acao === 'desativar' && 'Este edital sairá do cronograma. Seu conteúdo e histórico serão preservados para reativação.'}
                {confirmacao.acao === 'finalizar' && 'O edital será marcado como finalizado e sairá do cronograma. Seu histórico será preservado e você poderá reativá-lo depois.'}
                {confirmacao.acao === 'excluir' && 'O edital sairá da sua lista e dos estudos. Não será possível recuperá-lo pela aplicação.'}
              </p>
            )}
            {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}

          </form>
        </Modal>
      )}
    </div>
  )
}
