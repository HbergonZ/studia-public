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
const definitions=[['Língua portuguesa',['Legislação e Saúde Pública: '+ 'Constituição, SUS, vigilância e epidemiologia. '.repeat(35),'Interpretação de texto','Regência e crase']],['Direito administrativo',['Atos administrativos','Princípios da administração','Licitações e contratos']],['Direito constitucional',['Direitos fundamentais','Organização do Estado','Poderes da União']],['Informática',['Redes de computadores','Sistemas operacionais','Segurança da informação']]]
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

const today=(await api('/v1/plano')).today
const dates=Array.from({length:3},(_,i)=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+i);return d.toISOString().slice(0,10)})
for(const [i,date] of dates.entries()){
 const plan=await api('/v1/plano?date='+date)
 if(i===0)continue
 const blocks=i===1?[]:plan.topics.slice(0,8).map(t=>({id:crypto.randomUUID(),topicId:t.id,minutes:5,status:'planned'}))
 await api('/v1/plano','PUT',{date,noticeId:plan.noticeId,version:plan.version,blockMinutes:25,breakMinutes:5,blocks})
}
try {
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.clearBrowserCookies')
  await command('Page.navigate',{url:browserBase+'/entrar'});await wait(`!!document.querySelector('input[type=email]')`)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`);await ready()
  const counts=[]
  for(const [width,height,label] of [[1440,1000,'desktop'],[390,844,'mobile'],[320,568,'small']]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    await navigate('/planejamento','Planejamento')
    for(const [i,date] of dates.entries()){
      const labelDate=date.slice(8,10)+'/'+date.slice(5,7)
      await evaluate(`Array.from(document.querySelectorAll('.daily-week-days button')).find(b=>b.querySelector('strong').textContent===${JSON.stringify(labelDate)}).click()`)
      await wait(`!!document.querySelector('.daily-plan-fixed .daily-plan-heading') && !document.querySelector('.daily-plan-fixed[aria-busy]') && new URLSearchParams(location.search).get('data')===${JSON.stringify(date)}`)
      const plan=await api('/v1/plano?date='+date)
      await wait(`document.querySelector('.daily-plan-count')?.textContent.includes('('+${plan.blocks.length}+' ')`)
      const bounds=await evaluate(`(()=>{const c=document.querySelector('.daily-plan-fixed'),b=c.querySelector('.daily-plan-body'),h=c.querySelector('h2');return {height:c.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth,scroll:b.scrollHeight>b.clientHeight,title:h.textContent,top:h.getBoundingClientRect().top}})()`)
      assert.equal(bounds.height,640,`${label} ${date} fixed height`)
      assert.equal(bounds.overflow,false,'no horizontal overflow')
      if(i===0){assert.ok(bounds.scroll,'long content must scroll');counts.push(plan.blocks.length)}
      if(i===1)assert.equal(plan.blocks.length,0,'empty day')
      if(i===2)assert.ok(plan.blocks.length>counts.at(-1),'busy day has more items')
      await evaluate(`document.querySelector('.daily-plan-body').scrollTop=100000`)
      assert.equal(await evaluate(`document.querySelector('.daily-plan-fixed h2').getBoundingClientRect().top`),bounds.top,'heading stays fixed when body scrolls')
      await evaluate(`document.querySelector('.daily-plan-body').scrollTop=0`)
      await capture('fixed-plan-'+label+'-'+i)
    }
  }
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: 640px fixed planning card across 9 day/viewport combinations; empty, normal and busy days; item count matches API; internal scroll keeps heading visible; long text without page overflow.')
}catch(e){await capture('fixed-plan-failure');throw e}finally{await command('Browser.close').catch(()=>{});socket.close()}

