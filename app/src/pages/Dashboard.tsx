import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEstudo } from '../context/EstudoContext'
import { usePlanoDia } from '../lib/usePlanoDia'
import { usePomodoro } from '../lib/pomodoro'
import { lerData } from '../lib/datas'
import type { BlocoPlano } from '../types'
import PlanoDiario from '../components/PlanoDiario'
import SessaoFoco from '../components/SessaoFoco'
import PomodoroFoco from '../components/Pomodoro'
import RegistrarSessaoModal from '../components/RegistrarSessaoModal'
import { useCarregamentoPagina } from '../context/CarregamentoPaginaContext'
import { IconBook } from '../components/icons'
import CalendarioPlano from '../components/CalendarioPlano'
import CalendarioSecao from '../components/CalendarioSecao'
import RitmoSemana from '../components/RitmoSemana'
import ContinuidadeEstudo from '../components/ContinuidadeEstudo'

export default function Dashboard() {
  const navigate = useNavigate()
  const { hoje, materias, cronograma, statusEdital, disponibilidade, editalId, erro, recarregar } = useEstudo()
  const { usuario } = useAuth()
  const [dataDaMesa, setDataDaMesa] = useState(hoje)
  const estado = usePlanoDia(dataDaMesa)
  const pomodoro = usePomodoro(usuario && editalId ? `studia:cronometro:${usuario.id}:${editalId}` : undefined)
  const [blocoAtivo, setBlocoAtivo] = useState<BlocoPlano | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const pending = estado.plano?.blocks.filter(b => b.status === 'planned') ?? []
  const candidato = pending.find(b => b.id === (pomodoro.rascunho?.blockId ?? selected)) ?? pending[0]
  const ocupado = pomodoro.rodando || pomodoro.segundosEstudados > 0
  const bloco = ocupado ? blocoAtivo ?? candidato : candidato
  const item = cronograma.find(i => i.topico.id === bloco?.topicId) ?? (bloco?.topic ? {
    materiaId: bloco.topic.subjectId, materiaNome: bloco.topic.subjectName, peso: bloco.topic.weight, cor: bloco.topic.color,
    topico: { id: bloco.topicId, nome: bloco.topic.title, textoOriginal: bloco.topic.sourceText, dificuldade: bloco.topic.difficulty, posicaoCurva: 0, emAndamento: bloco.topic.continuation, questoes: { acertos: 0, erros: 0 } },
    status: 'novo' as const, dataPrevista: lerData(hoje),
  } : undefined)
  const rotinaDefinida = Object.values(disponibilidade).some(horas => horas > 0)
  const preparandoPlano = estado.carregando && rotinaDefinida && statusEdital === 'confirmado' && materias.length > 0
  useCarregamentoPagina(preparandoPlano)

  useEffect(() => {
    if (ocupado) return
    pomodoro.reiniciar(); pomodoro.trocarModo('foco')
    if (bloco) pomodoro.vincular(bloco.id, dataDaMesa)
    if (bloco) pomodoro.aplicarTempo(Math.floor(bloco.minutes / 60), bloco.minutes % 60, 0)
    // The clock belongs to a specific block; a new block starts a fresh clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloco?.id, bloco?.minutes])

  useEffect(() => {
    if (!ocupado) return
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const navigate = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (target && !target.getAttribute('href')?.startsWith('#') && !window.confirm('Seu estudo ainda não foi registrado. Deseja sair desta tela? O tempo medido ficará como rascunho para recuperar depois.')) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true)
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true) }
  }, [ocupado])

  useEffect(() => {
    if (pomodoro.rascunho) setDataDaMesa(pomodoro.rascunho.date)
    else if (!ocupado) setDataDaMesa(hoje)
  }, [hoje, ocupado, pomodoro.rascunho])

  async function preparar() {
    if (bloco) setBlocoAtivo(bloco)
    if (estado.plano && !estado.plano.id) await estado.salvar(estado.plano.blocks)
  }
  function selecionar(block: BlocoPlano) { if (!ocupado) { setSelected(block.id); setMensagem(''); window.scrollTo({ top: 0, behavior: 'smooth' }) } }
  async function registrar() {
    if (pomodoro.rodando) pomodoro.encerrar()
    try { await preparar(); setRegistrando(true) } catch { /* The plan displays the error and remains available. */ }
  }
  if (preparandoPlano) return null
  if (erro && materias.length === 0) return <section className="daily-empty"><h1>Não foi possível carregar seus estudos</h1><p>Seu conteúdo não foi removido. Tente carregar novamente.</p><button className="daily-button" onClick={() => void recarregar()}>Tentar novamente</button></section>
  if (materias.length === 0) return <section className="first-plan"><div className="first-plan-symbol"><IconBook className="h-10 w-10" /></div><h1>Vamos organizar seus estudos</h1><p>Importe um edital ou cadastre suas matérias para receber um plano que cabe na sua rotina.</p><Link to="/editais" className="primary-link">Escolher edital</Link><Link to="/editais/novo?manual=1" className="quiet-link mt-4">Cadastrar minhas matérias manualmente</Link></section>
  return <div className="desk-dashboard">
    <header className="desk-page-heading"><h1>Hoje</h1><Link to="/planejamento" className="quiet-link">Ver planejamento</Link></header>
    {statusEdital !== 'confirmado' ? <p className="desk-notice">Confirme o conteúdo do edital antes de organizar seus estudos. <Link to="/editais">Revisar edital</Link></p> : !rotinaDefinida ? <section className="daily-empty"><h2>Quanto tempo você tem para estudar?</h2><p>Defina sua disponibilidade para receber poucos blocos por dia, dentro do tempo que você tem.</p><Link to="/configuracao" className="primary-link">Definir minha rotina</Link></section> : <>
      {pomodoro.erroRascunho && <p role="alert" className="daily-error">{pomodoro.erroRascunho}</p>}
      {pomodoro.rascunho && <section className="daily-hint" aria-label="Estudo não registrado"><h2>Você tem um estudo não registrado</h2><p>{Math.ceil(pomodoro.rascunho.segundosEstudados / 60)} min medidos em {lerData(pomodoro.rascunho.date).toLocaleDateString('pt-BR')}. A recuperação mantém o cronômetro pausado.</p>{pending.some(b => b.id === pomodoro.rascunho?.blockId) ? <button className="daily-button daily-button-primary" onClick={() => { setBlocoAtivo(pending.find(b => b.id === pomodoro.rascunho?.blockId) ?? null); pomodoro.recuperar() }}>Recuperar estudo</button> : <p>O bloco foi alterado ou concluído. Confira seu histórico antes de registrar esse tempo manualmente em Tópicos.</p>}<button className="daily-button" onClick={() => { if (window.confirm('Descartar o rascunho deste estudo?')) pomodoro.apagarRascunho() }}>Descartar rascunho</button></section>}
      {dataDaMesa !== hoje && ocupado && <p role="status" className="daily-hint">O dia mudou. Este registro continuará vinculado a {lerData(dataDaMesa).toLocaleDateString('pt-BR')}, quando a sessão começou.</p>}
      {mensagem && <p role="status" className="daily-success">{mensagem}</p>}
      <div className={`agenda-today ${!bloco ? 'without-focus' : ''}`}><aside><CalendarioPlano data={hoje} bloqueado={ocupado} onSelecionar={dia => navigate(`/planejamento?data=${dia}`)} /></aside>
      {bloco && item && <div id="sessao">
        <SessaoFoco estado={pomodoro} item={item} onRegistrar={() => void registrar()} onIniciar={preparar} bloqueado={estado.salvando || estado.atualizando || !!pomodoro.rascunho} />
        {ocupado && <p className="daily-hint">Ao terminar, registre o estudo para salvar seu tempo e liberar o próximo bloco.</p>}
      </div>}
      <PlanoDiario estado={estado} fixo selecionado={bloco?.id} onSelecionar={selecionar} bloqueado={ocupado || estado.atualizando || !!pomodoro.rascunho} />
      </div>
      <div className="agenda-history"><CalendarioSecao somenteAtividade /><RitmoSemana /></div>
      <ContinuidadeEstudo plano={estado.plano} />
      <div className="daily-links"><Link to="/planejamento">Calendário e revisões</Link><Link to="/visao-geral">Todo o conteúdo do edital</Link><Link to="/progresso">Meu progresso</Link></div>
    </>}
    {registrando && bloco && bloco.topic && estado.plano?.id && <RegistrarSessaoModal materiaId={bloco.topic.subjectId} materiaNome={bloco.topic.subjectName} topicoId={bloco.topicId} topicoNome={bloco.topic.title} textoOriginal={bloco.topic.sourceText} dificuldadeAtual={bloco.topic.difficulty} tempoInicial={Math.ceil(pomodoro.segundosEstudados / 60)} concluirInicial={!!bloco.topic.nextReviewAt && !bloco.topic.continuation} dataInicial={estado.plano.date} planoId={estado.plano.id} blocoId={bloco.id} onFechar={() => setRegistrando(false)} onSalvar={resultado => { pomodoro.reiniciar(true); setBlocoAtivo(null); setSelected(null); setMensagem(resultado.nextReviewAt ? `Estudo salvo. Próxima revisão: ${lerData(resultado.nextReviewAt).toLocaleDateString('pt-BR')}.` : 'Estudo salvo. O assunto fica disponível para continuar.'); }} />}
    <PomodoroFoco estado={pomodoro} onRegistrar={() => void registrar()} />
  </div>
}
