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
await api('/v1/configuracao','PUT',{availability:Object.fromEntries(Array.from({length:7},(_,i)=>[i,120])),block_minutes:25,break_minutes:5})

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
let paused=[]
socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Fetch.requestPaused')paused.push(m.params)})
async function intercept(patterns){paused=[];await command('Fetch.enable',{patterns:patterns.map(urlPattern=>({urlPattern,requestStage:'Request'}))})}
async function request(fragment){for(let i=0;i<150;i++){const found=paused.find(p=>p.request.url.includes(fragment));if(found)return found;await new Promise(r=>setTimeout(r,50))}throw Error('Missing request: '+fragment)}
async function fail(req,code=500,message='Falha simulada'){await command('Fetch.fulfillRequest',{requestId:req.requestId,responseCode:code,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({message})).toString('base64')})}
async function follow(path,title){await evaluate(`document.querySelector('a[href="${path}"]').click()`);await wait(`document.querySelector('#conteudo h1')?.textContent===${JSON.stringify(title)}`)}
try{
  await command('Runtime.enable');await command('Page.enable');await command('Network.enable');await command('Network.clearBrowserCookies')
  await command('Storage.clearDataForOrigin',{origin:browserBase,storageTypes:'local_storage'})
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`window.loginFlash=false;new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1&&(node.matches?.('input[autocomplete="current-password"]')||node.querySelector?.('input[autocomplete="current-password"]')))window.loginFlash=true}).observe(document,{childList:true,subtree:true});`})
  // First visits render login immediately while session validation stays in the background.
  await intercept(['*/api/v1/me'])
  await command('Page.navigate',{url:browserBase+'/'})
  const rootProbe=await request('/v1/me')
  await wait(`document.querySelector('h1')?.textContent==='Entrar'`)
  assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0)
  await fail(rootProbe,401,'Unauthenticated');await command('Fetch.disable')
  await intercept(['*/api/v1/me','*/api/v1/dashboard*'])
  await command('Page.navigate',{url:browserBase+'/entrar'})
  const probe=await request('/v1/me')
  await wait(`document.querySelector('h1')?.textContent==='Entrar'`)
  assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0)
  await fail(probe,401,'Unauthenticated')
  assert.equal(paused.some(p=>p.request.url.includes('/v1/dashboard')),false)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`)
  const dashboard=await request('/v1/dashboard')
  await wait(`!!document.querySelector('.app-navigation')`)
  assert.ok(await evaluate(`document.querySelectorAll('.study-loading-screen').length<=1`))
  await evaluate(`void(window.testNav=document.querySelector('.app-navigation'))`)
  // Admin and notices do not depend on the study dashboard response.
  await follow('/usuarios','Usu\u00e1rios')
  await wait(`!document.querySelector('.study-loading')`)
  await follow('/editais','Editais')
  assert.ok(await evaluate(`!!document.querySelector('a[href="/editais/novo"]')`))
  await follow('/editais/novo','Enviar edital')
  assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0)
  await evaluate(`document.querySelector('a[href="/"]').click()`)
  await wait(`!!document.querySelector('[data-carregamento-pagina] .study-loading')`)
  assert.ok(await evaluate(`window.testNav===document.querySelector('.app-navigation')`))
  await command('Fetch.continueRequest',{requestId:dashboard.requestId});await command('Fetch.disable')
  await wait(`!!document.querySelector('.daily-plan') && !document.querySelector('.study-loading')`)
  // F5 on protected pages and on /entrar must never render login for an existing session.
  for(const path of ['/','/progresso','/entrar']){
    await intercept(['*/api/v1/me','*/api/v1/dashboard*'])
    await command('Page.navigate',{url:browserBase+path})
    const restoring=await request('/v1/me')
    await wait(`!!document.querySelector('main[aria-busy=true]')`)
    assert.equal(await evaluate(`window.loginFlash`),false,`login flash before session: ${path}`)
    assert.equal(await evaluate(`document.querySelectorAll('input[type=email]').length`),0)
    await command('Fetch.continueRequest',{requestId:restoring.requestId})
    const studies=await request('/v1/dashboard')
    await wait(`!!document.querySelector('.app-navigation')`)
    assert.equal(await evaluate(`window.loginFlash`),false,`login flash after session: ${path}`)
    await command('Fetch.continueRequest',{requestId:studies.requestId});await command('Fetch.disable')
    await wait(`document.querySelector('#conteudo h1')?.textContent===${JSON.stringify(path==='/progresso'?'Meu progresso':'Hoje')}`)
    if(path!=='/progresso')await ready()
    assert.equal(await evaluate(`window.loginFlash`),false,`login flash after load: ${path}`)
  }
  await evaluate(`void(window.testNav=document.querySelector('.app-navigation'))`)
  // Background refresh: keep the same plan and focus DOM, including after an error.
  await evaluate(`(()=>{window.testPlan=document.querySelector('.daily-plan');window.testFocus=document.querySelector('.study-focus')})()`)
  await intercept(['*/api/v1/plano?*'])
  await evaluate(`window.dispatchEvent(new Event('studia:study-saved'))`)
  const refresh=await request('/v1/plano?')
  assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0)
  assert.ok(await evaluate(`window.testPlan===document.querySelector('.daily-plan') && window.testFocus===document.querySelector('.study-focus')`))
  await fail(refresh)
  await wait(`document.querySelector('.daily-plan [role=alert]')?.textContent.includes('Falha simulada')`)
  assert.ok(await evaluate(`window.testPlan.isConnected && window.testFocus.isConnected`))
  await command('Fetch.disable')
  await button('Recarregar plano')
  await wait(`!document.querySelector('.daily-plan [role=alert]')`)
  // Saving routine: show progress on the button, with the page and nav intact.
  await follow('/configuracao','Configurar')
  await intercept(['*/api/v1/configuracao'])
  await button('Salvar rotina e come\u00e7ar')
  const save=await request('/v1/configuracao')
  assert.equal(await evaluate(`document.querySelector('#conteudo h1').textContent`),'Configurar')
  assert.ok(await evaluate(`document.querySelectorAll('.study-loading-screen').length<=1`))
  assert.ok(await evaluate(`document.querySelector('fieldset').disabled && document.querySelector('#conteudo').textContent.includes('Salvando')`))
  assert.ok(await evaluate(`window.testNav===document.querySelector('.app-navigation')`))
  await fail(save)
  await wait(`!!document.querySelector('[role=alert]') && !document.querySelector('fieldset').disabled`)
  await command('Fetch.disable')
  // Required password change still takes precedence and never loads study data.
  const invitation=await api('/v1/admin/users','POST',{email:`${fixture.prefix}-loading@example.com`},201)
  const password=invitation.message.match(/Senha tempor\u00e1ria: (\S+)/)[1]
  await command('Network.clearBrowserCookies')
  await command('Page.navigate',{url:browserBase+'/entrar'})
  await wait(`document.querySelector('h1')?.textContent==='Entrar'`)
  await fill('input[type=email]',`${fixture.prefix}-loading@example.com`);await fill('input[type=password]',password)
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await wait(`document.querySelector('h1')?.textContent==='Escolha sua senha'`)
  assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0)
  assert.equal(await evaluate(`document.querySelectorAll('.app-navigation').length`),0)
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: no login flash on refresh of /, /progresso or /entrar; guest login after session check; independent pages accessible; local data loader; background refresh and save feedback preserved; mandatory password change preserved.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
