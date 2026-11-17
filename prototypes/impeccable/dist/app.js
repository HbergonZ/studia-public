/* Mockup local. Nenhuma chamada à API do Studia. */
const exam = window.STUDIA_DEMO
const allowedLayouts = ['estudio', 'rotina', 'agenda']
const params = new URLSearchParams(location.search)
const state = {
  layout: allowedLayouts.includes(params.get('layout')) ? params.get('layout') : 'agenda',
  page: ['hoje', 'edital', 'plano'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'hoje',
  cargos: new Set(['cargo-725-743']), search: '', selected: 0, seconds: 1500,
  running: false, recording: false, capacity: 90, day: 17, blocks: []
}
let interval = null
let toastTimeout = null
const e = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const norm = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const paths = {
  book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/>',
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m5 0h1"/>',
  file: '<path d="M5 3h9l5 5v13H5Z"/><path d="M14 3v6h5M8 13h8m-8 4h6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>'
}
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.book}</svg>`
const button = (label, action, classes = '', attrs = '') => `<button class="button ${classes}" data-action="${action}" ${attrs}>${label}</button>`
const selectedOptions = () => exam.options.filter(o => state.cargos.has(o.ref))
function subjects() {
  return exam.groups.filter(g => g.refs.some(ref => state.cargos.has(ref))).flatMap(g => g.subjects.map(s => ({...s, general:g.general})))
}
function newBlocks() {
  const all = subjects()
  const general = all.filter(s => s.general)
  const specific = all.find(s => !s.general)
  const first = general.find(s => norm(s.name).includes('legislacao')) || general.find(s => norm(s.name).includes('matematica')) || general[0]
  const portuguese = general.find(s => norm(s.name).includes('portuguesa'))
  const candidates = [first, portuguese, specific].filter(Boolean)
  return candidates.map((s, i) => {
    const unit = (i === 1 ? s.units.find(u => norm(u.title).includes('concordancia')) : i === 2 ? s.units.find(u => norm(u.title).includes('seguranca do paciente')) : null) || s.units[0]
    const title = norm(unit.title).startsWith('legislacao e saude publica: constituicao') ? 'Constituição: direito à saúde' : unit.title
    return { subject:s.name.replace(/^Conhecimentos Específicos - /,''), title, source:unit.source, minutes:25, done:false, outcome:null, actual:0, reason:i === 0 ? 'Conteúdo novo' : i === 1 ? 'Revisão sugerida' : 'Conteúdo novo' }
  })
}
state.blocks = newBlocks()
function toast(message) {
  const target = document.querySelector('#toast')
  target.textContent = message
  target.classList.add('visible')
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => target.classList.remove('visible'), 4500)
}
function clock() { return `${String(Math.floor(state.seconds / 60)).padStart(2,'0')}:${String(state.seconds % 60).padStart(2,'0')}` }
function resetTimer() {
  clearInterval(interval); interval = null; state.running = false
  state.seconds = (state.blocks[state.selected]?.minutes || 25) * 60
}
function go(page) {
  state.page = page
  history.replaceState(null,'',`${location.pathname}?layout=${state.layout}#${page}`)
  render()
  window.scrollTo({top:0,behavior:'instant'})
  document.querySelector('h1')?.focus({preventScroll:true})
}
function shell(content) {
  const routes = [['hoje','Hoje','home'],['edital','Meu edital','file'],['plano','Planejamento','calendar']]
  const label = selectedOptions().map(o => o.name).join(', ') || 'Escolha seu cargo'
  return `<div class="shell"><aside class="side"><div class="brand">${icon('book')}<span class="brand-name">Studia</span></div><nav aria-label="Navegação principal">${routes.map(([page,label,name]) => `<a class="nav-link" href="#${page}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span></a>`).join('')}</nav><div class="side-notice"><small>Meu edital ativo</small><strong>Saúde de Porto Velho</strong><p style="margin-top:8px">${e(label)}</p></div><div class="account"><span class="avatar" aria-hidden="true">DE</span><div class="account-info"><strong>Conta de exemplo</strong><br><span class="muted">Dados de demonstração</span></div></div></aside><div class="workspace"><header class="topline"><div class="notice-context">${icon('file')}<span>Saúde de Porto Velho / ${e(label)}</span></div><span class="topdate">Sábado, 17 de outubro de 2026</span></header><main id="main">${content}<footer class="footer"><span>Studia · ${state.layout === 'estudio' ? 'Estúdio' : state.layout === 'rotina' ? 'Rotina' : 'Agenda'}</span><span>Dados ilustrativos. Nenhum registro será enviado ao sistema.</span></footer></main></div></div>`
}
function pageHeading(title, description, action = '') {
  return `<div class="page-heading"><div><h1 tabindex="-1">${title}</h1><p>${description}</p></div>${action}</div>`
}
function focusArea() {
  const block = state.blocks[state.selected]
  if (!block || block.done) return `<section class="focus-area"><div class="empty"><h2>Plano do dia concluído</h2><p>Seus registros de demonstração estão salvos nesta página. Você pode rever o planejamento ou testar outro cargo.</p>${button('Ver meu edital','edital','primary')}</div></section>`
  return `<section class="focus-area" aria-label="Sessão de estudo"><div class="focus-content"><div class="focus-subject"><span>${e(block.subject)}</span><span class="badge ${block.reason.includes('Revisão') ? 'review' : ''}">${block.reason}</span></div><h2>${e(block.title)}</h2><p>Uma sessão de cada vez. Você pode continuar esta unidade em outro bloco.</p><div class="source-box" tabindex="0" aria-label="Trecho do edital"><strong>O que o edital pede</strong><p>${e(block.source)}</p></div></div><div class="focus-tools"><div><div class="time" role="timer" aria-label="Tempo restante">${clock()}</div><span class="time-label">Sessão de ${block.minutes} minutos</span></div><div class="timer-actions">${button(icon(state.running ? 'pause' : 'play') + (state.running ? 'Pausar' : state.seconds < block.minutes * 60 ? 'Retomar' : 'Iniciar estudo'),'timer','','aria-pressed="'+state.running+'"')}${button('Registrar','record','secondary')}</div></div><div class="focus-footer">O cronômetro mede a sessão, não o tempo necessário para concluir todo o assunto.</div>${state.recording ? recordForm() : ''}</section>`
}
function recordForm() {
  const block = state.blocks[state.selected]
  return `<form id="record-form" class="record-form"><h3>Registrar esta sessão</h3><p>Informe o tempo estudado e como deseja seguir com a unidade.</p><div class="record-fields"><label class="field">Minutos estudados<input name="minutes" type="number" min="1" max="180" required value="${Math.max(1,Math.round((block.minutes * 60-state.seconds)/60))}"></label><label class="field">Questões resolvidas<input name="questions" type="number" min="0" max="999" value="0" required></label></div><fieldset><legend>Você concluiu esta unidade?</legend><label class="radio-line"><input type="radio" name="outcome" value="continue" checked><span>Vou continuar estudando<br><small class="muted">A unidade permanece em andamento.</small></span></label><label class="radio-line"><input type="radio" name="outcome" value="complete"><span>Concluí a unidade<br><small class="muted">O sistema poderá programar uma revisão.</small></span></label></fieldset><div class="record-actions"><button type="submit" class="button primary">Salvar registro de teste</button>${button('Cancelar','cancel-record')}</div></form>`
}
function sessions(editing = false) {
  return `<ol class="session-list">${state.blocks.map((b,i) => `<li class="session ${i === state.selected ? 'active' : ''} ${b.done ? 'completed' : ''}"><span class="session-index">${b.done ? icon('check') : i + 1}</span><div>${editing ? `<small>${e(b.subject)}</small><h3>${e(b.title)}</h3>` : `<button data-select="${i}" ${b.done ? 'disabled' : ''}><small>${e(b.subject)}</small><h3>${e(b.title)}</h3></button>`}<small>${b.done ? `${b.actual} min registrados · ${b.outcome === 'complete' ? 'Unidade concluída' : 'Unidade em andamento'}` : b.reason}</small></div>${editing ? `<label class="duration-edit"><input aria-label="Duração do bloco ${i + 1}" type="number" data-duration="${i}" value="${b.minutes}" min="5" max="90" step="5" ${b.done ? 'disabled' : ''}> min</label>${button(b.done ? 'Registrado' : 'Estudar','study-'+i,'small',b.done ? 'disabled' : '')}` : `<span class="session-duration">${b.minutes} min</span>`}</li>${i < state.blocks.length-1 ? '<li class="pause-row">5 min de pausa</li>' : ''}`).join('')}</ol>`
}
function spent() {return state.blocks.reduce((total,b) => total+b.actual,0)}
function totalMinutes() {return state.blocks.reduce((total,b) => total+(b.done ? b.actual : b.minutes),0)+Math.max(0,state.blocks.length-1)*5}
function dailyPanel() {
  return `<section class="plan-panel" aria-label="Plano do dia"><div class="section-heading"><div><h2>${state.layout === 'agenda' ? 'Compromissos do dia' : 'Seu plano de hoje'}</h2><p>3 blocos, com pausas entre eles</p></div>${button('Ajustar','plano','text small')}</div><p class="plan-total">${state.capacity} min disponíveis · ${spent()} min estudados</p>${sessions()}<p class="space-note">${Math.max(0,state.capacity-totalMinutes())} minutos livres. Não é preciso preencher todo o seu dia.</p></section>`
}
function calendar() {
  const weekdays = ['S','T','Q','Q','S','S','D']
  return `<section class="calendar" aria-label="Calendário de outubro de 2026"><div class="calendar-header"><h3>Outubro 2026</h3><span class="badge">${state.day} out.</span></div><div class="calendar-grid">${weekdays.map(day => `<small aria-hidden="true">${day}</small>`).join('')}${'<span></span>'.repeat(3)}${Array.from({length:31},(_,i) => `<button class="${i+1 === state.day ? 'selected' : ''} ${[2,5,6,7,9,13,14,15,16,19,21,23].includes(i+1) ? 'has-session' : ''}" data-day="${i+1}" aria-label="${i+1} de outubro de 2026" ${i+1 === state.day ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${i+1}</button>`).join('')}</div><p class="calendar-note">Pontos indicam dias de estudo de exemplo.</p></section>`
}
function activity() {
  return `<section class="activity" aria-label="Histórico de atividade ilustrativo"><div class="section-heading"><div><h2>Um pouco, com frequência</h2><p>Seu histórico de estudo nos últimos 12 meses</p></div><span class="badge">2026</span></div><div class="heat-scroller" tabindex="0" aria-label="Mapa de atividade com rolagem horizontal"><div class="heatmap" role="img" aria-label="Mapa ilustrativo de dias estudados no último ano">${Array.from({length:364},(_,i) => `<span data-level="${i < 55 || i % 7 > 4 || i % 11 < 3 ? 0 : (i*13)%4}"></span>`).join('')}</div></div><div class="heat-labels"><span>Out. 2025</span><span>Out. 2026</span></div><p class="muted" style="font-size:.8125rem;margin-top:14px">Histórico ilustrativo para avaliar o layout.</p></section>`
}
function weekly() {
  const minutes=[45,75,50,0,75,0,0]
  return `<section class="weekly"><h2>Seu ritmo na semana</h2><p>245 de 300 minutos planejados</p><div class="week-bars" role="img" aria-label="Exemplo de tempo por dia: segunda 45, terça 75, quarta 50, quinta zero, sexta 75, sábado e domingo zero minutos">${['S','T','Q','Q','S','S','D'].map((day,i) => `<div class="week-bar ${i===5 ? 'today' : ''}"><i style="height:${minutes[i]}px"></i><span>${day}</span></div>`).join('')}</div><p style="font-size:.8125rem;margin-top:12px">Exemplo de distribuição, sem meta de sequência obrigatória.</p></section>`
}
function kanban() {
  const upcoming=state.blocks.filter(b=>!b.done)
  const done=state.blocks.filter(b=>b.done)
  return `<section class="kanban" aria-label="Quadro de revisões"><div class="section-heading"><div><h2>Como o estudo continua</h2><p>O plano é pequeno. O restante do conteúdo fica organizado aqui.</p></div>${button('Ver matérias','edital','text small')}</div><div class="kanban-grid"><section class="kanban-column"><h3>No plano de hoje <span class="badge">${upcoming.length}</span></h3>${upcoming.map(b=>`<div class="kanban-item"><small>${e(b.subject)}</small>${e(b.title)}</div>`).join('') || '<p class="muted">Plano finalizado.</p>'}</section><section class="kanban-column"><h3>Em andamento <span class="badge">${done.filter(b=>b.outcome==='continue').length}</span></h3>${done.filter(b=>b.outcome==='continue').map(b=>`<div class="kanban-item"><small>Continuar em outra sessão</small>${e(b.title)}</div>`).join('') || '<div class="kanban-item"><p class="muted">Ao registrar uma continuação, sua unidade aparece aqui.</p></div>'}</section><section class="kanban-column"><h3>Próximas revisões <span class="badge">${done.filter(b=>b.outcome==='complete').length}</span></h3>${done.filter(b=>b.outcome==='complete').map(b=>`<div class="kanban-item"><small>Unidade concluída nesta demonstração</small>${e(b.title)}</div>`).join('') || '<div class="kanban-item"><p class="muted">Conclua uma unidade para testar este estado.</p></div>'}</section></div><p class="kanban-foot">As revisões seguem o histórico da unidade. Adiar um bloco não conclui o assunto.</p></section>`
}
function today() {
  if (!state.blocks.length) return pageHeading('Hoje','Comece pelo conteúdo do seu concurso.')+`<section class="empty"><h2>Qual cargo você vai prestar?</h2><p>Escolha uma opção do edital para receber matérias e uma sugestão de plano.</p>${button('Escolher cargo','edital','primary')}</section>`
  return pageHeading(state.layout === 'rotina' ? 'O que estudar hoje' : state.layout === 'agenda' ? 'Sábado, 17 de outubro' : 'Seu dia de estudo','Um plano possível para o tempo que você tem.',button('Meu edital','edital','text') )+`<div class="content-grid"><div class="agenda-calendar">${calendar()}</div>${focusArea()}${dailyPanel()}</div><div class="below-grid">${activity()}${weekly()}</div>${kanban()}`
}
function cargoOptions() {
  const options=exam.options.filter(o=>norm(o.name+' '+o.code).includes(norm(state.search)))
  return options.map(o=>`<label class="cargo-option"><input type="checkbox" data-cargo="${e(o.ref)}" ${state.cargos.has(o.ref) ? 'checked' : ''}><span>${e(o.name)}<small>Código ${e(o.code)}</small></span></label>`).join('') || '<p class="muted">Nenhum cargo encontrado. Tente outro nome ou código.</p>'
}
function notice() {
  const all=subjects()
  const count=all.reduce((sum,s)=>sum+s.units.length,0)
  return pageHeading('Meu edital','Escolha o cargo. O Studia reúne o conteúdo correspondente.')+`<section class="notice-intro"><div><h2>Saúde de Porto Velho / RO</h2><p>Edital nº 25/2026 · Conhecimentos gerais e específicos por cargo</p></div><span class="badge done">Conteúdo organizado</span></section><div class="notice-layout"><aside class="cargo-panel"><h2>Qual é o seu cargo?</h2><p class="muted" style="font-size:.875rem;margin-top:8px">Você pode escolher mais de um.</p><label class="field">Buscar nome ou código<input id="cargo-search" type="search" value="${e(state.search)}" placeholder="Ex.: enfermeiro, 725"></label><p class="count-line">${state.cargos.size} selecionados de ${exam.options.length} opções</p><div class="cargo-options" role="group" aria-label="Opções de cargo" tabindex="0">${cargoOptions()}</div></aside><div><div class="selected-summary"><div><h2>${state.cargos.size ? selectedOptions().map(o=>e(o.name)).join(' + ') : 'Selecione um cargo ao lado'}</h2><p>${all.length} matérias · ${count} unidades de estudo</p></div>${button('Organizar meu dia','plano','primary',!state.cargos.size ? 'disabled' : '')}</div><div class="subjects">${all.map((s,i)=>`<section class="subject"><h3>${e(s.name.replace(/^Conhecimentos Específicos - /,''))}</h3><p>${s.general ? 'Conhecimentos gerais' : 'Conhecimentos específicos'} · ${s.units.length} unidades</p><ul tabindex="0" aria-label="Unidades de ${e(s.name)}">${s.units.map(u=>`<li>${e(u.title)}</li>`).join('')}</ul></section>`).join('')}</div><p class="muted" style="margin-top:20px;font-size:.875rem">Unidades não são estimativas de duração. Uma lei ou assunto pode ocupar várias sessões. Lotações com o mesmo programa estão agrupadas.</p></div></div>`
}
function budget() {
  const total=totalMinutes()
  return `<div class="time-budget"><div class="budget-track" role="img" aria-label="${total} minutos reservados de ${state.capacity} disponíveis">${state.blocks.map((b,i)=>`<span style="flex:${b.done ? b.actual : b.minutes}"></span>${i<state.blocks.length-1 ? '<span class="break" style="flex:5"></span>' : ''}`).join('')}<span class="free" style="flex:${Math.max(0,state.capacity-total)}"></span></div><div class="budget-caption"><span>${state.blocks.reduce((sum,b)=>sum+(b.done ? b.actual : b.minutes),0)} min de estudo + ${Math.max(0,state.blocks.length-1)*5} min de pausas</span><span>${Math.max(0,state.capacity-total)} min livres</span></div></div>`
}
function planning() {
  const hasToday=state.day===17 && state.blocks.length
  return pageHeading('Planejamento','Seu edital é extenso. Seu compromisso de hoje não precisa ser.',button('Voltar ao estudo','hoje','text'))+`<div class="planning-layout"><aside>${calendar()}<section class="availability"><h3>Tempo disponível</h3><p class="muted" style="font-size:.875rem;margin-top:7px">A sugestão inclui pausas de 5 minutos.</p><label for="capacity">Neste dia <span><input id="capacity" type="number" min="15" max="300" step="5" value="${state.capacity}"> min</span></label></section></aside><section class="day-plan"><div class="section-heading"><div><h2>${state.day===17 ? 'Seu sábado, sem excesso' : `${state.day} de outubro`}</h2><p>${state.day===17 ? 'Ajuste a duração antes de começar.' : 'Este protótipo demonstra o plano do dia 17.'}</p></div><span class="badge">${state.capacity} min</span></div>${hasToday ? `${budget()}${sessions(true)}${totalMinutes()>state.capacity ? '<p role="alert" class="inline-alert">O plano ultrapassa seu tempo. Reduza os blocos ou aumente a disponibilidade.</p>' : '<p class="space-note" style="margin-top:20px">O restante do edital fica para os próximos dias. Continuar depois faz parte do plano.</p>'}<div class="plan-actions"><span class="muted" style="font-size:.875rem">Nada será salvo na sua conta.</span>${button('Usar este plano','use-plan','primary',totalMinutes()>state.capacity ? 'disabled' : '')}</div>` : `<div class="empty"><h3>${state.blocks.length ? 'Sem blocos nesta demonstração' : 'Escolha seu cargo primeiro'}</h3><p>${state.blocks.length ? 'Volte ao dia 17 para ajustar a sugestão de estudo.' : 'O conteúdo do cargo é a base para organizar os blocos.'}</p>${button(state.blocks.length ? 'Voltar ao dia 17' : 'Escolher cargo',state.blocks.length ? 'day-17' : 'edital','primary')}</div>`}</section></div>${kanban()}`
}
function render() {
  document.body.dataset.layout=state.layout
  document.querySelectorAll('button[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===state.layout)))
  document.title=`Studia · ${state.layout[0].toUpperCase()+state.layout.slice(1)} · ${state.page==='hoje' ? 'Hoje' : state.page==='edital' ? 'Meu edital' : 'Planejamento'}`
  document.querySelector('#app').innerHTML=shell(state.page==='edital' ? notice() : state.page==='plano' ? planning() : today())
}
document.addEventListener('click',event=>{
  const variant=event.target.closest('button[data-layout]')
  if (variant) {state.layout=variant.dataset.layout;go(state.page);return}
  const nav=event.target.closest('[data-page]')
  if(nav){event.preventDefault();go(nav.dataset.page);return}
  const day=event.target.closest('[data-day]')
  if(day){state.day=Number(day.dataset.day);go('plano');return}
  const selection=event.target.closest('[data-select]')
  if(selection){state.selected=Number(selection.dataset.select);state.recording=false;resetTimer();render();return}
  const action=event.target.closest('[data-action]')?.dataset.action
  if(!action)return
  if(['hoje','edital','plano'].includes(action)){go(action);return}
  if(action==='timer'){
    state.running=!state.running
    if(state.running){const end=Date.now()+state.seconds*1000;interval=setInterval(()=>{state.seconds=Math.max(0,Math.ceil((end-Date.now())/1000));const timer=document.querySelector('.time');if(timer)timer.textContent=clock();if(state.seconds===0){clearInterval(interval);state.running=false;render();toast('Sessão encerrada. Registre o que você estudou.')}},250)}
    else clearInterval(interval)
    render()
  } else if(action==='record'){clearInterval(interval);state.running=false;state.recording=true;render();document.querySelector('#record-form').scrollIntoView({block:'nearest',behavior:'smooth'})}
  else if(action==='cancel-record'){state.recording=false;render()}
  else if(action==='use-plan'){state.day=17;go('hoje');toast('Plano de demonstração pronto. Comece pelo bloco que preferir.')}
  else if(action==='day-17'){state.day=17;render()}
  else if(action.startsWith('study-')){state.selected=Number(action.slice(6));state.recording=false;resetTimer();go('hoje')}
})
document.addEventListener('input',event=>{
  if(event.target.id==='cargo-search'){state.search=event.target.value;document.querySelector('.cargo-options').innerHTML=cargoOptions()}
})
document.addEventListener('change',event=>{
  const target=event.target
  if(target.matches('[data-cargo]')){
    if(target.checked)state.cargos.add(target.dataset.cargo);else state.cargos.delete(target.dataset.cargo)
    state.blocks=newBlocks();state.selected=0;state.recording=false;resetTimer();render()
    toast('Conteúdos atualizados para os cargos selecionados.')
  } else if(target.matches('[data-duration]')){
    const value=Number(target.value)
    if(Number.isInteger(value)&&value>=5&&value<=90){state.blocks[Number(target.dataset.duration)].minutes=value;resetTimer()}
    render()
  } else if(target.id==='capacity'){
    const value=Number(target.value)
    if(Number.isInteger(value)&&value>=15&&value<=300)state.capacity=value
    render()
  }
})
document.addEventListener('submit',event=>{
  if(event.target.id!=='record-form')return
  event.preventDefault()
  if(!event.target.reportValidity())return
  const data=new FormData(event.target)
  const block=state.blocks[state.selected]
  block.done=true;block.actual=Number(data.get('minutes'));block.outcome=data.get('outcome')
  state.recording=false;state.selected=Math.max(0,state.blocks.findIndex(b=>!b.done));resetTimer();render()
  toast(block.outcome==='complete' ? 'Registro de teste salvo. Unidade concluída.' : 'Registro de teste salvo. A unidade continua em andamento.')
})
window.addEventListener('hashchange',()=>{
  const page=location.hash.slice(1)
  if(['hoje','edital','plano'].includes(page)){state.page=page;render()}
})
render()
