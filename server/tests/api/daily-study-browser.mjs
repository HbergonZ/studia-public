// Requer a fixture admin-users e navegador isolado em CDP 9224.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'

const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json','utf8'))
const browserBase = process.env.BROWSER_BASE_URL ?? 'http://127.0.0.1:8092'
const apiBase = process.env.TEST_BASE_URL ?? 'http://host.docker.internal:8092'
const cookies = new Map(); let csrf = ''
async function api(path,method='GET',body,expected=200){
  const response=await fetch(apiBase+'/api'+path,{method,headers:{'Content-Type':'application/json','X-CSRF-TOKEN':csrf,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:body===undefined?undefined:JSON.stringify(body)})
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}
  const result=await response.json()
  if(response.headers.has('X-CSRF-TOKEN'))csrf=response.headers.get('X-CSRF-TOKEN')
  if(result.user?.csrfToken)csrf=result.user.csrfToken
  assert.equal(response.status,expected,`${method} ${path}`)
  return result
}
await api('/auth/login','POST',{email:fixture.email,password:fixture.password})
const notice=await api('/v1/editais','POST',{title:'Concurso de teste visual da Mesa',source:'manual'},201)
const definitions=[['Língua portuguesa',['Concordância verbal','Interpretação de texto','Regência e crase']],['Direito administrativo',['Atos administrativos','Princípios da administração','Licitações e contratos']],['Direito constitucional',['Direitos fundamentais','Organização do Estado','Poderes da União']],['Informática',['Redes de computadores','Sistemas operacionais','Segurança da informação']]]
const topics=[]
for(const [index,[name,items]] of definitions.entries()){
  const subject=await api(`/v1/editais/${notice.id}/materias`,'POST',{name,weight:7-index,color:index+1},201)
  for(const name of items){const topic=await api(`/v1/materias/${subject.id}/topicos`,'POST',{name,difficulty:5},201);topics.push(topic.id)}
}
await api(`/v1/editais/${notice.id}/ativar`,'POST')
await api('/v1/configuracao','PUT',{availability:Object.fromEntries(Array.from({length:7},(_,i)=>[i,0])),block_minutes:25,break_minutes:5})

