import { useEffect, useMemo, useRef, useState } from 'react'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import { lerData } from '../lib/datas'
import { normalizarBusca } from '../lib/busca'
import Modal from '../components/Modal'
import ConteudoOriginal from '../components/ConteudoOriginal'
import RegistrarSessaoModal from '../components/RegistrarSessaoModal'
import HistoricoSessoes from '../components/HistoricoSessoes'
import CorrigirSessaoModal from '../components/CorrigirSessaoModal'
import type { Materia, Sessao, Topico } from '../types'

type Filtro = 'todos' | 'pendentes' | 'concluidos' | 'andamento' | 'vencidas'
const data = (value?: string | null) => value ? lerData(value).toLocaleDateString('pt-BR') : 'Não agendada'

export default function VisaoGeral() {
  const { materias, sessoes, origens, hoje } = useEstudo()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [materiaId, setMateriaId] = useState('')
  const [pagina, setPagina] = useState(1)
  const lista = useRef<HTMLDivElement>(null)
  useEffect(() => { if (lista.current) lista.current.scrollTop = 0 }, [pagina, busca, filtro, materiaId])
  const [detalhe, setDetalhe] = useState<{materia: Materia; topico: Topico} | null>(null)
  const [registro, setRegistro] = useState<typeof detalhe>(null)
  const [correcao, setCorrecao] = useState<Sessao | null>(null)
  const sessoesPorTopico = useMemo(() => {
    const mapa = new Map<string, Sessao[]>()
    for (const sessao of sessoes) { const grupo = mapa.get(sessao.topicoId) ?? []; grupo.push(sessao); mapa.set(sessao.topicoId, grupo) }
    for (const grupo of mapa.values()) grupo.sort((a,b) => a.data.localeCompare(b.data) || Number(a.id) - Number(b.id))
    return mapa
  }, [sessoes])
  const linhas = useMemo(() => materias.flatMap(materia => materia.topicos.map(topico => ({ materia, topico }))), [materias])
  const filtradas = useMemo(() => linhas.filter(({materia, topico}) => {
    if (materiaId && materia.id !== materiaId) return false
    if (!normalizarBusca(`${materia.nome} ${topico.nome}`).includes(normalizarBusca(busca))) return false
    if (filtro === 'pendentes' && topico.ultimaRevisao) return false
    if (filtro === 'concluidos' && !topico.ultimaRevisao) return false
    if (filtro === 'andamento' && !topico.emAndamento) return false
    if (filtro === 'vencidas' && (!topico.proximaRevisao || topico.proximaRevisao.slice(0,10) >= hoje)) return false
    return true
  }), [linhas, busca, filtro, materiaId, hoje])
  const paginas = Math.max(1, Math.ceil(filtradas.length / 30))
  const atual = Math.min(pagina, paginas)
  const historico = detalhe ? sessoesPorTopico.get(detalhe.topico.id) ?? [] : []
  const origem = detalhe?.topico.origemId ? origens.find(o => o.id === detalhe.topico.origemId) : null
  const historicoOrigem = origem ? sessoesPorTopico.get(origem.id) ?? [] : []
  const materiasSelecionadas = new Set(materias.map(m => m.id))
  const fontesComHistorico = origens.filter(o => materiasSelecionadas.has(o.materiaId) && sessoesPorTopico.has(o.id))
  const corrigir = (s: Sessao) => { setDetalhe(null); setCorrecao(s) }
  return <div className="desk-dashboard">
    <header className="desk-page-heading"><div><h1>Tópicos</h1><p>{filtradas.length} de {linhas.length} unidades de estudo. Consulte o conteúdo, registre estudos e acompanhe seu histórico.</p></div></header>
    <div className="library-controls">
      <label className="flex flex-col gap-1 text-sm">Buscar matéria ou assunto<input type="search" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }} placeholder="Ex.: portugues ou anatomia" className="rounded-md border border-line bg-surface px-3 py-2" /></label>
      <label className="flex flex-col gap-1 text-sm">Matéria<select value={materiaId} onChange={e => { setMateriaId(e.target.value); setPagina(1) }}><option value="">Todas as matérias</option>{materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-sm">Situação<select value={filtro} onChange={e => { setFiltro(e.target.value as Filtro); setPagina(1) }}><option value="todos">Todos</option><option value="pendentes">Primeiro estudo pendente</option><option value="concluidos">Primeiro estudo concluído</option><option value="andamento">Em andamento</option><option value="vencidas">Revisões vencidas</option></select></label>
    </div>
    <section className="rounded-lg bg-surface p-5"><h2 className="mb-4 text-lg font-semibold">Unidades encontradas ({filtradas.length})</h2>
      <div ref={lista} className="library-list" tabIndex={0} role="region" aria-label="Lista de unidades de estudo">
        {!filtradas.length && <p className="daily-empty">Nenhum tópico encontrado. Tente outro termo ou altere os filtros.</p>}
        <ul className="divide-y divide-line">{filtradas.slice((atual-1)*30, atual*30).map(({materia,topico}) => {
          const total = topico.questoes.acertos + topico.questoes.erros
          return <li key={topico.id} className="py-5"><p className={`text-sm ${SUBJECT_STYLES[materia.cor].text}`}>{materia.nome}</p><h3 className="mt-1 font-semibold [overflow-wrap:anywhere]">{topico.nome}</h3>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"><span>Dificuldade: {topico.dificuldade}/10</span><span>{topico.emAndamento ? 'Em andamento' : topico.ultimaRevisao ? 'Primeiro estudo concluído' : 'Primeiro estudo pendente'}</span><span>{total ? `${Math.round(topico.questoes.acertos / total * 100)}% em ${total} questões` : 'Sem questões registradas'}</span></div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span>Primeira conclusão: {topico.primeiraRevisao ? data(topico.primeiraRevisao) : 'Pendente'}</span><span>Última revisão: {topico.ultimaRevisao ? data(topico.ultimaRevisao) : 'Ainda não realizada'}</span><span>Próxima revisão: {data(topico.proximaRevisao)}</span></div>
            <div className="mt-3 flex flex-wrap gap-3"><button type="button" className="daily-button" onClick={() => setDetalhe({materia,topico})}>Ver detalhes</button><button type="button" className="daily-button daily-button-primary" onClick={() => setRegistro({materia,topico})}>{topico.ultimaRevisao ? 'Registrar novo estudo' : 'Registrar estudo'}</button></div>
          </li>
        })}</ul>
      </div>
      <div className="library-pagination mt-4"><button disabled={atual === 1} onClick={() => setPagina(p => p-1)}>Anterior</button><p role="status">Página {atual} de {paginas} · até 30 unidades por página</p><button disabled={atual === paginas} onClick={() => setPagina(p => p+1)}>Próxima</button></div>
    </section>
    {fontesComHistorico.length > 0 && <details className="rounded-lg bg-surface p-5"><summary>Histórico anterior à organização ({fontesComHistorico.length} assuntos)</summary><p className="mt-3 text-sm text-muted">Os registros continuam na origem. Não foram repartidos entre as novas unidades.</p><div className="mt-4 max-h-96 overflow-y-auto" tabIndex={0}>{fontesComHistorico.map(o => <details key={o.id} className="py-3"><summary>{o.nome}</summary><HistoricoSessoes sessoes={sessoes.filter(s => s.topicoId === o.id)} onCorrigir={corrigir} /></details>)}</div></details>}
    {detalhe && <Modal titulo={detalhe.topico.nome} largura="lg" onFechar={() => setDetalhe(null)} rodape={<button className="daily-button daily-button-primary" onClick={() => { setRegistro(detalhe); setDetalhe(null) }}>Registrar novo estudo</button>}>
      <p className="mb-3 text-sm text-muted">{detalhe.materia.nome}</p><ConteudoOriginal texto={detalhe.topico.textoOriginal} />
      <h3 className="mt-5 font-semibold">Histórico desta unidade ({historico.length})</h3><p className="mt-2 text-sm text-muted">O primeiro registro pode ser uma continuação. A primeira conclusão do assunto é {detalhe.topico.primeiraRevisao ? data(detalhe.topico.primeiraRevisao) : 'ainda pendente'}.</p><HistoricoSessoes sessoes={historico} onCorrigir={corrigir} />
      {origem && <details className="mt-5"><summary>Assunto de origem: {origem.nome}</summary><ConteudoOriginal texto={origem.textoOriginal} /><HistoricoSessoes sessoes={historicoOrigem} onCorrigir={corrigir} /></details>}
    </Modal>}
    {registro && <RegistrarSessaoModal materiaId={registro.materia.id} materiaNome={registro.materia.nome} topicoId={registro.topico.id} topicoNome={registro.topico.nome} textoOriginal={registro.topico.textoOriginal} dificuldadeAtual={registro.topico.dificuldade} concluirInicial={!!registro.topico.ultimaRevisao && !registro.topico.emAndamento} onFechar={() => setRegistro(null)} />}
    {correcao && <CorrigirSessaoModal sessao={correcao} onFechar={() => setCorrecao(null)} />}
  </div>
}
