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
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.enable')
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`window.loginFlash=false;window.loaders=0;new MutationObserver(records=>{window.loaders=Math.max(window.loaders,document.querySelectorAll('.study-loading').length);for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&(n.matches?.('input[autocomplete="current-password"]')||n.querySelector?.('input[autocomplete="current-password"]')))window.loginFlash=true}).observe(document,{childList:true,subtree:true})`})
  for(const [width,height]of [[1440,1000],[390,844]]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    for(const path of ['/','/entrar']){
      await command('Network.clearBrowserCookies')
      await command('Storage.clearDataForOrigin',{origin:browserBase,storageTypes:'local_storage'})
      await intercept(['*/api/v1/me'])
      await command('Page.navigate',{url:browserBase+path})
      const probe=await request('/v1/me')
      await wait(`!!document.querySelector('input[type=email]')`)
      await new Promise(r=>setTimeout(r,350))
      assert.equal(await evaluate('window.loaders'),0,'First visit must show no loader, even while /me is pending')
      assert.ok(await evaluate(`!document.querySelector('main[aria-busy]') && !document.querySelector('.study-loading')`))
      await fill('input[type=email]','guest@example.com')
      await evaluate(`void(window.form=document.querySelector('form'))`)
      await fail(probe,401,'Unauthenticated');await command('Fetch.disable')
      assert.equal(await evaluate(`document.querySelector('input[type=email]').value`),'guest@example.com')
      assert.ok(await evaluate(`window.form===document.querySelector('form')`))
      if(path==='/entrar')await capture('login-immediate-'+width)
    }
  }
  // Successful login must work before the initial session probe returns.
  await intercept(['*/api/v1/me'])
  await command('Page.navigate',{url:browserBase+'/'})
  const delayed=await request('/v1/me')
  await wait(`!!document.querySelector('input[type=email]')`)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`);await ready()
  assert.equal(await evaluate(`localStorage.getItem('studia:session-known')`),'1')
  await fail(delayed,401,'Old probe');await command('Fetch.disable')
  assert.ok(await evaluate(`!!document.querySelector('.app-navigation') && !document.querySelector('input[type=email]')`))
  assert.equal(await evaluate(`localStorage.getItem('studia:session-known')`),'1','Stale response must not clear a successful login hint')
  // Returning authenticated visitors must not see the login form on F5.
  for(const path of ['/','/progresso','/entrar']){
    await intercept(['*/api/v1/me'])
    await command('Page.navigate',{url:browserBase+path})
    const probe=await request('/v1/me')
    await wait(`!!document.querySelector('main[aria-busy=true]')`)
    assert.equal(await evaluate('window.loginFlash'),false)
    await command('Fetch.continueRequest',{requestId:probe.requestId});await command('Fetch.disable')
    await wait(`!!document.querySelector('.app-navigation') && !document.querySelector('.study-loading')`)
    assert.equal(await evaluate('window.loginFlash'),false)
  }
  await evaluate(`document.querySelector('.sidebar-logout').click()`)
  await wait(`!!document.querySelector('input[type=email]')`)
  assert.equal(await evaluate(`localStorage.getItem('studia:session-known')`),null)
  // An expired/forged hint must not grant access, and 401 must remove it.
  await evaluate(`localStorage.setItem('studia:session-known','1')`)
  await intercept(['*/api/v1/me'])
  await command('Page.navigate',{url:browserBase+'/'})
  const expired=await request('/v1/me')
  await wait(`!!document.querySelector('main[aria-busy=true]')`)
  assert.ok(await evaluate(`!document.querySelector('.app-navigation')`))
  await fail(expired,401,'Unauthenticated');await command('Fetch.disable')
  await wait(`!!document.querySelector('input[type=email]')`)
  assert.equal(await evaluate(`localStorage.getItem('studia:session-known')`),null)
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: first visit to root/login immediately shows form without loading on desktop/mobile; late 401 preserves typed values and successful login; authenticated F5 has no login flash; logout clears hint; expired/forged hint grants no access.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
