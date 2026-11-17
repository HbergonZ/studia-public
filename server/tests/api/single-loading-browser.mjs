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
async function onlyOne(){
  await wait(`document.querySelectorAll('[data-carregamento-pagina] .study-loading').length===1`)
  assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),1)
  assert.ok(await evaluate(`window.loaderRing===undefined || window.loaderRing===document.querySelector('.study-loading-ring')`),'Indicator must remain mounted between stages')
  await evaluate(`void(window.loaderRing=document.querySelector('.study-loading-ring'))`)
}
try{
  await command('Runtime.enable');await command('Page.enable');await command('Network.enable');await command('Network.clearBrowserCookies')
  await command('Page.navigate',{url:browserBase+'/entrar'})
  await wait(`document.querySelector('h1')?.textContent==='Entrar'`)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await ready()
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`window.maxLoaders=0;window.loaderMounts=0;window.loginFlash=false;new MutationObserver(records=>{window.maxLoaders=Math.max(window.maxLoaders,document.querySelectorAll('.study-loading').length);for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1){if(node.matches?.('.study-loading'))window.loaderMounts++;window.loaderMounts+=node.querySelectorAll?.('.study-loading').length||0;if(node.matches?.('input[autocomplete="current-password"]')||node.querySelector?.('input[autocomplete="current-password"]'))window.loginFlash=true}}).observe(document,{childList:true,subtree:true})`})
  for(const [width,height,failPlan]of [[1440,1000,false],[390,844,false],[1440,1000,true]]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    await intercept(['*/api/v1/me','*/api/v1/dashboard*','*/api/v1/plano?*'])
    await command('Page.navigate',{url:browserBase+'/'})
    const me=await request('/v1/me');await wait(`!!document.querySelector('main[aria-busy=true]')`);await new Promise(r=>setTimeout(r,850));assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0,'Session validation must not show a spinner')
    await command('Fetch.continueRequest',{requestId:me.requestId})
    const studies=await request('/v1/dashboard');await onlyOne()
    await command('Fetch.continueRequest',{requestId:studies.requestId})
    const plan=await request('/v1/plano?');await onlyOne()
    assert.equal(await evaluate(`document.querySelectorAll('#conteudo .study-loading').length`),0)
    assert.equal(await evaluate(`window.loginFlash`),false)
    if(failPlan)await fail(plan)
    else await command('Fetch.continueRequest',{requestId:plan.requestId})
    await command('Fetch.disable')
    await ready()
    assert.equal(await evaluate(`window.maxLoaders`),1)
    assert.equal(await evaluate(`window.loaderMounts`),1,'Exactly one loading indicator for the entire page load')
    assert.equal(await evaluate(`window.loginFlash`),false)
    if(failPlan){
      assert.ok(await evaluate(`document.querySelector('.daily-plan [role=alert]').textContent.includes('Falha simulada')`))
      await button('Tentar novamente');await ready()
    }
    // Updating an already visible plan must not start the initial indicator again.
    const previousMounts=await evaluate('window.loaderMounts')
    await intercept(['*/api/v1/plano?*'])
    await evaluate(`window.dispatchEvent(new Event('studia:study-saved'))`)
    const refresh=await request('/v1/plano?')
    assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0)
    assert.ok(await evaluate(`!!document.querySelector('.daily-plan') && !!document.querySelector('.study-focus')`))
    await command('Fetch.continueRequest',{requestId:refresh.requestId});await command('Fetch.disable')
    await wait(`!document.querySelector('.focus-primary').disabled`)
    assert.equal(await evaluate('window.loaderMounts'),previousMounts)
  }
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: session restore has no spinner; one persistent indicator across delayed dashboard and plan; no login flash, desktop/mobile, failure releases indicator, retry succeeds, background refresh adds no indicator.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
