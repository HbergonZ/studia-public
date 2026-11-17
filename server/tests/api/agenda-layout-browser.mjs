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
async function fill(selector,value){await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`)}
async function capture(name){const {contentSize}=await command('Page.getLayoutMetrics');const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:contentSize.width,height:Math.min(contentSize.height,2100),scale:1}});writeFileSync('/fixtures/testing/layout-qa/'+name+'.png',Buffer.from(result.data,'base64'))}
async function button(text,root='document'){await evaluate(`Array.from(${root}.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`)}
async function ready(){await wait(`!!document.querySelector('.daily-plan') && !document.querySelector('.study-loading')`)}
async function reload(){await evaluate(`document.documentElement.dataset.reloading='true'`);await command('Page.navigate',{url:browserBase+'/'});await wait(`!document.documentElement.dataset.reloading && document.querySelector('#conteudo h1')?.textContent==='Hoje'`);await ready()}
async function idle(){await wait(`!Array.from(document.querySelectorAll('.daily-plan button')).some(b=>b.textContent.includes('Salvando')) && !document.querySelector('.daily-edit-form')`)}

await api('/auth/login','POST',{email:fixture.email,password:fixture.password})
const response=JSON.parse(readFileSync('/samples/porto-velho-enfermeiro-725.json','utf8'))
const notice=await api('/v1/editais','POST',{title:response.title,source:'text'},201)
await api(`/v1/editais/${notice.id}/importar-resposta`,'POST',{response:JSON.stringify(response)})
const board=await api(`/v1/dashboard?edital_id=${notice.id}`)
await api(`/v1/editais/${notice.id}/opcoes/${board.opcoes[0].id}`,'PATCH',{selected:true})
await api(`/v1/editais/${notice.id}/ativar`,'POST')
await api('/v1/configuracao','PUT',{availability:Object.fromEntries(Array.from({length:7},(_,i)=>[i,90])),block_minutes:25,break_minutes:5})
try {
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.enable');await command('Network.clearBrowserCookies')
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  await command('Page.navigate',{url:browserBase+'/entrar'})
  await wait(`!!document.querySelector('input[type=email]')`)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`);await ready()
  await wait(`!!document.querySelector('.study-focus .agenda-source')`)
  await evaluate(`document.fonts.ready`)
  assert.ok(await evaluate(`document.fonts.check('16px "Public Sans"')`))
  const today=(await api('/v1/plano')).today
  for(const [width,height,label] of [[1440,1000,'desktop'],[1024,900,'tablet'],[390,844,'mobile'],[320,740,'small']]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    if(width<500) {
      await evaluate(`document.querySelector('.agenda-menu-toggle').click()`)
      assert.equal(await evaluate(`document.querySelectorAll('.app-navigation a').length`),7)
      assert.ok(await evaluate(`document.querySelector('.app-navigation').getBoundingClientRect().height>0`))
      await evaluate(`document.querySelector('.agenda-menu-toggle').click()`)
    }
    for(const [path,title] of [['/','Hoje'],['/planejamento','Planejamento'],['/progresso','Meu progresso'],['/editais','Editais'],['/visao-geral','Tópicos'],['/usuarios','Usuários'],['/configuracao','Configurar'],[`/editais/${notice.id}/revisar`,response.title]]) {
      await navigate(path,title)
      await wait(`!document.querySelector('.study-loading')`)
      assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),`${label} ${path}: overflow`)
      if(path==='/'||path==='/planejamento'||path.endsWith('/revisar')) await capture('agenda-'+(path==='/'?'hoje':path==='/planejamento'?'plano':'edital')+'-'+label)
      if(path==='/'&&width<500) assert.ok(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Iniciar sessão').getBoundingClientRect().top<${width<350?1000:height}`),'start action reachable earlier on mobile')
      if(path.endsWith('/revisar')) assert.ok(await evaluate(`!document.querySelector('.agenda-notice-maintenance').open && document.querySelector('.agenda-cargo-selector').getBoundingClientRect().top<document.querySelector('.agenda-notice-maintenance').getBoundingClientRect().top`))
    }
    await evaluate(`document.querySelector('.agenda-account').open=true`)
    assert.ok(await evaluate(`(()=>{const r=document.querySelector('.sidebar-bottom').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})()`),'account popup fits '+label)
    await evaluate(`document.querySelector('.agenda-account').open=false`)
  }
  await navigate('/','Hoje');await ready()
  await button('Ajustar',"document.querySelector('.daily-plan')")
  await wait(`!!document.querySelector('.daily-edit-form')`)
  await fill('.daily-edit-form input[type=number]','20')
  await button('Salvar bloco');await idle()
  assert.equal((await api('/v1/plano')).blocks[0].minutes,20)
  await button('Registrar estudo');await wait(`!!document.querySelector('[role=dialog]')`)
  await fill('input[aria-label="Minutos estudados"]','5')
  await button('Salvar sessão');await wait(`!document.querySelector('[role=dialog]')`)
  assert.ok((await api('/v1/plano')).spentMinutes>=5)
  await wait(`!!document.querySelector('.agenda-continuity')`)
  await evaluate(`document.querySelector('.agenda-calendar button[aria-current=date]').click()`)
  await wait(`location.pathname==='/planejamento' && new URLSearchParams(location.search).get('data')===${JSON.stringify(today)}`)
  await command('Page.reload');await wait(`document.querySelector('#conteudo h1')?.textContent==='Planejamento'`)
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('data')`),today)
  await navigate('/','Hoje');await ready()
  for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile']]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    await capture('agenda-final-'+label)
  }
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: 32 route/viewport checks, real cargo import, local font, account popup, edit and persist block, register study, calendar navigation and reload. Zero overflow or JavaScript exceptions.')
} catch(e) {await capture('agenda-failure');throw e} finally {socket.close()}

