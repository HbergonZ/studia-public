const $ = (selector, root = document) => root.querySelector(selector)
const app = $('#app')
const dialog = $('#dialog')
const params = new URLSearchParams(location.search)
const names = { biblioteca: 'Biblioteca', agenda: 'Agenda', mesa: 'Mesa de estudo' }
const state = {
  layout: names[params.get('layout')] ? params.get('layout') : 'mesa',
  screen: ['painel', 'editais', 'topicos', 'usuarios', 'configurar'].includes(params.get('tela')) ? params.get('tela') : 'painel',
  completed: new Set(), selected: 0, day: 3, week: 0, seconds: 1500, running: false,
  query: '', subject: '', invitation: '', users: [{ email: 'marina@example.com', role: 'Administradora' }, { email: 'joana@example.com', role: 'Usuária' }],
  activityYear: 'recent', calendarYear: 2026, calendarMonth: 9, calendarMode: 'month', selectedDate: '2026-10-15', boardSubject: '',
  boardCompleted: new Set(), activeBoardId: null, boardTopic: '',
}
const tasks = [
  { subject: 'Língua portuguesa', topic: 'Concordância verbal', detail: 'Concordância com sujeito composto', duration: 25, type: 'Revisão de 7 dias', questions: 20 },
  { subject: 'Direito administrativo', topic: 'Atos administrativos', detail: 'Elementos, atributos e classificação', duration: 40, type: 'Conteúdo novo', questions: 15 },
  { subject: 'Direito constitucional', topic: 'Direitos fundamentais', detail: 'Direitos e garantias individuais', duration: 30, type: 'Revisão de 14 dias', questions: 20 },
  { subject: 'Informática', topic: 'Redes de computadores', detail: 'Protocolos e segurança de rede', duration: 25, type: 'Revisão de 3 dias', questions: 10 },
]
const subjects = [
  { name: 'Língua portuguesa', done: 12, total: 24, accuracy: 82, topics: ['Interpretação de texto', 'Concordância verbal', 'Regência e crase'] },
  { name: 'Direito administrativo', done: 8, total: 22, accuracy: 74, topics: ['Princípios da administração', 'Atos administrativos', 'Licitações e contratos'] },
  { name: 'Direito constitucional', done: 6, total: 20, accuracy: 71, topics: ['Organização do Estado', 'Direitos fundamentais', 'Poderes da União'] },
  { name: 'Informática', done: 2, total: 18, accuracy: 68, topics: ['Redes de computadores', 'Sistemas operacionais', 'Ferramentas de escritório'] },
]
const schedule = [
  { day: 0, time: '09:00', top: 9, task: 0 }, { day: 1, time: '10:30', top: 23, task: 1 },
  { day: 2, time: '08:30', top: 4, task: 2 }, { day: 3, time: '09:00', top: 9, task: 0 },
  { day: 3, time: '14:00', top: 50, task: 1 }, { day: 3, time: '18:00', top: 82, task: 3 },
  { day: 4, time: '10:00', top: 17, task: 2 }, { day: 5, time: '09:00', top: 9, task: 0 },
]
const paths = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  book: '<path d="M12 5C8 2 4 3 3 4v15c3-2 6-2 9 0 3-2 6-2 9 0V4c-3-2-6-2-9 1Zm0 0v14"/>',
  file: '<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v6h5M8 13h8M8 17h5"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-3c0-4 12-4 12 0v3M16 5a3 3 0 0 1 0 6m3 9v-3a5 5 0 0 0-2-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  play: '<path d="m9 5 11 7-11 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18"/>',
  bell: '<path d="M5 17h14l-2-4V8A5 5 0 0 0 7 8v5zm5 4h4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
}
function icon(name, className = '') { return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.book}</svg>` }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) }
function button(label, action, className = 'button', symbol = '') { return `<button class="${className}" data-action="${action}">${symbol ? icon(symbol) : ''}${label}</button>` }
function toast(message) {
  $('#toast').textContent = message
  $('#toast').classList.add('visible')
  clearTimeout(toast.timeout)
  toast.timeout = setTimeout(() => $('#toast').classList.remove('visible'), 3200)
}
function nav() {
  const items = [['painel', 'Início', 'home'], ['editais', 'Editais', 'file'], ['topicos', 'Tópicos', 'book'], ['usuarios', 'Usuários', 'users'], ['configurar', 'Configurar', 'settings']]
  return items.map(([screen, name, symbol]) => `<button data-screen="${screen}" class="nav-link ${state.screen === screen ? 'active' : ''}" ${state.screen === screen ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${name}</span></button>`).join('')
}
function brand() { return `<div class="brand">${icon('book')}<span>studia</span></div>` }
function profile() { return `<div class="profile"><span class="avatar" aria-hidden="true">MD</span><div><strong>Marina Duarte</strong><span>Administradora</span></div></div>` }
function frame(content) {
  const horizontal = state.layout === 'agenda'
  return `<div class="app-shell ${horizontal ? 'horizontal' : ''}">
    <${horizontal ? 'header' : 'aside'} class="navigation">
      ${brand()}<nav aria-label="Navegação de demonstração">${nav()}</nav>
      <div class="nav-bottom">${!horizontal ? '<div class="plan-note"><span>Seu plano ativo</span><strong>Técnico administrativo</strong><span>Prova em 20 de novembro</span></div>' : ''}${profile()}</div>
    </${horizontal ? 'header' : 'aside'}>
    <main id="workspace" class="workspace" tabindex="-1">
      <div class="workspace-top"><span>${({painel:'Área de estudos',editais:'Seus planos de estudo',topicos:'Conteúdo programático',usuarios:'Administração',configurar:'Preferências'})[state.screen]}</span><div><span class="today-label">Quinta-feira, 15 de outubro</span><button class="icon-button" data-action="notifications" aria-label="Ver lembretes">${icon('bell')}</button></div></div>
      ${content}
      <footer class="workspace-footer"><span>Studia</span><span>Conteúdo demonstrativo. As ações não alteram sua conta.</span></footer>
    </main>
  </div>`
}
function pageHeading(title, description, action = '') {
  return `<header class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</header>`
}
function progress(value, total) { return `<span class="progress-track" role="meter" aria-label="Conteúdo estudado" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${Math.round(value / total * 100)}%"></span></span>` }
function subjectRows() {
  return subjects.map((subject, index) => `<button class="subject-row" data-subject="${index}"><span class="subject-spine spine-${index}"></span><span class="subject-name">${subject.name}<small>${subject.done} de ${subject.total} tópicos estudados</small></span>${progress(subject.done, subject.total)}<span class="accuracy">${subject.accuracy}%<small>de acertos</small></span>${icon('chevron')}</button>`).join('')
}
function taskRow(task, index, numbered = false) {
  const checked = state.completed.has(index)
  return `<div class="task-row ${checked ? 'completed' : ''}">
    <button class="task-check ${checked ? 'checked' : ''}" data-complete="${index}" aria-label="${checked ? 'Reabrir' : 'Concluir'} ${task.topic}" aria-pressed="${checked}">${checked ? icon('check') : numbered ? `<span>${index + 1}</span>` : ''}</button>
    <div class="task-text"><span>${task.subject}</span><strong>${task.topic}</strong><small>${task.type}</small></div>
    <span class="duration">${task.duration} min</span><button class="icon-button task-start" data-study="${index}" aria-label="Estudar ${task.topic}">${icon('play')}</button>
  </div>`
}
function calendar() {
  return `<section class="mini-calendar"><div class="section-title"><h2>Outubro</h2><span>2026</span></div><div class="calendar-grid">${['S','T','Q','Q','S','S','D'].map(day=>`<span class="weekday">${day}</span>`).join('')}${Array.from({length:3},()=>'<span></span>').join('')}${Array.from({length:31},(_,i)=>`<span class="date ${i+1===15?'selected':''} ${[6,7,9,12,13,14].includes(i+1)?'studied':''}" ${i+1===15?'aria-label="Hoje, 15 de outubro"':''}>${i+1}</span>`).join('')}</div><p class="calendar-key"><i></i>Dia com estudo registrado</p></section>`
}
function weekBars() {
  const minutes = [45, 50, 35, 70, 20, 0, 0]
  return `<div class="week-bars" role="img" aria-label="Estudos da semana: segunda 45 minutos, terça 50, quarta 35, quinta 70, sexta 20, sábado e domingo sem registros.">${minutes.map((m,i)=>`<div><span class="bar ${i===3?'current':''}" style="height:${Math.max(m,3)}px" title="${m} minutos"></span><small>${['S','T','Q','Q','S','S','D'][i]}</small></div>`).join('')}</div>`
}
function biblioteca() {
  const first = tasks[state.selected]
  return `${pageHeading('Seu plano de estudos', 'Técnico administrativo · Universidade Federal', button('Registrar estudo','register','button button-outline','plus'))}
    <div class="library-columns"><div class="library-main">
      <section class="next-study"><div class="next-study-top"><span class="section-label">Próximo estudo</span><span>${icon('clock')}${first.duration} minutos</span></div><p class="subject-kicker">${first.subject}</p><h2>${first.topic}</h2><p>${first.detail}. Continue de onde parou.</p><div class="next-study-bottom">${button('Começar estudo','focus','button button-primary','play')}<span>${first.type}</span></div><div class="book-tab" aria-hidden="true"></div></section>
      <section class="section schedule-list"><div class="section-title"><h2>Para estudar hoje</h2><span>${tasks.length-state.completed.size} tópicos pendentes</span></div>${tasks.map((task,index)=>taskRow(task,index)).join('')}</section>
      <section class="section"><div class="section-title"><h2>Conteúdo do edital</h2><button class="text-button" data-screen="topicos">Ver todos os tópicos</button></div><div class="subject-list">${subjectRows()}</div></section>
    </div><aside class="study-aside">${calendar()}<section class="weekly-summary"><div class="section-title"><h2>Sua semana</h2><button class="text-button" data-action="show-agenda">Ver agenda</button></div>${weekBars()}<div class="week-total"><strong>3h 40min</strong><span>de 5 horas planejadas</span></div>${progress(220,300)}</section><section class="exam-note">${icon('file')}<div><h2>36 dias até a prova</h2><p>20 de novembro de 2026</p><button class="text-button" data-screen="editais">Consultar edital</button></div></section></aside></div>`
}
function weekTitle() {
  if (state.week === 0) return '12 a 18 de outubro'
  const date = new Date(2026, 9, 12 + state.week * 7)
  const end = new Date(2026, 9, 18 + state.week * 7)
  return `${date.getDate()} de ${date.toLocaleDateString('pt-BR',{month:'long'})} a ${end.getDate()} de ${end.toLocaleDateString('pt-BR',{month:'long'})}`
}
function agenda() {
  const days = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
  const entries = state.week === 0 ? schedule.filter(item=>item.day===state.day) : []
  return `${pageHeading('Sua semana, por assunto', 'Técnico administrativo · Universidade Federal', button('Registrar estudo','register','button button-primary','plus'))}
    <div class="agenda-toolbar"><div><button class="icon-button" data-action="prev-week" aria-label="Semana anterior">${icon('left')}</button><h2>${weekTitle()}</h2><button class="icon-button" data-action="next-week" aria-label="Próxima semana">${icon('chevron')}</button></div>${button('Hoje','today','button button-small button-outline')}</div>
    <div class="agenda-columns"><section class="week-calendar" aria-label="Agenda semanal"><div class="week-day-labels"><span class="time-header">Horário</span>${days.map((day,i)=>`<button class="day-heading ${state.day===i?'active':''}" data-day="${i}" aria-pressed="${state.day===i}"><span>${day}</span><strong>${new Date(2026,9,12+state.week*7+i).getDate()}</strong></button>`).join('')}</div>
    <div class="week-grid"><div class="time-axis">${['08:00','10:00','12:00','14:00','16:00','18:00'].map(t=>`<span>${t}</span>`).join('')}</div>${days.map((_,day)=>`<div class="day-column ${day===state.day?'selected-day':''}">${state.week===0?schedule.filter(item=>item.day===day).map(item=>`<button class="calendar-event ${tasks[item.task].type==='Conteúdo novo'?'new-content':''}" style="top:${item.top}%" data-study="${item.task}"><time>${item.time}</time><strong>${tasks[item.task].subject}</strong><span>${tasks[item.task].topic}</span></button>`).join(''):''}</div>`).join('')}</div>
    <div class="agenda-mobile-list">${entries.length?entries.map(item=>`<button class="mobile-session" data-study="${item.task}"><time>${item.time}</time><span><strong>${tasks[item.task].subject}</strong><small>${tasks[item.task].topic}</small></span>${icon('play')}</button>`).join(''):'<p class="empty-note">Nenhuma sessão planejada para este dia.</p>'}</div>
    <div class="calendar-footer"><span><i class="legend-review"></i>Revisão</span><span><i class="legend-new"></i>Conteúdo novo</span><span>25 a 40 min por sessão</span></div></section>
    <aside class="agenda-aside"><h2>${['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'][state.day]}</h2><p class="subtle">${entries.length} sessões planejadas</p><div class="day-sessions">${entries.map(item=>`<button data-study="${item.task}"><time>${item.time}</time><strong>${tasks[item.task].topic}</strong><span>${tasks[item.task].subject}</span><small>${tasks[item.task].type} · ${tasks[item.task].duration} min</small></button>`).join('')||'<p class="empty-note">Deixe este dia livre ou registre uma sessão quando estudar.</p>'}</div><div class="week-total"><strong>3h 40min</strong><span>registradas nesta semana</span></div>${progress(220,300)}<p class="subtle">Sua meta é estudar 5 horas nesta semana.</p></aside></div>
    <section class="agenda-bottom"><div><h2>Revisões em dia</h2><p>Você revisou 9 dos 12 tópicos planejados nesta semana.</p></div>${progress(9,12)}<button class="text-button" data-screen="topicos">Consultar tópicos</button></section>`
}
function timerText() { return `${String(Math.floor(state.seconds/60)).padStart(2,'0')}:${String(state.seconds%60).padStart(2,'0')}` }
function currentStudy() { return state.boardTopic ? { ...tasks[state.selected], topic: state.boardTopic } : tasks[state.selected] }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
function dateFromKey(key) { const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12) }
function activityFor(date) {
  const key=dateKey(date)
  if(key>'2026-10-15')return {minutes:0,sessions:0}
  const seed=(date.getMonth()*31+date.getDate()+date.getFullYear())%17
  const sessions=seed%5===0||date.getDay()===0?0:seed%3+1
  return {sessions,minutes:sessions*(seed%2===0?25:30)}
}
function activityMap() {
  const start=state.activityYear==='recent'?new Date(2025,9,12,12):new Date(2025,0,1,12)
  start.setDate(start.getDate()-start.getDay())
  const end=state.activityYear==='recent'?new Date(2026,9,17,12):new Date(2026,0,3,12)
  const days=[]
  for(const date=new Date(start);date<=end;date.setDate(date.getDate()+1))days.push(new Date(date))
  const columns=Math.ceil(days.length/7), labels=new Map()
  days.forEach((date,index)=>{if(date.getDate()===1)labels.set(Math.floor(index/7),date.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''))})
  const studied=days.filter(date=>activityFor(date).sessions>0).length
  const selected=activityFor(dateFromKey(state.selectedDate))
  return `<section class="desk-section activity-section" id="atividade"><div class="desk-section-heading"><div><h2>Constância nos estudos</h2><p>${studied} dias com estudo registrado ${state.activityYear==='recent'?'nos últimos 12 meses':'em 2025'}.</p></div><label class="activity-period"><span class="sr-only">Período do mapa de atividade</span><select id="activity-year"><option value="recent" ${state.activityYear==='recent'?'selected':''}>Últimos 12 meses</option><option value="2025" ${state.activityYear==='2025'?'selected':''}>Ano de 2025</option></select></label></div>
    <div class="activity-scroll"><div class="activity-chart" style="--weeks:${columns}"><div class="activity-months">${Array.from({length:columns},(_,i)=>`<span>${labels.get(i)??''}</span>`).join('')}</div><div class="activity-day-labels"><span>Dom</span><span></span><span>Ter</span><span></span><span>Qui</span><span></span><span>Sáb</span></div><div class="activity-cells">${days.map(date=>{const value=activityFor(date),key=dateKey(date),level=value.sessions===0?0:value.sessions===1?1:value.sessions===2?2:value.minutes>=90?4:3;const label=`${date.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}: ${value.minutes} minutos em ${value.sessions} sessões`;return `<button class="activity-cell level-${level} ${key===state.selectedDate?'chosen':''} ${key>'2026-10-15'?'future-day':''}" data-activity-date="${key}" tabindex="${key===state.selectedDate||(state.activityYear==='2025'&&key==='2025-12-31')?0:-1}" title="${label}" aria-label="${label}"></button>`}).join('')}</div></div></div>
    <div class="activity-footer"><p id="activity-detail" aria-live="polite">${dateFromKey(state.selectedDate).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}: <strong>${selected.minutes} min</strong> em ${selected.sessions} ${selected.sessions===1?'sessão':'sessões'}.</p><div class="activity-legend"><span>Menos</span>${[0,1,2,3,4].map(level=>`<i class="level-${level}"></i>`).join('')}<span>Mais</span></div></div><p class="activity-hint">Deslize para ver todos os meses. Selecione um dia para consultar o calendário.</p></section>`
}
function calendarDays(year,month) {
  const first=new Date(year,month,1,12),offset=(first.getDay()+6)%7
  return Array.from({length:42},(_,i)=>new Date(year,month,1-offset+i,12))
}
function plansFor(date) {
  const day=(date.getDay()+6)%7
  return schedule.filter(item=>item.day===day)
}
function fullCalendar() {
  const selected=dateFromKey(state.selectedDate),entries=plansFor(selected)
  const title=state.calendarMode==='year'?String(state.calendarYear):new Date(state.calendarYear,state.calendarMonth,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
  const grid=state.calendarMode==='year'?`<div class="calendar-year-grid">${Array.from({length:12},(_,month)=>`<button class="year-month ${month===state.calendarMonth?'current-month':''}" data-calendar-month="${month}"><strong>${new Date(state.calendarYear,month,1).toLocaleDateString('pt-BR',{month:'long'})}</strong><span class="year-mini-days">${calendarDays(state.calendarYear,month).map(date=>`<span class="${date.getMonth()!==month?'off-month':''} ${dateKey(date)==='2026-10-15'?'mini-today':''}">${date.getDate()}</span>`).join('')}</span></button>`).join('')}</div>`:`<div class="full-calendar-grid"><div class="full-weekdays">${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(day=>`<span>${day}</span>`).join('')}</div><div class="full-month-days">${calendarDays(state.calendarYear,state.calendarMonth).map(date=>{const key=dateKey(date),count=plansFor(date).length;return `<button data-calendar-date="${key}" class="full-date ${date.getMonth()!==state.calendarMonth?'off-month':''} ${key===state.selectedDate?'selected':''} ${key==='2026-10-15'?'today':''}"><span>${date.getDate()}</span><span class="date-markers" aria-hidden="true">${Array.from({length:Math.min(count,3)},()=>'<i></i>').join('')}</span><span class="sr-only">${date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}, ${count} sessões previstas</span></button>`}).join('')}</div></div>`
  return `<section class="desk-section revision-calendar" id="calendario"><div class="desk-section-heading"><div><h2>Calendário de revisões</h2><p>Consulte os assuntos previstos para cada dia.</p></div><div class="calendar-mode" role="group" aria-label="Visão do calendário"><button data-calendar-mode="month" aria-pressed="${state.calendarMode==='month'}">Mês</button><button data-calendar-mode="year" aria-pressed="${state.calendarMode==='year'}">Ano</button></div></div><div class="full-calendar-toolbar"><button class="icon-button" data-action="calendar-prev" aria-label="Período anterior">${icon('left')}</button><h3>${title}</h3><button class="icon-button" data-action="calendar-next" aria-label="Próximo período">${icon('chevron')}</button><button class="text-button" data-action="calendar-today">Hoje</button></div>${grid}<div class="selected-day-sessions"><div class="section-title"><h3>${selected.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</h3><span>${entries.length} sessões previstas</span></div>${entries.length?entries.map(item=>`<button data-study="${item.task}"><time>${item.time}</time><span><strong>${tasks[item.task].topic}</strong><small>${tasks[item.task].subject}</small></span>${icon('play')}</button>`).join(''):'<p class="subtle">Nenhuma sessão prevista. Você pode usar este dia para descansar ou registrar um estudo.</p>'}</div></section>`
}
function studyGoals() {
  return `<aside class="desk-section study-goals"><div class="desk-section-heading"><div><h2>Metas da semana</h2><p>12 a 18 de outubro</p></div>${icon('clock')}</div><div class="goal-item"><div><h3>Tempo de estudo</h3><strong>3h 40 <span>/ 5h</span></strong></div>${progress(220,300)}<p>Falta 1h 20 para a meta.</p></div><div class="goal-item"><div><h3>Questões resolvidas</h3><strong>76 <span>/ 100</span></strong></div>${progress(76,100)}<p>24 questões até sua meta.</p></div><div class="goal-item"><div><h3>Revisões da semana</h3><strong>9 <span>/ 12</span></strong></div>${progress(9,12)}<p>3 revisões previstas para hoje.</p></div><div class="goal-activity"><h3>Tempo por dia</h3>${weekBars()}</div><button class="text-button" data-screen="configurar">Ajustar minha rotina</button></aside>`
}
function revisionBoard() {
  const cards=[
    {id:'late-1',task:2,status:'late',date:'13 out',topic:'Direitos fundamentais',note:'Revisão de 14 dias'},
    {id:'late-2',task:3,status:'late',date:'14 out',topic:'Redes de computadores',note:'Revisão de 3 dias'},
    {id:'today-1',task:0,status:'today',date:'Hoje',topic:'Concordância verbal',note:'Revisão de 7 dias'},
    {id:'today-2',task:2,status:'today',date:'Hoje',topic:'Organização do Estado',note:'Revisão de 30 dias'},
    {id:'new-1',task:1,status:'new',date:'Sem revisão anterior',topic:'Atos administrativos',note:'Primeiro estudo'},
    {id:'new-2',task:3,status:'new',date:'Sem revisão anterior',topic:'Sistemas operacionais',note:'Primeiro estudo'},
    {id:'next-1',task:0,status:'next',date:'18 out',topic:'Interpretação de texto',note:'Revisão de 7 dias'},
    {id:'next-2',task:1,status:'next',date:'19 out',topic:'Princípios da administração',note:'Revisão de 14 dias'},
  ].map(card=>(state.boardCompleted.has(card.id)||(state.completed.has(card.task)&&card.topic===tasks[card.task].topic))&&card.status!=='next'?{...card,status:'next',date:'22 out',note:'Estudo registrado nesta demonstração'}:card).filter(card=>!state.boardSubject||tasks[card.task].subject===state.boardSubject)
  const groups=[['late','Atrasadas','Retome estas revisões primeiro.'],['today','Para hoje','Revisões previstas para hoje.'],['new','Conteúdo novo','Assuntos que ainda não estudou.'],['next','Próximas revisões','Agendadas pelo ciclo de revisão.']]
  return `<section class="desk-section revision-board" id="cronograma"><div class="desk-section-heading"><div><h2>Quadro de revisões</h2><p>Comece pelas atrasadas, depois pelas de hoje e pelo conteúdo novo.</p></div><label class="activity-period"><span class="sr-only">Filtrar quadro por matéria</span><select id="board-subject"><option value="">Todas as matérias</option>${subjects.map(subject=>`<option ${state.boardSubject===subject.name?'selected':''}>${subject.name}</option>`).join('')}</select></label></div><div class="kanban-grid">${groups.map(([status,name,description])=>{const items=cards.filter(card=>card.status===status);return `<section class="kanban-column ${status}"><header><h3>${name}</h3><span>${items.length}</span></header><p class="column-description">${description}</p><div class="kanban-cards">${items.map(card=>`<article class="kanban-card"><div class="kanban-card-meta"><span>${tasks[card.task].subject}</span><time>${card.date}</time></div><h4>${card.topic}</h4><p>${card.note}</p><div class="kanban-card-footer"><span>${tasks[card.task].duration} min</span><button class="text-button" data-board-topic="${escapeHtml(card.topic)}" data-board-id="${card.id}" data-board-task="${card.task}">${status==='next'?'Consultar sessão':'Estudar'}</button></div></article>`).join('')||'<p class="kanban-empty">Nenhum tópico nesta coluna.</p>'}</div></section>`}).join('')}</div><p class="board-note">As colunas acompanham as datas de revisão. Ao registrar um estudo, a próxima revisão aparece no cronograma.</p></section>`
}
function mesa() {
  const task = currentStudy()
  return `${pageHeading('Mesa de estudo', 'Técnico administrativo · Universidade Federal', '<span class="focus-date">Quinta, 15 de outubro</span>')}
    <nav class="desk-shortcuts" aria-label="Seções da mesa de estudo"><a href="#sessao">Sessão de foco</a><a href="#atividade">Constância</a><a href="#calendario">Calendário</a><a href="#cronograma">Quadro de revisões</a><a href="#historico">Histórico</a></nav><div id="sessao" class="section-anchor"></div>
    <div class="desk-columns"><section class="focus-workspace"><div class="focus-topic"><span>${icon('book')}${task.subject}</span><span class="focus-marker">${task.type}</span></div><h2>${task.topic}</h2><p>${task.detail}</p><div class="timer-zone"><p>Tempo de foco</p><div class="timer-value" aria-live="off">${timerText()}</div><div class="duration-options" role="group" aria-label="Duração da sessão">${[25,40,50].map(m=>`<button data-duration="${m}" aria-pressed="${state.seconds===m*60}">${m} min</button>`).join('')}</div></div><div class="focus-controls">${button(state.running?'Pausar sessão':'Iniciar sessão','toggle-timer','button button-focus',state.running?'pause':'play')}${button('Concluir estudo','register','button button-on-dark')}</div><div class="focus-footnote"><span>${task.questions} questões sugeridas</span><span>Conteúdo do edital, item 2.${state.selected+1}</span></div></section>
    <aside class="desk-queue"><div class="section-title"><h2>Fila de hoje</h2><span>${tasks.length-state.completed.size} pendentes</span></div>${tasks.map((item,index)=>`<button class="queue-item ${state.selected===index?'selected':''}" data-select="${index}"><span class="queue-number">${state.completed.has(index)?icon('check'):index+1}</span><div><small>${item.subject}</small><strong>${item.topic}</strong><span>${item.duration} min · ${item.type}</span></div></button>`).join('')}<div class="desk-plan"><h3>Seu edital</h3><div><strong>28 <span>/ 84 tópicos</span></strong><span>33%</span></div>${progress(28,84)}<button class="text-button" data-screen="topicos">Ver conteúdo completo</button></div></aside></div>
    ${activityMap()}<div class="desk-calendar-columns">${fullCalendar()}${studyGoals()}</div>${revisionBoard()}
    <section class="section recent-sessions" id="historico"><div class="section-title"><h2>Estudos recentes</h2>${button('Registrar estudo','register','text-button','plus')}</div><div class="table-scroll"><table><thead><tr><th>Quando</th><th>Assunto</th><th>Atividade</th><th>Tempo</th><th>Acertos</th></tr></thead><tbody><tr><td>Hoje, 09:00</td><td><strong>Interpretação de texto</strong><span>Língua portuguesa</span></td><td>Revisão</td><td>25 min</td><td>17 de 20</td></tr><tr><td>Ontem, 14:30</td><td><strong>Princípios da administração</strong><span>Direito administrativo</span></td><td>Questões</td><td>40 min</td><td>12 de 15</td></tr><tr><td>Terça, 10:00</td><td><strong>Organização do Estado</strong><span>Direito constitucional</span></td><td>Leitura e questões</td><td>30 min</td><td>14 de 20</td></tr></tbody></table></div></section>`
}
function editais() {
  return `${pageHeading('Seus editais', 'Escolha o plano que organiza seus estudos.',button('Importar edital','import','button button-primary','plus'))}<section class="active-notice"><div class="notice-file">${icon('file')}</div><div><span class="status-label">Plano ativo</span><h2>Técnico administrativo</h2><p>Universidade Federal · Edital 02/2026</p><p class="subtle">Prova em 20 de novembro de 2026</p></div><div class="notice-progress"><strong>28 de 84 tópicos</strong>${progress(28,84)}<span>4 matérias no plano</span></div><button class="button button-outline" data-screen="topicos">Abrir conteúdo</button></section><section class="section"><div class="section-title"><h2>Outros planos</h2><span>2 editais</span></div><div class="notice-row"><div>${icon('file')}<div><h3>Assistente em administração</h3><p>Instituto Federal · Importado em 28 de setembro</p></div></div><span class="status-label status-neutral">Em revisão</span><button class="text-button" data-action="review-notice">Revisar conteúdo</button></div><div class="notice-row"><div>${icon('file')}<div><h3>Técnico judiciário</h3><p>Tribunal Regional · Importado em 10 de agosto</p></div></div><span class="status-label status-neutral">Arquivado</span><button class="text-button" data-action="archive-notice">Consultar</button></div></section><div class="help-note">${icon('book')}<p>Ao ativar outro edital, seu histórico de estudos continua salvo no plano anterior.</p></div>`
}
function filteredTopics() {
  return subjects.flatMap((subject,s)=>subject.topics.map((topic,t)=>({subject,topic,s,t}))).filter(item=>(!state.subject||item.subject.name===state.subject)&&(!state.query||`${item.topic} ${item.subject.name}`.toLocaleLowerCase('pt-BR').includes(state.query.toLocaleLowerCase('pt-BR'))))
}
function topicTableRows() {
  const rows = filteredTopics()
  return rows.length ? rows.map(({subject,topic,s,t})=>`<tr><td><strong>${topic}</strong><span>${subject.name}</span></td><td><span class="status-label ${t===1?'status-due':'status-neutral'}">${t===1?'Revisar hoje':t===0?'Em dia':'Não estudado'}</span></td><td>${t===2?'Sem questões':`${subject.accuracy}%`}</td><td>${t===1?'Hoje':t===0?'19 de outubro':'Após estudar'}</td><td><button class="text-button" data-study="${s}">${t===2?'Estudar':'Revisar'}</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty-note">Nenhum tópico encontrado. Tente outro termo ou matéria.</td></tr>'
}
function topicos() {
  return `${pageHeading('Conteúdo do edital', 'Técnico administrativo · 4 matérias e 84 tópicos',button('Registrar estudo','register','button button-outline','plus'))}<div class="topic-toolbar"><label class="search-field">${icon('search')}<input id="topic-search" type="search" placeholder="Buscar tópico ou matéria" aria-label="Buscar tópico ou matéria" value="${escapeHtml(state.query)}"></label><label class="select-field"><span>Matéria</span><select id="subject-filter"><option value="">Todas as matérias</option>${subjects.map(subject=>`<option ${state.subject===subject.name?'selected':''}>${subject.name}</option>`).join('')}</select></label><span class="topic-count" id="topic-count">${filteredTopics().length} tópicos na amostra</span></div><div class="topic-summary"><span><strong>28</strong> estudados</span><span><strong>3</strong> revisões para hoje</span><span><strong>76%</strong> de acertos no plano</span></div><section class="table-surface"><div class="table-scroll"><table class="topics-table"><thead><tr><th>Tópico</th><th>Situação</th><th>Acertos</th><th>Próxima revisão</th><th><span class="sr-only">Ação</span></th></tr></thead><tbody id="topic-rows">${topicTableRows()}</tbody></table></div></section>`
}
function usuarios() {
  return `${pageHeading('Usuários', 'Crie acessos para outras pessoas. Cada conta mantém seus próprios estudos.')}<div class="admin-columns"><section class="form-surface"><h2>Nova conta</h2><p class="subtle">A pessoa escolhe uma nova senha no primeiro acesso.</p><form id="user-form"><label>E-mail<input type="email" name="email" required placeholder="pessoa@exemplo.com" autocomplete="off"></label><button class="button button-primary" type="submit">Criar conta e gerar mensagem</button><p class="form-note">Demonstração. Nenhum acesso real será criado.</p></form></section><section class="user-list"><div class="section-title"><h2>Contas cadastradas</h2><span>${state.users.length} pessoas</span></div>${state.users.map(user=>`<div class="user-row"><span class="avatar">${escapeHtml(user.email.slice(0,2).toUpperCase())}</span><div><strong>${escapeHtml(user.email)}</strong><span>${user.role}</span></div>${icon('check')}</div>`).join('')}<div class="help-note">${icon('users')}<p>Somente administradores podem criar contas. O cadastro público está desabilitado.</p></div></section></div>`
}
function configurar() {
  return `${pageHeading('Sua rotina de estudos', 'Defina um ritmo que caiba na sua semana.')}<form id="settings-form" class="settings-form"><section class="form-surface"><h2>Disponibilidade</h2><p class="subtle">Quantas horas você pretende estudar em cada dia?</p><div class="availability">${['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map((day,i)=>`<label>${day}<input aria-label="Horas na ${day}" name="day-${i}" type="number" min="0" max="24" step="0.5" value="${i<5?1:0}"><span>horas</span></label>`).join('')}</div></section><section class="form-surface settings-goals"><h2>Metas da semana</h2><label>Questões por semana<input name="questions" type="number" min="0" value="100"></label><label>Tempo de estudo<input name="hours" type="number" min="0" max="168" value="5"><span class="subtle">horas por semana</span></label></section><button class="button button-primary" type="submit">Salvar rotina de demonstração</button></form>`
}
function render() {
  app.dataset.theme = state.layout
  app.innerHTML = frame(state.screen==='painel'?({biblioteca,agenda,mesa})[state.layout]():({editais,topicos,usuarios,configurar})[state.screen]())
  document.querySelectorAll('[data-layout]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.layout===state.layout)))
  const query = new URLSearchParams({layout:state.layout,tela:state.screen})
  history.replaceState(null,'',`${location.pathname}?${query}${location.hash}`)
  document.title = `Studia | ${names[state.layout]} | ${state.screen}`
}
function showDialog(content, className = '') {
  dialog.dataset.theme=state.layout
  $('#dialog-content').innerHTML = `<button class="dialog-close icon-button" data-action="close" aria-label="Fechar janela">${icon('close')}</button>${content}`
  dialog.className = className
  if (!dialog.open) dialog.showModal()
}
function focusDialog() {
  const task = currentStudy()
  showDialog(`<span class="section-label">Sessão de estudo</span><h2>${task.topic}</h2><p>${task.subject}</p><div class="dialog-timer timer-value">${timerText()}</div><div class="dialog-actions">${button(state.running?'Pausar sessão':'Iniciar sessão','toggle-timer','button button-primary',state.running?'pause':'play')}${button('Registrar resultado','register','button button-outline')}</div><p class="form-note">O cronômetro é demonstrativo e não salva uma sessão real.</p>`)
}
function about() {
  showDialog(`<h2>Três formas de organizar o mesmo estudo</h2><p class="subtle">Compare a navegação, a leitura e a prioridade das informações.</p><div class="concept-list"><article><h3>Biblioteca</h3><p>Lista de estudos, índice por matéria e navegação lateral. Boa para consultar o edital e revisar sem perder o contexto.</p><button class="text-button" data-layout="biblioteca">Explorar Biblioteca</button></article><article><h3>Agenda</h3><p>A semana ocupa o centro. Boa para distribuir sessões nos dias disponíveis e entender o que vem depois.</p><button class="text-button" data-layout="agenda">Explorar Agenda</button></article><article><h3>Mesa de estudo</h3><p>Uma sessão em destaque, com cronômetro e fila de assuntos. Boa para manter o site aberto durante o estudo.</p><button class="text-button" data-layout="mesa">Explorar Mesa de estudo</button></article></div><p class="form-note">Todas as propostas incluem editais, tópicos, administração de contas e configurações. Nenhuma foi aplicada ao site em uso.</p>`, 'about-dialog')
}
function registerDialog() {
  showDialog(`<h2>Registrar estudo</h2><p class="subtle">${tasks[state.selected].subject}: ${currentStudy().topic}</p><form id="session-form"><label>Tempo estudado, em minutos<input type="number" min="1" max="720" name="minutes" value="${tasks[state.selected].duration}" required></label><div class="form-pair"><label>Acertos<input type="number" name="correct" min="0" value="15" required></label><label>Erros<input type="number" name="wrong" min="0" value="5" required></label></div><button type="submit" class="button button-primary">Registrar nesta demonstração</button></form>`)
}
document.addEventListener('click', event => {
  const target = event.target.closest('button')
  if (!target) return
  if (target.dataset.layout) { state.layout=target.dataset.layout; if(dialog.open)dialog.close(); render(); return }
  if (target.dataset.screen) { state.screen=target.dataset.screen; render(); $('#workspace').focus({preventScroll:true}); window.scrollTo({top:0}); return }
  if (target.dataset.boardTopic) { state.selected=Number(target.dataset.boardTask);state.boardTopic=target.dataset.boardTopic;state.activeBoardId=target.dataset.boardId;state.running=false;state.seconds=tasks[state.selected].duration*60;focusDialog();return }
  if (target.dataset.activityDate) { const date=dateFromKey(target.dataset.activityDate);state.selectedDate=target.dataset.activityDate;state.calendarYear=date.getFullYear();state.calendarMonth=date.getMonth();state.calendarMode='month';const scroll=window.scrollY;render();window.scrollTo({top:scroll});return }
  if (target.dataset.calendarDate) { state.selectedDate=target.dataset.calendarDate;render();return }
  if (target.dataset.calendarMonth!==undefined) { state.calendarMonth=Number(target.dataset.calendarMonth);state.calendarMode='month';render();return }
  if (target.dataset.calendarMode) { state.calendarMode=target.dataset.calendarMode;render();return }
  if (target.dataset.complete !== undefined) { const index=Number(target.dataset.complete); state.completed.has(index)?state.completed.delete(index):state.completed.add(index); render(); return }
  if (target.dataset.study !== undefined) { state.boardTopic='';state.activeBoardId=null;state.selected=Number(target.dataset.study); state.seconds=tasks[state.selected].duration*60; state.running=false; focusDialog(); return }
  if (target.dataset.select !== undefined) { state.boardTopic='';state.activeBoardId=null;state.selected=Number(target.dataset.select); state.seconds=tasks[state.selected].duration*60; state.running=false; render(); return }
  if (target.dataset.subject !== undefined) { state.subject=subjects[Number(target.dataset.subject)].name; state.screen='topicos'; render(); return }
  if (target.dataset.day !== undefined) { state.day=Number(target.dataset.day); render(); return }
  if (target.dataset.duration) { state.seconds=Number(target.dataset.duration)*60; state.running=false; render(); return }
  const action=target.dataset.action
  if (action==='close') dialog.close()
  if (action==='calendar-prev'||action==='calendar-next') { const step=action==='calendar-next'?1:-1;if(state.calendarMode==='year')state.calendarYear+=step;else{const date=new Date(state.calendarYear,state.calendarMonth+step,1);state.calendarYear=date.getFullYear();state.calendarMonth=date.getMonth()}render() }
  if (action==='calendar-today') {state.calendarYear=2026;state.calendarMonth=9;state.selectedDate='2026-10-15';state.calendarMode='month';render()}
  if (action==='focus') focusDialog()
  if (action==='toggle-timer') { state.running=!state.running; if(dialog.open)focusDialog(); else render() }
  if (action==='register') registerDialog()
  if (action==='prev-week'||action==='next-week') { state.week+=action==='next-week'?1:-1; render() }
  if (action==='today') { state.week=0;state.day=3;render() }
  if (action==='show-agenda') { state.layout='agenda';render() }
  if (action==='notifications') showDialog(`<h2>Seus lembretes</h2><p>Há 3 revisões previstas para hoje.</p><div class="reminder-list">${tasks.filter(task=>task.type!=='Conteúdo novo').map(task=>`<p><strong>${task.topic}</strong><span>${task.subject}</span></p>`).join('')}</div>${button('Ver tópicos','open-topics','button button-primary')}`)
  if (action==='open-topics'||action==='review-notice') { dialog.close();state.screen='topicos';state.subject='';render() }
  if (action==='archive-notice') showDialog(`<h2>Técnico judiciário</h2><p>Plano arquivado, com 42 tópicos estudados e 18 sessões registradas.</p><p class="subtle">O histórico continua disponível. Esta é uma amostra visual do arquivo.</p>`)
  if (action==='import') showDialog(`<h2>Importar edital</h2><p class="subtle">Prévia do formulário. O arquivo não será enviado a nenhum servidor.</p><form id="import-form"><label>Nome do plano<input name="title" required placeholder="Ex.: Técnico administrativo"></label><label>Arquivo PDF<input name="file" type="file" accept="application/pdf"></label><button type="submit" class="button button-primary">Visualizar próximo passo</button></form>`)
  if (action==='copy-invitation') {
    navigator.clipboard.writeText(state.invitation).then(()=>toast('Mensagem copiada. Este acesso é fictício.')).catch(()=>toast('Selecione a mensagem e copie manualmente.'))
  }
})
$('#about-button').addEventListener('click',about)
dialog.addEventListener('click', event=>{ if(event.target===dialog && (event.clientX<dialog.getBoundingClientRect().left||event.clientX>dialog.getBoundingClientRect().right||event.clientY<dialog.getBoundingClientRect().top||event.clientY>dialog.getBoundingClientRect().bottom)) dialog.close() })
document.addEventListener('input', event=>{
  if(event.target.id==='topic-search') { state.query=event.target.value;$('#topic-rows').innerHTML=topicTableRows();$('#topic-count').textContent=`${filteredTopics().length} tópicos na amostra` }
})
document.addEventListener('change',event=>{
  if(event.target.id==='subject-filter'){state.subject=event.target.value;$('#topic-rows').innerHTML=topicTableRows();$('#topic-count').textContent=`${filteredTopics().length} tópicos na amostra`}
  if(event.target.id==='activity-year'){state.activityYear=event.target.value;if(state.activityYear==='2025')state.selectedDate='2025-12-31';render()}
  if(event.target.id==='board-subject'){state.boardSubject=event.target.value;render()}
})
document.addEventListener('keydown',event=>{
  if(!event.target.matches('.activity-cell'))return
  const delta={ArrowUp:-1,ArrowDown:1,ArrowLeft:-7,ArrowRight:7}[event.key]
  if(delta===undefined)return
  event.preventDefault();const cells=Array.from(document.querySelectorAll('.activity-cell')),index=cells.indexOf(event.target),next=cells[index+delta]
  if(next){event.target.tabIndex=-1;next.tabIndex=0;next.focus()}
})
document.addEventListener('submit',event=>{
  event.preventDefault()
  const data=new FormData(event.target)
  if(event.target.id==='session-form') { if(state.activeBoardId)state.boardCompleted.add(state.activeBoardId);if(!state.activeBoardId||state.boardTopic===tasks[state.selected].topic)state.completed.add(state.selected);state.running=false;dialog.close();render();toast(`${data.get('minutes')} minutos registrados na demonstração.`) }
  if(event.target.id==='settings-form') toast('Rotina atualizada apenas nesta demonstração.')
  if(event.target.id==='import-form') showDialog(`<h2>Revisar conteúdo extraído</h2><p><strong>${escapeHtml(data.get('title'))}</strong></p><p class="subtle">Na aplicação, esta etapa permite conferir as matérias e os tópicos antes de ativar o plano.</p>${button('Ver exemplo de tópicos','open-topics','button button-primary')}`)
  if(event.target.id==='user-form') {
    const email=String(data.get('email')).trim().toLowerCase()
    if(state.users.some(user=>user.email===email)){toast('Este e-mail já está na lista de demonstração.');return}
    state.users.push({email,role:'Aguardando troca de senha'})
    const random=crypto.getRandomValues(new Uint8Array(8));const password=Array.from(random,byte=>byte.toString(16).padStart(2,'0')).join('')+'Aa1!'
    state.invitation=`Exemplo de mensagem, sem acesso real.\n\nOlá! Sua conta no Studia está pronta.\nAcesso: https://studia.exemplo/entrar\nLogin: ${email}\nSenha temporária: ${password}\n\nNo primeiro acesso, escolha uma nova senha.`
    render();showDialog(`<h2>Mensagem de acesso</h2><p class="subtle">Exemplo para copiar e enviar. Nenhuma conta real foi criada.</p><textarea readonly rows="9" aria-label="Mensagem de acesso fictícia">${escapeHtml(state.invitation)}</textarea>${button('Copiar mensagem','copy-invitation','button button-primary','copy')}`)
  }
})
setInterval(()=>{
  if(!state.running)return
  if(state.seconds>0)state.seconds--
  document.querySelectorAll('.timer-value').forEach(element=>element.textContent=timerText())
  if(state.seconds===0){state.running=false;toast('Tempo de foco concluído. Registre seu estudo.');if(dialog.open)focusDialog();else render()}
},1000)
render()