const {address}=await lookup('host.docker.internal',{family:4})
const pages=await(await fetch(`http://${address}:9224/json/list`)).json()
const page=pages.find(page=>page.type==='page')
const socket=new WebSocket(page.webSocketDebuggerUrl.replace('localhost','host.docker.internal').replace('127.0.0.1','host.docker.internal'))
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
let sequence=0
const pending=new Map(),errors=[],responses=[]
socket.addEventListener('message',({data})=>{
  const message=JSON.parse(data)
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text)
  if(message.method==='Network.responseReceived')responses.push({url:message.params.response.url,status:message.params.response.status})
  if(!message.id)return
  const handler=pending.get(message.id);pending.delete(message.id)
  if(message.error)handler.reject(new Error(message.error.message));else handler.resolve(message.result)
})
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value}
async function wait(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Estado não encontrado: '+expression)}
async function navigate(path,title){await command('Page.navigate',{url:browserBase+path});await wait(`location.pathname===${JSON.stringify(path)} && document.querySelector('#conteudo h1')?.textContent===${JSON.stringify(title)}`)}
async function fill(selector,value){await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`)}
async function capture(name){const {contentSize}=await command('Page.getLayoutMetrics');const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:contentSize.width,height:Math.min(contentSize.height,2100),scale:1}});writeFileSync('/fixtures/testing/layout-qa/'+name+'.png',Buffer.from(result.data,'base64'))}
async function button(text,root='document'){await evaluate(`Array.from(${root}.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`)}
async function ready(){await wait(`!!document.querySelector('.daily-plan') && !document.querySelector('.study-loading')`)}
async function reload(){await evaluate(`document.documentElement.dataset.reloading='true'`);await command('Page.navigate',{url:browserBase+'/'});await wait(`!document.documentElement.dataset.reloading && document.querySelector('#conteudo h1')?.textContent==='Hoje'`);await ready()}
async function idle(){await wait(`!Array.from(document.querySelectorAll('.daily-plan button')).some(b=>b.textContent.includes('Salvando')) && !document.querySelector('.daily-edit-form')`)}
try{
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.enable');await command('Network.clearBrowserCookies')
  await command('Page.navigate',{url:browserBase+'/entrar'})
  await wait(`document.querySelector('h1')?.textContent==='Entrar'`)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await wait(`document.querySelector('#conteudo h1')?.textContent==='Hoje'`)
  assert.ok(await evaluate(`document.body.textContent.includes('Definir minha rotina')`))
  await api('/v1/configuracao','PUT',{availability:Object.fromEntries(Array.from({length:7},(_,i)=>[i,120])),block_minutes:25,break_minutes:5})
  await reload()
  assert.equal(await evaluate(`document.querySelectorAll('.daily-block').length`),4)
  await button('Usar este plano')
  await wait(`!Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Usar este plano'||b.textContent==='Salvando\u2026')`)
  let plan=await api('/v1/plano')
  assert.ok(plan.id)
  const futureDate=new Date(plan.date+'T12:00:00Z');futureDate.setUTCDate(futureDate.getUTCDate()+1)
  const futurePlan=await api(`/v1/plano?date=${futureDate.toISOString().slice(0,10)}`)
  assert.ok(futurePlan.blocks.every(b=>!plan.blocks.some(p=>p.topicId===b.topicId)),'Future suggestions must avoid earlier reservations')
  const firstId=plan.blocks[0].id
  await evaluate(`document.querySelector('.daily-block-actions button[aria-label^="Mover"][aria-label$="baixo"]').click()`)
  await wait(`!document.querySelector('.daily-plan button:disabled') || document.querySelector('.daily-blocks')?.textContent`)
  for(let i=0;i<40;i++){plan=await api('/v1/plano');if(plan.blocks[0].id!==firstId)break;await new Promise(r=>setTimeout(r,100))}
  assert.notEqual(plan.blocks[0].id,firstId)
  await reload()
  assert.equal(await evaluate(`document.querySelectorAll('.daily-block').length`),4)
  await evaluate(`Array.from(document.querySelector('.daily-block').querySelectorAll('button')).find(b=>b.textContent==='Ajustar').click()`)
  await wait(`!!document.querySelector('.daily-edit-form')`)
  await fill('.daily-edit-form input[type=number]','20');await evaluate(`document.querySelector('.daily-edit-form').requestSubmit()`)
  await wait(`!document.querySelector('[role=dialog]')`)
  assert.ok(await evaluate(`document.querySelector('.daily-block-content p').textContent.startsWith('20 min')`))
  await evaluate(`Array.from(document.querySelector('.daily-block').querySelectorAll('button')).find(b=>b.textContent==='Adiar').click()`)
  await wait(`document.querySelectorAll('.daily-block').length===3`)
  await evaluate(`document.querySelector('.daily-deferred').open=true`);await button('Restaurar')
  await wait(`document.querySelectorAll('.daily-block').length===4`)
  // A failed request must keep the form and all entered values.
  await button('Registrar estudo');await wait(`!!document.querySelector('[role=dialog]')`)
  // Inputs are inside separate containers, so target the time fields by position in the dialog.
  await evaluate(`(()=>{const e=document.querySelectorAll('[role=dialog] input[type=number]')[1];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'25');e.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  let paused=null
  const intercept=({data})=>{const m=JSON.parse(data);if(m.method==='Fetch.requestPaused')paused=m.params.requestId}
  socket.addEventListener('message',intercept)
  await command('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/sessoes',requestStage:'Request'}]})
  await button('Salvar sessao'.replace('sessao','sess\u00e3o'),"document.querySelector('[role=dialog]')")
  for(let i=0;i<100&&!paused;i++)await new Promise(r=>setTimeout(r,50))
  assert.ok(paused);assert.ok(await evaluate(`!!document.querySelector('[role=dialog]')`))
  await command('Fetch.fulfillRequest',{requestId:paused,responseCode:500,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"message":"Falha simulada ao salvar"}').toString('base64')})
  await command('Fetch.disable');socket.removeEventListener('message',intercept)
  await wait(`document.querySelector('[role=dialog] [role=alert]')?.textContent.includes('Falha simulada')`)
  assert.equal(await evaluate(`document.querySelectorAll('[role=dialog] input[type=number]')[1].value`),'25')
  await button('Salvar sessao'.replace('sessao','sess\u00e3o'),"document.querySelector('[role=dialog]')")
  await wait(`!document.querySelector('[role=dialog]')`);await ready()
  assert.equal(await evaluate(`document.querySelectorAll('.daily-block.is-completed').length`),1)
  const dashboard=await api('/v1/dashboard')
  assert.equal(dashboard.sessoes.length,1);assert.equal(dashboard.sessoes[0].tempoMinutos,25);assert.equal(dashboard.sessoes[0].concluiuAssunto,false)
  assert.ok(dashboard.materias.flatMap(m=>m.topicos).some(t=>t.emAndamento&&!t.ultimaRevisao))
  // Measure a brief real timer session and check that the registration is prefilled.
  await evaluate(`document.querySelector('.study-timer-value').click()`)
  await fill('.timer-editor input[aria-label=Minutos]','0');await fill('.timer-editor input[aria-label=Segundos]','3')
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
  await button('Iniciar sessao'.replace('sessao','sess\u00e3o'))
  await wait(`!!document.querySelector('video')`)
  await new Promise(r=>setTimeout(r,3500))
  await button('Encerrar e registrar')
  await wait(`!document.querySelector('video') && !!document.querySelector('[role=dialog]')`)
  assert.equal(await evaluate(`document.querySelectorAll('[role=dialog] input[type=number]')[1].value`),'1')
  await button('Salvar sessao'.replace('sessao','sess\u00e3o'),"document.querySelector('[role=dialog]')")
  await wait(`!document.querySelector('[role=dialog]')`);await ready()
  const screens=[['/','Hoje'],['/planejamento','Planejamento'],['/progresso','Meu progresso'],['/visao-geral','T\u00f3picos'],['/editais','Editais'],['/configuracao','Configurar'],['/usuarios','Usu\u00e1rios']]
  for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile'],[320,740,'small']]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    for(const [path,title]of screens){
      await navigate(path,title)
      if(path==='/'||path==='/planejamento')await ready()
      const overflow=await evaluate('document.documentElement.scrollWidth>innerWidth+1')
      if(overflow)console.log(await evaluate(`JSON.stringify(Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,10).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width})))`))
      assert.equal(overflow,false,`${path}/${label}: horizontal overflow`)
      assert.ok(await evaluate(`Array.from(document.querySelectorAll('.app-nav-link')).every(e=>parseFloat(getComputedStyle(e).fontSize)>=14)`))
      if(path==='/'||path==='/planejamento')await capture('fluxo-'+path.replaceAll('/','')+'-'+label)
    }
  }
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: routine onboarding, bounded plan, persistent order/edit/defer/restore, failed save keeps form, continuation, timer fills registration, 21 page/viewports without overflow, no JS exceptions.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
