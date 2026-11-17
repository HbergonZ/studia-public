import { useState } from 'react'
import { LABELS_POMODORO, formatarTempo, type PomodoroEstado, type ModoPomodoro } from '../lib/pomodoro'
import { IconBook, IconPlay, IconPause } from './icons'
import type { ItemCronograma } from '../types'
import ConteudoOriginal from './ConteudoOriginal'

const situacoes = { atrasada: 'Revisão atrasada', hoje: 'Revisão de hoje', novo: 'Conteúdo novo', futura: 'Próxima revisão' }

export default function SessaoFoco({ estado, item, onRegistrar, onIniciar, bloqueado = false }: { estado: PomodoroEstado; item?: ItemCronograma; onRegistrar: () => void; onIniciar?: () => Promise<void>; bloqueado?: boolean }) {
  const [editando, setEditando] = useState(false)
  const horas = Math.floor(estado.restante / 3600)
  const minutos = Math.floor(estado.restante % 3600 / 60)
  const segundos = estado.restante % 60

  async function iniciar() {
    if (!estado.rodando && onIniciar) { try { await onIniciar() } catch { return } }
    if (!estado.rodando) document.documentElement.requestFullscreen?.().catch(() => {})
    estado.alternarPlay()
  }

  return <section className="study-focus" aria-label="Sessão de foco">
    <div className="study-focus-top"><span><IconBook className="h-4 w-4" />{item?.materiaNome ?? 'Seu tempo de estudo'}</span>{item && <span className="study-focus-marker">{item.topico.emAndamento ? 'Continuar assunto' : situacoes[item.status]}</span>}</div>
    <h2 tabIndex={0} aria-label="Assunto da sessão">{item?.topico.nome ?? 'Tudo em dia por aqui'}</h2>
    <ConteudoOriginal texto={item?.topico.textoOriginal} sempreVisivel />
    <p>{item ? 'Estude no seu ritmo e registre o resultado ao terminar.' : 'Você pode usar o cronômetro para uma sessão livre.'}</p>
    <div className="study-focus-clock"><div className="study-timer">
      <span>Tempo de foco</span>
      {editando ? <div className="timer-editor" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setEditando(false) }}>
        {[{ label: 'Horas', value: horas, max: 99, change: (value: number) => estado.aplicarTempo(value, minutos, segundos) }, { label: 'Minutos', value: minutos, max: 59, change: (value: number) => estado.aplicarTempo(horas, value, segundos) }, { label: 'Segundos', value: segundos, max: 59, change: (value: number) => estado.aplicarTempo(horas, minutos, value) }].map((field, index) => <label key={field.label}><span>{field.label}</span><input autoFocus={index === 0} className="campo-tempo-pomodoro" type="number" min={0} max={field.max} aria-label={field.label} value={String(field.value).padStart(2, '0')} onChange={event => field.change(Math.min(field.max, Math.max(0, Number(event.target.value) || 0)))} onKeyDown={event => { if (event.key === 'Enter') setEditando(false) }} /></label>)}
      </div> : <button className="study-timer-value" disabled={estado.rodando} onClick={() => setEditando(true)} aria-label={`Editar tempo de foco, ${formatarTempo(estado.restante)}`}>{horas > 0 ? `${String(horas).padStart(2, '0')}:` : ''}{formatarTempo(estado.restante % 3600)}</button>}
      <div className="study-timer-modes" role="group" aria-label="Tipo de sessão">{(['foco', 'curta', 'longa'] as ModoPomodoro[]).map(modo => <button key={modo} onClick={() => { estado.trocarModo(modo); setEditando(false) }} aria-pressed={estado.modo === modo}>{LABELS_POMODORO[modo]}</button>)}</div>
    </div>
    <div className="study-focus-actions"><button className="focus-primary" disabled={bloqueado} onClick={() => void iniciar()}>{estado.rodando ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4" />}{estado.rodando ? 'Pausar sessão' : 'Iniciar sessão'}</button><button disabled={!item || bloqueado} onClick={onRegistrar} className="focus-secondary">Registrar estudo</button></div></div>
    <div className="study-focus-foot"><span>{item ? `Peso da matéria: ${item.peso}` : 'O cronômetro não registra estudos automaticamente.'}</span><button onClick={() => { estado.reiniciar(); setEditando(false) }}>Reiniciar tempo</button></div>
  </section>
}
