import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { assuntosParaOrganizar, promptOrganizacao, type AssuntoOrigem, type OrganizacaoEdital, type UnidadeEstudo } from '../lib/studyUnits'
import { AssuntoUnidades } from '../components/PreviaUnidades'
import ConteudoOriginal from '../components/ConteudoOriginal'
import { useEstudo } from '../context/EstudoContext'
import { useCarregamentoPagina } from '../context/CarregamentoPaginaContext'

type Proposta = AssuntoOrigem & { units: UnidadeEstudo[] }

export default function OrganizarEstudos() {
  const { id } = useParams()
  const { recarregar } = useEstudo()
  const [dados, setDados] = useState<OrganizacaoEdital | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [resposta, setResposta] = useState('')
  const [previa, setPrevia] = useState<Proposta[] | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [sucesso, setSucesso] = useState('')
  useCarregamentoPagina(carregando)
  useEffect(() => {
    let ativo = true
    setCarregando(true)
    void api<OrganizacaoEdital>(`/v1/editais/${id}/organizacao`).then(value => {
      if (!ativo) return
      setDados(value)
      setSelecionados(new Set(assuntosParaOrganizar(value.topics).map(t => t.topic_id)))
    }).catch(e => { if (ativo) setErro(e.message) }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [id])

  async function validar() {
    if (!dados || ocupado) return
    setOcupado(true); setErro('')
    try {
      const result = await api<{ topics: Proposta[] }>(`/v1/editais/${id}/organizacao/prever`, { method: 'POST', body: JSON.stringify({ revision: dados.revision, response: resposta }) })
      setPrevia(result.topics)
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível validar a resposta.') }
    finally { setOcupado(false) }
  }

  async function aplicar() {
    if (!dados || !previa || ocupado) return
    setOcupado(true); setErro('')
    try {
      const result = await api<{ units: number }>(`/v1/editais/${id}/organizacao/aplicar`, { method: 'POST', body: JSON.stringify({ revision: dados.revision, response: resposta }) })
      setPrevia(null); setResposta(''); setCopiado(false)
      setSucesso(`${result.units} unidades criadas. O tempo, as questões e os planos anteriores foram preservados. As novas unidades começam com progresso próprio.`)
      const atualizado = await api<OrganizacaoEdital>(`/v1/editais/${id}/organizacao`)
      setDados(atualizado); setSelecionados(new Set(assuntosParaOrganizar(atualizado.topics).map(t => t.topic_id)))
      await recarregar()
      window.dispatchEvent(new Event('studia:study-saved'))
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível aplicar a organização.') }
    finally { setOcupado(false) }
  }

  if (carregando) return null
  if (!dados) return <p role="alert">{erro} <Link to="/editais">Voltar aos editais</Link></p>
  const selection = dados.topics.filter(t => selecionados.has(t.topic_id))
  const prompt = selection.length ? promptOrganizacao(dados, selection) : ''
  return <div className="organization-page"><Link to="/editais">Voltar aos editais</Link><header><h1>Organizar estudos</h1><p>{dados.notice.title}</p><p>Use a IA de sua escolha para dividir conteúdos extensos. O Studia organiza os dias e as revisões depois, sem consultar uma IA.</p></header>
    {sucesso && <p role="status" className="daily-success">{sucesso}</p>}
    {!previa ? <>{!assuntosParaOrganizar(dados.topics).length && <p role="status" className="daily-success">Os assuntos deste edital já estão organizados. Você pode começar a estudar ou usar a seleção opcional para refazer alguma divisão.</p>}<section className="organization-section"><h2>Copie o prompt pronto</h2><p>O sistema já selecionou os assuntos que ainda precisam de organização. Basta copiar o prompt e enviar à sua IA. Quando necessário, dividimos em lotes para a resposta não ser cortada; o próximo fica pronto após aplicar este.</p><details><summary>Escolher assuntos manualmente (opcional)</summary><div className="organization-topics">{dados.topics.map(topic => <div key={topic.topic_id}><label><input type="checkbox" checked={selecionados.has(topic.topic_id)} onChange={() => { setSelecionados(current => { const next = new Set(current); if (next.has(topic.topic_id)) next.delete(topic.topic_id); else next.add(topic.topic_id); return next }); setCopiado(false) }} /><span><strong>{topic.title}</strong><small>{topic.subject} · {topic.group}{topic.sessions > 0 ? ` · ${topic.sessions} registros anteriores` : ''}</small></span></label><ConteudoOriginal texto={topic.source} /></div>)}</div></details><p>{selection.length} assuntos neste prompt. Sessões antigas ficam na origem e não serão distribuídas entre as novas unidades.</p><button className="primary-link" disabled={!prompt} onClick={() => void navigator.clipboard.writeText(prompt).then(() => setCopiado(true)).catch(() => setErro('Não foi possível copiar. Abra o prompt abaixo e copie o texto.'))}>{copiado ? 'Prompt copiado' : 'Copiar prompt de organização'}</button>{prompt && <details><summary>Ver prompt para copiar manualmente</summary><textarea readOnly aria-label="Prompt de organização" value={prompt} rows={10} /></details>}</section>
      <section className="organization-section"><h2>Cole a resposta da IA</h2><p>Confira a prévia antes de aplicar. A validação verifica se os trechos reproduzem o original e se os assuntos pertencem a este edital.</p><label htmlFor="organization-response">Resposta JSON</label><textarea id="organization-response" value={resposta} onChange={event => setResposta(event.target.value)} rows={10} spellCheck={false} /><button className="primary-link" disabled={ocupado || !resposta.trim()} onClick={() => void validar()}>{ocupado ? 'Validando…' : 'Conferir organização'}</button></section></> : <section className="organization-section"><h2>Confira a organização sugerida</h2><p>{previa.length === 1 ? 'Um assunto será organizado' : `${previa.length} assuntos serão organizados`} em {previa.reduce((sum, topic) => sum + topic.units.length, 0)} unidades. Uma unidade pode ocupar várias sessões de estudo.</p>{previa.length !== selection.length && <p role="status">A resposta contém uma quantidade diferente da seleção atual. Somente os assuntos abaixo serão alterados; os demais serão preservados.</p>}{previa.map(topic => <AssuntoUnidades key={topic.topic_id} assunto={topic} />)}<p>O histórico permanece na origem. Planos já salvos continuam válidos; novos planos usam as unidades organizadas.</p><div className="organization-actions"><button className="quiet-link" disabled={ocupado} onClick={() => setPrevia(null)}>Editar resposta</button><button className="primary-link" disabled={ocupado} onClick={() => void aplicar()}>{ocupado ? 'Aplicando…' : 'Aplicar organização'}</button></div></section>}
    {erro && <p role="alert" className="text-red-700">{erro}</p>}
    {dados.originals.length > 0 && <section className="organization-section"><h2>Origens e histórico preservados</h2><p>Estas origens ficam fora das novas sugestões. Os registros anteriores continuam nos totais de tempo e questões.</p>{dados.originals.map(topic => <details key={topic.topic_id}><summary>{topic.title} ({topic.sessions} registros)</summary><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{topic.source}</p></details>)}</section>}
  </div>
}
