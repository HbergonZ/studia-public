import { normalizarBusca } from '../lib/busca'
import { IconArrowUp } from './icons'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BlocoPlano } from '../types'
import type { usePlanoDia } from '../lib/usePlanoDia'
import { lerData } from '../lib/datas'
import Carregamento from './Carregamento'
import Modal from './Modal'

type Props = { estado: ReturnType<typeof usePlanoDia>; selecionado?: string; onSelecionar?: (bloco: BlocoPlano) => void; bloqueado?: boolean; fixo?: boolean }

export default function PlanoDiario({ estado, selecionado, onSelecionar, bloqueado = false, fixo = false }: Props) {
  const { plano, carregando, salvando: enviando, atualizando, erro, recarregar, salvar } = estado
  const salvando = enviando || atualizando
  const [editando, setEditando] = useState<BlocoPlano | null>(null)
  const [topicId, setTopicId] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [formError, setFormError] = useState('')
  const [busca, setBusca] = useState('')
  const [trocandoAssunto, setTrocandoAssunto] = useState(false)
  const [limiteResultados, setLimiteResultados] = useState(30)
  const trocarAssunto = useRef<HTMLButtonElement>(null)
  const classe = `daily-plan${fixo ? ' daily-plan-fixed' : ''}`
  if (carregando) return <section className={classe} aria-label="Plano do dia" aria-busy="true"><Carregamento rotulo="Organizando o plano de estudo" /></section>
  if (!plano) return <section className={classe}><p role="alert">{erro || 'Ative um edital para organizar o dia.'}</p><button className="daily-button" onClick={() => void recarregar()}>Tentar novamente</button></section>
  const pending = plano.blocks.filter(b => b.status === 'planned')
  const done = plano.blocks.filter(b => b.status === 'completed')
  const deferred = plano.blocks.filter(b => b.status === 'deferred')
  const readonly = plano.date < plano.today
  const plannedMinutes = pending.reduce((sum, b) => sum + b.minutes, 0)
  const pauses = Math.max(0, pending.length + done.length - 1) * plano.breakMinutes
  const rest = Math.max(0, plano.capacityMinutes - plano.spentMinutes - plannedMinutes - pauses)
  const assuntoEscolhido = plano.topics.find(t => t.id === topicId)
  const resultados = trocandoAssunto ? plano.topics.filter(t => normalizarBusca(`${t.subjectName} ${t.title}`).includes(normalizarBusca(busca))) : []
  const update = (blocks: BlocoPlano[]) => { void salvar(blocks).catch(() => {}) }
  function edit(block?: BlocoPlano) {
    if (!plano) return
    const candidate = block ?? { id: crypto.randomUUID(), topicId: plano.topics[0]?.id ?? '', minutes: Math.min(plano.blockMinutes, rest - (pending.length + done.length > 0 ? plano.breakMinutes : 0)), status: 'planned' as const, reason: 'Escolhido por você', topic: plano.topics[0] ?? null }
    setBusca(''); setTrocandoAssunto(false); setLimiteResultados(30); setEditando(candidate); setTopicId(candidate.topicId); setMinutes(candidate.minutes); setFormError('')
  }
  async function saveEdit() {
    if (!plano || !editando) return
    const topic = plano.topics.find(t => t.id === topicId)
    if (!topic || !Number.isInteger(minutes) || minutes < 5 || minutes > 180) { setFormError('Escolha um assunto e uma duração entre 5 e 180 minutos.'); return }
    const block = { ...editando, topicId, topic, minutes, reason: 'Escolhido por você' }
    const blocks = plano.blocks.some(b => b.id === block.id) ? plano.blocks.map(b => b.id === block.id ? block : b) : [...plano.blocks, block]
    try { await salvar(blocks); setEditando(null) } catch (e) { setFormError(e instanceof Error ? e.message : 'Não foi possível salvar.') }
  }
  return <section className={classe} aria-label="Plano do dia">
    <header className="daily-plan-heading"><div><h2>{plano.date === plano.today ? 'Seu plano de hoje' : `Plano de ${lerData(plano.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}{fixo && <span className="daily-plan-count"> ({plano.blocks.length} {plano.blocks.length === 1 ? 'item' : 'itens'})</span>}</h2><p className="daily-plan-state">{plano.id ? 'Plano salvo' : 'Sugestão ainda não salva'}</p><p>{plano.capacityMinutes} min disponíveis · {plano.spentMinutes} min estudados · {done.length} {done.length === 1 ? 'bloco concluído' : 'blocos concluídos'}</p></div>
      {!readonly && plano.capacityMinutes > 0 && <button className="daily-button" disabled={salvando || bloqueado || rest < 5 + (pending.length + done.length > 0 ? plano.breakMinutes : 0)} onClick={() => edit()}>Adicionar bloco</button>}
    </header>
    <div className="daily-plan-body" tabIndex={fixo ? 0 : undefined} role={fixo ? 'region' : undefined} aria-label={fixo ? 'Itens do plano do dia' : undefined}>
    {plannedMinutes + pauses + plano.spentMinutes > plano.capacityMinutes && <p className="daily-error">Seu tempo realizado ou sua disponibilidade mudou. Retire ou reduza os blocos restantes para caber no dia.</p>}
    {erro && <div role="alert" className="daily-error">{erro} <button className="quiet-link" onClick={() => void recarregar()}>Recarregar plano</button></div>}
    {plano.capacityMinutes === 0 ? <div className="daily-empty"><h3>Dia sem horário de estudo</h3><p>Você pode descansar ou ajustar sua disponibilidade para organizar alguns blocos.</p><Link to="/configuracao" className="primary-link">Ajustar rotina</Link></div> : <>
      {!plano.id && pending.length > 0 && !readonly && <p className="daily-hint">Esta é uma sugestão que cabe no seu tempo, com pausas de {plano.breakMinutes} min entre blocos. <button disabled={salvando} className="quiet-link" onClick={() => update(plano.blocks)}>{salvando ? 'Salvando…' : 'Usar este plano'}</button></p>}
      {pending.length === 0 && <div className="daily-empty"><h3>{readonly && !plano.id ? 'Nenhum plano salvo para este dia' : done.length || plano.spentMinutes > 0 ? 'Você terminou o plano deste dia' : 'Nenhum estudo pendente neste plano'}</h3><p>{deferred.length ? 'Os blocos retirados ficam fora deste dia. Os assuntos continuam disponíveis nas próximas sugestões.' : 'Você pode encerrar por aqui ou adicionar um bloco extra se houver tempo.'}</p></div>}
      <ol className="daily-blocks">{plano.blocks.filter(b => b.status !== 'deferred').map((block, index) => <li key={block.id} className={`daily-block ${block.status === 'completed' ? 'is-completed' : ''} ${selecionado === block.id ? 'is-selected' : ''}`}>
        <span className="daily-block-number">{block.status === 'completed' ? '✓' : index + 1}</span>
        <div className="daily-block-content"><small>{block.topic?.subjectName ?? 'Conteúdo removido'}</small><h3>{block.topic?.title ?? 'Assunto indisponível'}</h3><p>{block.status === 'completed' ? `${block.actualMinutes ?? block.minutes} min registrados` : `${block.minutes} min · ${block.reason}`}</p>
          {block.status === 'planned' && !readonly && <div className="daily-block-actions">
            {onSelecionar && plano.date === plano.today && <button className="daily-button daily-button-primary" disabled={salvando || bloqueado} onClick={() => onSelecionar(block)}>{selecionado === block.id ? 'Selecionado' : 'Estudar'}</button>}
            <button className="daily-button" disabled={salvando || bloqueado} onClick={() => edit(block)}>Ajustar</button>
            <button className="daily-button" disabled={salvando || bloqueado} onClick={() => update(plano.blocks.map(b => b.id === block.id ? { ...b, status: 'deferred' } : b))} title="Retirar deste dia sem agendar uma nova data">Retirar do dia</button>
            <button className="daily-button" aria-label={`Mover ${block.topic?.title} para cima`} disabled={salvando || bloqueado || index === 0} onClick={() => { const blocks = [...plano.blocks]; const pos = blocks.findIndex(b => b.id === block.id); [blocks[pos - 1], blocks[pos]] = [blocks[pos], blocks[pos - 1]]; update(blocks) }}><IconArrowUp className="h-4 w-4" /></button>
            <button className="daily-button" aria-label={`Mover ${block.topic?.title} para baixo`} disabled={salvando || bloqueado || plano.blocks.at(-1)?.id === block.id} onClick={() => { const blocks = [...plano.blocks]; const pos = blocks.findIndex(b => b.id === block.id); [blocks[pos + 1], blocks[pos]] = [blocks[pos], blocks[pos + 1]]; update(blocks) }}><IconArrowUp className="h-4 w-4 rotate-180" /></button>
          </div>}
        </div>
      </li>)}</ol>
      <p className="daily-plan-foot">{plannedMinutes} min de estudo e {pauses} min de pausas no plano. {rest} min livres. <Link to="/visao-geral">Ver todo o conteúdo</Link></p>
      {deferred.length > 0 && <details className="daily-deferred"><summary>{deferred.length} {deferred.length === 1 ? 'bloco retirado do dia' : 'blocos retirados do dia'}</summary>{deferred.map(block => <div key={block.id}><span>{block.topic?.title ?? 'Assunto indisponível'}</span>{!readonly && block.topic && <button className="daily-button" disabled={salvando || bloqueado} onClick={() => update(plano.blocks.map(b => b.id === block.id ? { ...b, status: 'planned' } : b))}>Restaurar</button>}</div>)}</details>}
    </>}
    </div>
    {editando && <Modal titulo="Editar assunto e tempo" largura="xl" onFechar={() => { if (!salvando) setEditando(null) }} rodape={<><button type="button" className="daily-button" disabled={salvando} onClick={() => setEditando(null)}>Cancelar</button><button type="submit" form="ajustar-bloco-form" className="daily-button daily-button-primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar bloco'}</button></>}>
      <form id="ajustar-bloco-form" className="daily-edit-form" onSubmit={e => { e.preventDefault(); void saveEdit() }}>
        <p className="text-sm text-muted">Bloco de {lerData(plano.date).toLocaleDateString('pt-BR')}. Escolha o que estudar e por quanto tempo.</p>
        <div className="block-topic-current"><h3>{trocandoAssunto ? 'Escolha outro assunto' : 'Assunto deste bloco'}</h3>{!trocandoAssunto && <><p className="block-topic-subject">{assuntoEscolhido?.subjectName}</p><p className="block-topic-title" tabIndex={0} aria-live="polite">{assuntoEscolhido?.title ?? 'Escolha um assunto abaixo.'}</p></>}<button ref={trocarAssunto} type="button" className="daily-button" aria-expanded={trocandoAssunto} aria-controls="block-topic-picker" disabled={salvando} onClick={() => { setTrocandoAssunto(v => !v); setBusca(''); setLimiteResultados(30) }}>{trocandoAssunto ? 'Manter assunto atual' : 'Trocar assunto'}</button></div>
        {trocandoAssunto && <div id="block-topic-picker" className="block-topic-picker">
          <label htmlFor="block-topic-search">Encontrar outro assunto no edital<input id="block-topic-search" type="search" autoFocus value={busca} disabled={salvando} placeholder="Digite parte da matéria ou do assunto" aria-describedby="block-topic-search-help" onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }} onChange={e => { setBusca(e.target.value); setLimiteResultados(30) }} /></label>
          <p id="block-topic-search-help" className="text-sm text-muted">A busca filtra a lista abaixo. Clique em um assunto para colocá-lo neste bloco.</p>
          <p role="status" className="text-sm text-muted">{resultados.length} {resultados.length === 1 ? 'assunto encontrado' : 'assuntos encontrados'}{resultados.length > limiteResultados ? ` · mostrando ${limiteResultados}` : ''}</p>
          {resultados.length ? <ul className="block-topic-results">{resultados.slice(0, limiteResultados).map(t => <li key={t.id}><button type="button" disabled={salvando} aria-pressed={t.id === topicId} onClick={() => { setTopicId(t.id); setTrocandoAssunto(false); setBusca(''); trocarAssunto.current?.focus() }}><span>{t.subjectName}{t.id === topicId ? ' · selecionado' : ''}</span><strong>{t.title}</strong></button></li>)}</ul> : <p>Nenhum assunto encontrado. Tente outra palavra ou limpe a busca.</p>}
          {resultados.length > limiteResultados && <button type="button" className="daily-button" disabled={salvando} onClick={() => setLimiteResultados(v => v + 30)}>Mostrar mais assuntos</button>}
        </div>}
        <label>Duração em minutos<input type="number" min={5} max={180} value={minutes} disabled={salvando} onChange={e => setMinutes(Number(e.target.value))} /></label>
        <p className="text-sm text-muted">Um bloco não precisa concluir o assunto inteiro. Você poderá continuar em outra sessão.</p>
        {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}

      </form>
    </Modal>}
  </section>
}
