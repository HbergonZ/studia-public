import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { normalizarBusca } from '../lib/busca'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import Carregamento from '../components/Carregamento'

interface Cargo { ref: string; code: string | null; name: string; level: string | null; evidence: string; page: number; general_expected: boolean; specific_expected: boolean }
interface Trecho { name: string; knowledge_type: 'general' | 'specific'; source: string; evidence: string; page_start: number; page_end: number }
interface Pendencia { id: string; source: string; context: string; page_start: number; page_end: number }
interface Importacao { revision: number; status: string; busy: boolean; aiAvailable: boolean; selected_ref: string | null; error: string | null; inventory: { title: string; has_study_syllabus: boolean; options: Cargo[]; syllabus_pages: number[]; warnings: string[] } | null; content: { sections: Trecho[]; warnings: string[] } | null; coverage?: {status: string; pending: Pendencia[]; decisions: {gap_id: string; reason: string}[]; limitation: string}; reading?: {text_pages?: number; pages_to_check?: number[]; warning?: string | null; total_pages?: number; completed_pages?: number; pages?: {page: number; method: string; needs_review: boolean}[]}; document?: {needs_confirmation: boolean; titles_only: boolean; supplement: boolean; message: string | null; program_headers: {line: number; page: number; title: string}[]} | null; document_confirmed?: boolean; units_summary?: {subjects: number; sources: number; units: number} | null }

