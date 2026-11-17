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


const login=await api('/auth/login','POST',{email:fixture.email,password:fixture.password})
assert.equal(login.user.hasActiveNotice,false)
assert.equal((await api('/v1/me')).hasActiveNotice,false)
try{
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.enable')
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`window.maxLoaders=0;new MutationObserver(()=>{window.maxLoaders=Math.max(window.maxLoaders,document.querySelectorAll('.study-loading').length)}).observe(document,{childList:true,subtree:true})`})
  for(const [width,height]of [[1440,1000],[390,844]]){
    await command('Network.clearBrowserCookies')
    await command('Storage.clearDataForOrigin',{origin:browserBase,storageTypes:'local_storage'})
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    await command('Page.navigate',{url:browserBase+'/entrar'})
    await wait(`!!document.querySelector('input[type=email]')`)
    await intercept(['*/api/v1/dashboard*'])
    await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
    await evaluate(`document.querySelector('form').requestSubmit()`)
    const studies=await request('/v1/dashboard')
    await wait(`!!document.querySelector('.first-plan')`)
    await new Promise(r=>setTimeout(r,350))
    assert.equal(await evaluate('window.maxLoaders'),0,'Empty account must reach welcome without a page loader')
    assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0)
    assert.ok(await evaluate(`!!document.querySelector('a[href="/editais"]') && !!document.querySelector('.app-navigation')`))
    await capture('empty-account-'+width)
    await command('Fetch.continueRequest',{requestId:studies.requestId});await command('Fetch.disable')
    await wait(`!!document.querySelector('.first-plan') && !document.querySelector('.study-loading')`)
    assert.equal(await evaluate('window.maxLoaders'),0)
  }
  // F5 without an active notice must not introduce an authentication spinner.
  await intercept(['*/api/v1/me','*/api/v1/dashboard*'])
  await command('Page.navigate',{url:browserBase+'/'})
  const restoring=await request('/v1/me')
  await wait(`!!document.querySelector('main[aria-busy=true]')`)
  await new Promise(r=>setTimeout(r,850))
  assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),0)
  assert.equal(await evaluate(`document.querySelectorAll('input[type=email]').length`),0)
  await command('Fetch.continueRequest',{requestId:restoring.requestId})
  const background=await request('/v1/dashboard')
  await wait(`!!document.querySelector('.first-plan')`)
  assert.equal(await evaluate('window.maxLoaders'),0)
  await command('Fetch.continueRequest',{requestId:background.requestId});await command('Fetch.disable')
  // Draft/inactive notices do not require a study dashboard on the welcome screen.
  const notice=await api('/v1/editais','POST',{title:'Concurso de teste sem dados',source:'manual'},201)
  assert.equal((await api('/v1/me')).hasActiveNotice,false)
  const subject=await api(`/v1/editais/${notice.id}/materias`,'POST',{name:'Saude',weight:5,color:1},201)
  await api(`/v1/materias/${subject.id}/topicos`,'POST',{name:'Principios do SUS',difficulty:5},201)
  await api(`/v1/editais/${notice.id}/ativar`,'POST')
  assert.equal((await api('/v1/me')).hasActiveNotice,true)
  await api('/auth/logout','POST')
  assert.equal((await api('/auth/login','POST',{email:fixture.email,password:fixture.password})).user.hasActiveNotice,true)
  // A real active notice must still wait for data, never show the empty account CTA.
  await intercept(['*/api/v1/dashboard*'])
  await command('Page.navigate',{url:browserBase+'/'})
  const active=await request('/v1/dashboard')
  await wait(`!!document.querySelector('.study-loading')`)
  assert.ok(await evaluate(`!document.querySelector('.first-plan')`))
  assert.equal(await evaluate(`document.querySelectorAll('.study-loading').length`),1)
  await command('Fetch.continueRequest',{requestId:active.requestId});await command('Fetch.disable')
  await wait(`!!document.querySelector('#conteudo h1') && !document.querySelector('.study-loading')`)
  assert.ok(await evaluate(`!document.querySelector('.first-plan')`))
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: login/me identify empty and active notices; desktop/mobile welcome renders with dashboard paused and zero loader mounts; draft stays empty; active notice waits for real data and never shows empty CTA.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
