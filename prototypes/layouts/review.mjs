// Revisão visual local com Edge/Chrome isolado em CDP 9225. Sem dependências.
import assert from 'node:assert/strict'
import { lookup } from 'node:dns/promises'
import { mkdirSync, writeFileSync } from 'node:fs'

const { address } = await lookup('host.docker.internal', { family: 4 })
const pages = await (await fetch(`http://${address}:9225/json/list`)).json()
const page = pages.find(page => page.type === 'page')
assert.ok(page)
const socket = new WebSocket(page.webSocketDebuggerUrl.replace('localhost','host.docker.internal').replace('127.0.0.1','host.docker.internal'))
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
let sequence = 0
const pending = new Map(), errors = []
socket.addEventListener('message', ({data})=>{
  const message=JSON.parse(data)
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text)
  if(!message.id)return
  const handler=pending.get(message.id)
  pending.delete(message.id)
  if(message.error)handler.reject(new Error(message.error.message))
  else handler.resolve(message.result)
})
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value}
async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Estado não encontrado: '+expression)}
async function navigate(layout,screen='painel'){
  await command('Page.navigate',{url:`http://127.0.0.1:8091/?layout=${layout}&tela=${screen}`})
  await wait(`document.querySelector('#app')?.dataset.theme === '${layout}' && !!document.querySelector('#workspace h1') && document.title.endsWith('${screen}')`)
  await evaluate('document.fonts.ready')
}
async function screenshot(name){
  const {contentSize}=await command('Page.getLayoutMetrics')
  const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:contentSize.width,height:contentSize.height,scale:1}})
  writeFileSync('/prototype/dist/previews/'+name+'.png',Buffer.from(result.data,'base64'))
}
try{
  await command('Page.enable');await command('Runtime.enable')
  mkdirSync('/prototype/dist/previews',{recursive:true})
  for(const [width,height,label] of [[1440,1100,'desktop'],[390,844,'mobile']]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    for(const layout of ['biblioteca','agenda','mesa']){
      for(const screen of ['painel','editais','topicos','usuarios','configurar']){
        await navigate(layout,screen)
        const overflow=await evaluate('document.documentElement.scrollWidth > innerWidth + 1')
        assert.equal(overflow,false,`${layout}/${screen}/${label}: vazamento horizontal`)
        const unnamed=await evaluate(`Array.from(document.querySelectorAll('button')).filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length`)
        assert.equal(unnamed,0,`${layout}/${screen}: botão sem nome`)
        if(screen==='painel')await screenshot(`${layout}-${label}`)
      }
    }
  }
  await navigate('biblioteca','topicos')
  await evaluate(`(() => { const field=document.querySelector('#topic-search');field.value='concordância';field.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  assert.equal(await evaluate(`document.querySelectorAll('#topic-rows tr').length`),1)
  assert.ok(await evaluate(`document.querySelector('#topic-rows').textContent.includes('Concordância verbal')`))
  await navigate('biblioteca')
  await evaluate(`document.querySelector('[data-complete="0"]').click()`)
  assert.ok(await evaluate(`document.querySelector('[data-complete="0"]').getAttribute('aria-pressed')==='true'`))
  await evaluate(`document.querySelector('[data-study="1"]').click()`)
  await wait(`document.querySelector('dialog').open`)
  await evaluate(`document.querySelector('dialog [data-action="toggle-timer"]').click()`)
  const initial=await evaluate(`document.querySelector('dialog .timer-value').textContent`)
  await new Promise(resolve=>setTimeout(resolve,1200))
  assert.notEqual(await evaluate(`document.querySelector('dialog .timer-value').textContent`),initial)
  await evaluate(`document.querySelector('dialog [data-action="register"]').click();document.querySelector('#session-form').requestSubmit()`)
  assert.equal(await evaluate(`document.querySelector('dialog').open`),false)
  await navigate('agenda')
  await evaluate(`document.querySelector('[data-day="0"]').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('.agenda-mobile-list .mobile-session').length`),1)
  await evaluate(`document.querySelector('[data-action="next-week"]').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('.calendar-event').length`),0)
  await navigate('mesa','usuarios')
  await evaluate(`document.querySelector('#user-form input').value='amostra@example.com';document.querySelector('#user-form').requestSubmit()`)
  assert.ok(await evaluate(`document.querySelector('dialog textarea').value.includes('amostra@example.com')`))
  await navigate('mesa')
  assert.ok(await evaluate(`document.querySelectorAll('.activity-cell').length >= 365`))
  await evaluate(`document.querySelector('[data-activity-date="2026-09-15"]').click()`)
  assert.ok(await evaluate(`document.querySelector('.full-calendar-toolbar h3').textContent.includes('setembro')`))
  await evaluate(`document.querySelector('[data-calendar-mode="year"]').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('.year-month').length`),12)
  await evaluate(`document.querySelector('[data-calendar-month="10"]').click()`)
  assert.ok(await evaluate(`document.querySelector('.full-calendar-toolbar h3').textContent.includes('novembro')`))
  await evaluate(`document.querySelector('[data-action="calendar-today"]').click();document.querySelector('[data-calendar-date="2026-10-16"]').click()`)
  assert.ok(await evaluate(`document.querySelector('.selected-day-sessions h3').textContent.includes('16')`))
  await evaluate(`document.querySelector('#activity-year').value='2025';document.querySelector('#activity-year').dispatchEvent(new Event('change',{bubbles:true}))`)
  assert.ok(await evaluate(`document.querySelector('#activity-detail').textContent.includes('2025')`))
  await navigate('mesa')
  assert.equal(await evaluate(`document.querySelectorAll('.kanban-column').length`),4)
  await evaluate(`document.querySelector('#board-subject').value='Direito constitucional';document.querySelector('#board-subject').dispatchEvent(new Event('change',{bubbles:true}))`)
  assert.equal(await evaluate(`document.querySelectorAll('.kanban-card').length`),2)
  await evaluate(`document.querySelector('[data-board-id="today-2"]').click()`)
  assert.equal(await evaluate(`document.querySelector('dialog h2').textContent`),'Organização do Estado')
  await evaluate(`document.querySelector('dialog [data-action="register"]').click()`)
  assert.ok(await evaluate(`document.querySelector('dialog').textContent.includes('Organização do Estado')`))
  await evaluate(`document.querySelector('#session-form').requestSubmit()`)
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('.kanban-column.next h4')).some(heading=>heading.textContent==='Organização do Estado')`))
  await navigate('mesa')
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false})
  await navigate('mesa')
  const planning=await evaluate(`(() => { const first=document.querySelector('#atividade').getBoundingClientRect(),last=document.querySelector('#cronograma').getBoundingClientRect();return {x:first.left,y:first.top+scrollY,width:last.right-first.left,height:last.bottom-first.top};})()`)
  const planningCapture=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...planning,scale:1}})
  writeFileSync('/prototype/dist/previews/mesa-planejamento-desktop.png',Buffer.from(planningCapture.data,'base64'))
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await navigate('mesa')
  const calendarRect=await evaluate(`(() => {const rect=document.querySelector('#calendario').getBoundingClientRect();return {x:rect.left,y:rect.top+scrollY,width:rect.width,height:rect.height}})()`)
  const calendarCapture=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...calendarRect,scale:1}})
  writeFileSync('/prototype/dist/previews/mesa-calendario-mobile.png',Buffer.from(calendarCapture.data,'base64'))
  await command('Page.navigate',{url:'file:///C:/dev/studia/prototypes/layouts/studia-layouts.html?layout=mesa&tela=usuarios'})
  await wait(`document.title.endsWith('usuarios') && document.querySelector('#app')?.dataset.theme === 'mesa'`)
  await evaluate(`document.querySelector('[data-layout="agenda"]').click()`)
  assert.equal(await evaluate(`document.querySelector('#app').dataset.theme`),'agenda')
  await command('Emulation.setDeviceMetricsOverride',{width:1600,height:900,deviceScaleFactor:1,mobile:false})
  await command('Page.navigate',{url:'http://127.0.0.1:8091/comparar.html'})
  await wait(`document.title === 'Studia | Comparar layouts' && document.querySelectorAll('img').length === 3 && Array.from(document.images).every(img=>img.complete && img.naturalWidth>0)`)
  await screenshot('comparacao')
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('OK: 30 combinações de tela e viewport; atividade anual, calendário mês/ano, filtro do Kanban, reagendamento da revisão, cronômetro, convite e HTML sem servidor. Nove capturas geradas.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
