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



const reports=JSON.parse(readFileSync('/fixtures/testing/real-editais-results.json','utf8'))
const cases=JSON.parse(readFileSync('/fixtures/testing/editais-reais/cases.json','utf8'))
async function fit(label){assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),label+' horizontal overflow')}
try{
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.enable');await command('Network.clearBrowserCookies')
  await command('Storage.clearDataForOrigin',{origin:browserBase,storageTypes:'local_storage'})
  await command('Page.navigate',{url:browserBase+'/entrar'})
  await wait(`!!document.querySelector('input[type=email]')`)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`);await ready()
  const icons=await evaluate(`Array.from(document.querySelectorAll('.app-nav-link svg')).map(e=>e.innerHTML)`)
  assert.equal(icons.length,7);assert.equal(new Set(icons).size,7,'Each navigation entry must have a distinct icon')
  for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile'],[320,740,'small']]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    await navigate('/','Hoje');await ready();await fit('home '+label);await capture('real-home-'+label)
    await navigate('/planejamento','Planejamento');await ready();await fit('planning '+label);await capture('real-planning-'+label)
    await navigate('/visao-geral','Tópicos');await fit('topics '+label)
    await navigate('/editais','Editais')
    await wait(`document.querySelectorAll('#conteudo article').length===5`)
    await fit('notices '+label);await capture('real-notices-'+label)
    if(width===1440){
      for(const report of reports){
        const title=cases.find(c=>c.file===report.file).response.title
        await navigate(`/editais/${report.id}/revisar`,title)
        await fit('review '+report.file)
        assert.equal(await evaluate(`document.querySelector('.sidebar-plan>span').textContent`),'Edital em revisão')
        if(report.file==='edital4.pdf'){
          assert.ok(await evaluate(`document.querySelector('#conteudo [role=alert]').textContent.includes('sem conte\u00fado program\u00e1tico')`))
          assert.ok(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Confirmar conte')).disabled`))
          await capture('real-nav-no-syllabus')
        }
      }
    }
  }
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: seven distinct navigation icons; five real sample notices visible; all review pages; NAV cannot activate; desktop/mobile/320 layouts; no horizontal overflow or JavaScript exceptions.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