export default function ImportarCargo() {
  const { id } = useParams(); const navigate = useNavigate(); const { usuario } = useAuth()
  const [dados, setDados] = useState<Importacao | null>(null), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false)
  const [busca, setBusca] = useState(''), [limite, setLimite] = useState(30), [trocando, setTrocando] = useState(false), [conferido, setConferido] = useState(false)
  const [manual, setManual] = useState(false), [prompt, setPrompt] = useState(''), [resposta, setResposta] = useState(''), [copia, setCopia] = useState('')
  const [decisao, setDecisao] = useState<Pendencia | null>(null), [motivo, setMotivo] = useState('')
  const endpoint = `/v1/editais/${id}/importacao-cargo`
  const carregar = useCallback(async () => {
    const value = await api<Importacao>(endpoint)
    if (value.status === 'applied') { navigate(`/editais/${id}/revisar`, { replace: true }); return }
    setDados(value)
  }, [endpoint, id, navigate])
  useEffect(() => { let ativo = true; void carregar().catch(e => { if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível abrir a importação.') }); return () => { ativo = false } }, [carregar])
  useEffect(() => {
    if (!dados?.busy) return
    const timer = setInterval(() => { void carregar().catch(e => setErro(e instanceof Error ? e.message : 'Não foi possível consultar a análise.')) }, 5000)
    return () => clearInterval(timer)
  }, [dados?.busy, carregar])
  const pendentes = dados?.coverage?.pending ?? []
  const stage = dados?.selected_ref && !trocando ? pendentes.length ? 'repair' : 'content' : 'inventory'
  const chaveResposta = `studia:cargo:${usuario?.id}:${id}:${stage}`
  const busy = ocupado || !!dados?.busy
  const cargo = dados?.inventory?.options.find(o => o.ref === dados.selected_ref)
  async function executar(action: string, extra: Record<string, unknown> = {}) {
    if (!dados || (busy && action !== 'cancelar')) return
    setOcupado(true); setErro(''); setDados({...dados, error: null})
    try {
      const value = await api<Importacao>(`${endpoint}/${action}`, { method: 'POST', body: JSON.stringify({ revision: dados.revision, ...extra }) })
      if (action === 'aplicar') { navigate(`/editais/${id}/revisar`); return }
      setDados(value); setConferido(false)
      if (action === 'selecionar') setTrocando(false)
      if (action === 'resolver') { setDecisao(null); setMotivo('') }
      if (action === 'inventory' || action === 'content' || action === 'repair') { setManual(false); setResposta(''); try { sessionStorage.removeItem(chaveResposta) } catch { /* Server progress is saved. */ } }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir esta etapa.')
      await carregar().catch(() => {})
    } finally { setOcupado(false) }
  }
  async function abrirManual() {
    if (busy) return
    setOcupado(true); setErro(''); setCopia('')
    try {
      const value = await api<{ revision: number; prompt: string }>(`${endpoint}/prompt?stage=${stage}`)
      if (value.revision !== dados?.revision) { await carregar(); throw new Error('A etapa mudou. Abra novamente o prompt atualizado.') }
      setPrompt(value.prompt); try { setResposta(sessionStorage.getItem(chaveResposta) ?? '') } catch { setResposta('') }
      setManual(true)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível preparar o prompt.') }
    finally { setOcupado(false) }
  }
  async function copiarPrompt() {
    try { await navigator.clipboard.writeText(prompt); setCopia('Prompt copiado.') }
    catch { setCopia('Não foi possível copiar. Abra o prompt abaixo e copie manualmente.') }
  }
  if (!dados) return <section className="job-import"><h1>Importar por cargo</h1>{erro ? <><p role="alert">{erro}</p><button className="daily-button" onClick={() => { setErro(''); void carregar().catch(e => setErro(e instanceof Error ? e.message : 'Tente novamente.')) }}>Tentar novamente</button><Link to="/editais/novo">Enviar PDF</Link></> : <Carregamento rotulo="Abrindo importação" />}</section>
  const options = dados.inventory?.options.filter(o => normalizarBusca(`${o.code ?? ''} ${o.name} ${o.level ?? ''}`).includes(normalizarBusca(busca))) ?? []
  const passo = !dados.inventory ? 1 : !cargo || trocando ? 2 : 3
  return <div className="job-import">
    <Link to="/editais" className="quiet-link">Voltar aos editais</Link>
    <header><h1>{dados.inventory?.title ?? 'Importar por cargo'}</h1><p>Escolha seu cargo antes de organizar os assuntos. O conteúdo geral aplicável também entra no seu plano.</p></header>
    <ol className="job-import-steps" aria-label="Etapas da importação"><li aria-current={passo === 1 ? 'step' : undefined}>Identificar cargos</li><li aria-current={passo === 2 ? 'step' : undefined}>Escolher cargo</li><li aria-current={passo === 3 ? 'step' : undefined}>Conferir conteúdo</li></ol>
    {(erro || dados.error) && <p role="alert" className="daily-error">{erro || dados.error}</p>}
    {dados.reading?.warning && <p className="daily-hint">{dados.reading.warning} Páginas para conferir: {dados.reading.pages_to_check?.join(', ')}.</p>}
    {dados.error && !busy && <p className="daily-hint">Seu progresso foi mantido. Você pode tentar esta etapa novamente ou voltar mais tarde pela lista de editais.</p>}
    {dados.status === 'repair_processing' && <p role="status" className="daily-hint">Conferindo somente os trechos pendentes. Os blocos já encontrados serão preservados.</p>}
    {busy && dados.status !== 'repair_processing' && dados.status !== 'reading_processing' && <p role="status" className="daily-hint">{dados.status === 'inventory_processing' || !dados.inventory ? 'Identificando os cargos do edital…' : 'Localizando o conteúdo do cargo…'} Seu progresso fica salvo; se a conexão cair, retome este edital pela lista.</p>}
    {!dados.document && <section className="job-import-panel"><h2>{busy ? 'Lendo as páginas do PDF' : 'Retomar leitura do PDF'}</h2><p>O arquivo fica salvo. Páginas digitalizadas passam por reconhecimento de texto. Você pode sair desta página e retomar pela lista de editais.</p>{dados.reading?.total_pages && <p role="status">{dados.reading.completed_pages ?? 0} de {dados.reading.total_pages} páginas processadas.</p>}{!busy && <button className="daily-button daily-button-primary" disabled={ocupado} onClick={() => void executar('ler')}>Retomar leitura</button>}{!busy && <Link className="quiet-link" to="/editais/novo">Enviar uma cópia mais nítida ou completa</Link>}</section>}
    {busy && <button className="daily-button" disabled={ocupado} onClick={() => void executar('cancelar')}>Cancelar processamento</button>}
    {dados.document?.needs_confirmation && !dados.document_confirmed && <section className="job-import-panel"><h2>Confira se o documento está completo</h2><p>{dados.document.message}</p><p>A confirmação não substitui a leitura do edital original. Não confirme se o programa está em outro arquivo que ainda falta.</p><button className="daily-button" disabled={busy} onClick={() => void executar('confirmar-documento', {confirmed: true})}>Conferi que o programa completo está neste PDF</button><Link className="quiet-link" to="/editais/novo">Enviar outro PDF com edital e anexos</Link></section>}
    {dados.reading?.pages && <details><summary>Conferir leitura das {dados.reading.total_pages} páginas</summary><ul className="job-import-options">{dados.reading.pages.map(p => <li key={p.page}>Página {p.page}: {p.method === 'ocr' ? 'texto reconhecido da imagem, confira o original' : 'texto do PDF'}{p.needs_review && p.method !== 'ocr' ? ', pouco texto legível' : ''}.</li>)}</ul></details>}
    {dados.document && dados.document.program_headers.length > 0 && <details><summary>Seções do programa encontradas no PDF</summary><ul className="job-import-options">{dados.document.program_headers.map(h => <li key={h.line}>{h.title} · p. {h.page}</li>)}</ul></details>}
    {dados.inventory?.warnings.map((w, i) => <p key={i} className="daily-hint">{w}</p>)}
    {!dados.inventory && dados.document && <section className="job-import-panel"><h2>Primeiro, vamos identificar os cargos</h2><p>Nesta etapa, a IA procura nomes, códigos, escolaridade e as páginas do programa. Os assuntos serão organizados depois da sua escolha.</p><div className="job-import-actions">{dados.aiAvailable && <button className="daily-button daily-button-primary" disabled={busy} onClick={() => void executar('inventory')}>Identificar cargos com IA</button>}<button className="daily-button" disabled={busy} onClick={() => void abrirManual()}>Usar minha IA para identificar cargos</button></div></section>}
    {dados.inventory && !dados.inventory.has_study_syllabus && <section className="job-import-panel"><h2>Não foi identificado programa de prova de conhecimentos</h2><p>Confira o edital original. Uma seleção por títulos ou experiência não gera matérias de estudo.</p><div className="job-import-actions">{dados.aiAvailable && <button className="daily-button" disabled={busy} onClick={() => void executar('inventory')}>Analisar novamente</button>}<button className="daily-button" disabled={busy} onClick={() => void abrirManual()}>Conferir com minha IA</button></div></section>}
    {dados.inventory?.has_study_syllabus && (!cargo || trocando) && <section className="job-import-panel"><h2>Qual cargo você vai estudar?</h2><label htmlFor="buscar-cargo">Buscar por nome, código ou escolaridade<input id="buscar-cargo" type="search" value={busca} onChange={e => { setBusca(e.target.value); setLimite(30) }} placeholder="Ex.: Enfermeiro ou 725" /></label><p role="status">{options.length} {options.length === 1 ? 'opção encontrada' : 'opções encontradas'}</p><ul className="job-import-options">{options.slice(0, limite).map(option => <li key={option.ref}><button type="button" disabled={busy} onClick={() => { if (dados.content && option.ref !== dados.selected_ref && !window.confirm('Trocar o cargo descarta apenas os trechos desta prévia. Continuar?')) return; void executar('selecionar', {option_ref: option.ref}) }}><strong>{option.name}</strong><span>{option.code ? `Código ${option.code} · ` : ''}{option.level ?? 'Confira a escolaridade no edital'} · p. {option.page}</span></button><details><summary>Conferir identificação no PDF</summary><pre>{option.evidence}</pre></details></li>)}</ul>{!options.length && <p>Nenhum cargo encontrado. Tente outra palavra. Se faltar um cargo, confira o inventário com sua IA.</p>}{options.length > limite && <button className="daily-button" onClick={() => setLimite(v => v + 30)}>Mostrar mais cargos</button>}<div className="job-import-actions"><button className="daily-button" disabled={busy} onClick={() => void abrirManual()}>Revisar inventário com minha IA</button>{cargo && <button className="daily-button" onClick={() => setTrocando(false)}>Manter cargo escolhido</button>}</div></section>}
    {cargo && !trocando && <section className="job-import-panel"><h2>{cargo.name}</h2><p>{cargo.code ? `Código ${cargo.code} · ` : ''}{cargo.level}</p><button className="quiet-link" disabled={busy} onClick={() => setTrocando(true)}>Escolher outro cargo</button>
      {!dados.content && <><p>Agora vamos localizar os conhecimentos gerais e específicos deste cargo. Os trechos serão copiados do PDF, com referência às páginas, para você conferir.</p><div className="job-import-actions">{dados.aiAvailable && <button className="daily-button daily-button-primary" disabled={busy} onClick={() => void executar('content')}>Localizar conteúdo deste cargo</button>}<button className="daily-button" disabled={busy} onClick={() => void abrirManual()}>Copiar prompt para este cargo</button></div></>}
    </section>}
    {cargo && !trocando && pendentes.length > 0 && <section className="job-import-panel job-import-pending" aria-label="Trechos pendentes">
      <h2>Precisamos conferir {pendentes.length === 1 ? 'um trecho' : `${pendentes.length} trechos`}</h2>
      <p>Encontramos conteúdo próximo às matérias que ficou fora da extração. A importação aguarda essa conferência. Os blocos já encontrados continuam salvos.</p>
      {pendentes.map(gap => <details key={gap.id}><summary>Trecho para conferir · p. {gap.page_start}{gap.page_end !== gap.page_start ? ` a ${gap.page_end}` : ''}</summary><pre>{gap.context}</pre><button className="daily-button" disabled={busy} onClick={() => { setDecisao(gap); setMotivo(''); setErro('') }}>Este trecho não pertence ao meu cargo</button></details>)}
      <div className="job-import-actions">{dados.aiAvailable && <button className="daily-button daily-button-primary" disabled={busy} onClick={() => void executar('repair')}>Corrigir trechos pendentes</button>}<button className="daily-button" disabled={busy} onClick={() => void abrirManual()}>Conferir pendências com minha IA</button></div>
    </section>}
    {dados.coverage && dados.content && !trocando && pendentes.length === 0 && <p role="status" className="daily-hint">Pronto para sua conferência. Nenhuma lacuna foi detectada perto dos blocos encontrados. {dados.coverage.limitation}</p>}
    {dados.coverage && dados.coverage.decisions.length > 0 && !trocando && <details><summary>Decisões de conferência registradas ({dados.coverage.decisions.length})</summary><ul>{dados.coverage.decisions.map(d => <li key={d.gap_id}>{d.reason} <button className="quiet-link" disabled={busy} onClick={() => void executar('resolver', {gap_id: d.gap_id, decision: 'reopen', confirmed: true})}>Reabrir conferência</button></li>)}</ul></details>}
    {cargo && !trocando && dados.content && <section className="job-import-panel"><h2>Confira o conteúdo antes de importar</h2><p>{dados.content.sections.length} blocos encontrados. Abra os trechos e compare com o PDF, incluindo os conhecimentos gerais da escolaridade e o final dos específicos. A localização por IA ainda exige essa conferência.</p>{dados.content.warnings.map((w, i) => <p key={i} className="daily-hint">{w}</p>)}<div className="job-import-sources">{dados.content.sections.map((section, i) => <details key={i}><summary>{section.name} · {section.knowledge_type === 'general' ? 'Geral' : 'Específico'} · p. {section.page_start}{section.page_end !== section.page_start ? ` a ${section.page_end}` : ''}</summary><pre>{section.source}</pre><p className="text-sm text-muted">Identificação usada para associar ao cargo:</p><pre>{section.evidence}</pre></details>)}</div><label className="job-import-confirm"><input type="checkbox" checked={conferido} disabled={busy} onChange={e => setConferido(e.target.checked)} />Conferi os trechos, os conteúdos gerais e os específicos do meu cargo no PDF.</label><div className="job-import-actions"><button className="daily-button daily-button-primary" disabled={busy || !conferido || pendentes.length > 0 || (!!dados.document?.needs_confirmation && !dados.document_confirmed)} onClick={() => void executar('aplicar', {confirmed: true})}>Importar conteúdo e continuar</button><button className="daily-button" disabled={busy} onClick={() => void abrirManual()}>Revisar com minha IA</button></div><p className="text-sm text-muted">{dados.units_summary ? `${dados.units_summary.units} unidades de estudo serão criadas com trechos do texto original. Depois da revisão, você definirá sua rotina.` : 'As unidades preservam o texto original e podem ser ajustadas em Organizar estudos.'}</p></section>}
    {decisao && <Modal titulo="Confirmar que o trecho não se aplica" largura="xl" onFechar={() => { if (!busy) setDecisao(null) }} rodape={<button form="coverage-decision" type="submit" className="daily-button daily-button-primary" disabled={busy || motivo.trim().length < 10}>Registrar minha decisão</button>}>
      <form id="coverage-decision" className="daily-edit-form" onSubmit={e => { e.preventDefault(); void executar('resolver', {gap_id: decisao.id, decision: 'not_applicable', reason: motivo, confirmed: true}) }}>
        <p>Confira o trecho no PDF e a regra que define os conteúdos do seu cargo. Ao registrar, você confirma que este conteúdo deve ficar fora do seu plano.</p>
        <pre className="job-import-decision-source">{decisao.source}</pre>
        <label htmlFor="coverage-reason">Por que este trecho não se aplica ao seu cargo?<textarea id="coverage-reason" minLength={10} maxLength={1000} required rows={4} value={motivo} onChange={e => setMotivo(e.target.value)} disabled={busy} /></label>
        {erro && <p role="alert" className="daily-error">{erro}</p>}
      </form>
    </Modal>}
    {manual && <Modal titulo={stage === 'inventory' ? 'Identificar cargos com minha IA' : stage === 'repair' ? 'Conferir trechos pendentes com minha IA' : `Conteúdo de ${cargo?.name ?? 'meu cargo'}`} largura="xl" onFechar={() => { if (!busy) setManual(false) }} rodape={<button form="job-import-response" type="submit" className="daily-button daily-button-primary" disabled={busy || !resposta.trim()}>Validar resposta e continuar</button>}><form id="job-import-response" className="daily-edit-form" onSubmit={e => { e.preventDefault(); void executar(stage, {response: resposta}) }}><p>Copie este prompt completo para sua IA. Ele já inclui o texto necessário e as referências do PDF. Depois, cole a resposta JSON abaixo.</p><button type="button" className="daily-button" onClick={() => void copiarPrompt()}>Copiar prompt completo</button>{copia && <p role="status">{copia}</p>}<details><summary>Ver o prompt para copiar manualmente</summary><textarea aria-label="Prompt completo para IA" readOnly value={prompt} rows={8} /></details><label htmlFor="job-import-json">Resposta JSON da IA<textarea id="job-import-json" rows={10} value={resposta} disabled={busy} onChange={e => { setResposta(e.target.value); try { sessionStorage.setItem(chaveResposta, e.target.value) } catch { /* Response stays in the open form. */ } }} /></label>{erro && <p role="alert" className="daily-error">{erro}</p>}</form></Modal>}
  </div>
}
