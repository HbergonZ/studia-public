// Requer a fixture admin-users e navegador isolado em CDP 9224.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'

const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json','utf8'))
const browserBase = process.env.BROWSER_BASE_URL ?? 'http://127.0.0.1:8092'
const apiBase = process.env.TEST_BASE_URL ?? 'http://host.docker.internal:8092'
const cookies = new Map()
async function api(path,method='GET',body,expected=200){
  const response=await fetch(apiBase+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:body===undefined?undefined:JSON.stringify(body)})
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}
  assert.equal(response.status,expected,`${method} ${path}`)
  return response.json()
}
await api('/auth/login','POST',{email:fixture.email,password:fixture.password})
const notice=await api('/v1/editais','POST',{title:'Concurso de teste visual da Mesa',source:'manual'},201)
const definitions=[['Língua portuguesa',['Concordância verbal','Interpretação de texto','Regência e crase']],['Direito administrativo',['Atos administrativos','Princípios da administração','Licitações e contratos']],['Direito constitucional',['Direitos fundamentais','Organização do Estado','Poderes da União']],['Informática',['Redes de computadores','Sistemas operacionais','Segurança da informação']]]
const topics=[]
for(const [index,[name,items]] of definitions.entries()){
  const subject=await api(`/v1/editais/${notice.id}/materias`,'POST',{name,weight:7-index,color:index+1},201)
  for(const name of items){const topic=await api(`/v1/materias/${subject.id}/topicos`,'POST',{name,difficulty:5},201);topics.push(topic.id)}
}
await api('/v1/configuracao','PUT',{availability:{0:0,1:180,2:180,3:180,4:180,5:180,6:120},weekly_question_goal:100,weekly_minutes_goal:300})
await api(`/v1/editais/${notice.id}/ativar`,'POST')
for(const [index,offset] of [10,5,2,1].entries()){
  const date=new Date();date.setDate(date.getDate()-offset)
  await api('/v1/sessoes','POST',{topic_id:topics[index*3],minutes:25+index*5,correct_answers:15,wrong_answers:5,difficulty:5,studied_on:date.toISOString().slice(0,10)},201)
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
try{
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.enable');await command('Network.clearBrowserCookies')
  await command('Page.navigate',{url:browserBase+'/entrar'})
  await wait(`document.querySelector('h1')?.textContent==='Entrar'`)
  assert.equal(await evaluate('document.title'),'Studia')
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await wait(`document.querySelector('#conteudo h1')?.textContent==='Mesa de estudo'`)
  for(const [width,height,label]of [[1440,1100,'desktop'],[390,844,'mobile']]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    for(const [path,title] of [['/','Mesa de estudo'],['/editais','Editais'],['/visao-geral','Tópicos'],['/usuarios','Usuários'],['/configuracao','Configurar'],['/editais/novo','Enviar edital']]){
      await navigate(path,title)
      await evaluate('document.fonts.ready')
      const overflow=await evaluate('document.documentElement.scrollWidth>innerWidth+1')
      if(overflow){console.log(await evaluate(`JSON.stringify(Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,8).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width})))`))}
      assert.equal(overflow,false,`${path}/${label}: vazamento horizontal`)
      assert.equal(await evaluate('document.title'),'Studia')
      if(path==='/')await capture('mesa-'+label)
    }
  }
  await navigate('/','Mesa de estudo')
  assert.equal(await evaluate(`document.querySelectorAll('.review-kanban-column').length`),4)
  assert.ok(await evaluate(`document.querySelectorAll('#calendario [aria-label*="sessão"]').length>300`))
  await evaluate(`document.querySelector('#calendario [aria-label*="Nenhuma sessão"]').click()`)
  await evaluate(`Array.from(document.querySelectorAll('#calendario button')).find(b=>b.textContent==='Ver ano').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('#calendario .grid-cols-7').length`),12)
  await navigate('/','Mesa de estudo')
  const originalTopic=await evaluate(`document.querySelector('.study-focus h2').textContent`)
  await evaluate(`document.querySelectorAll('.desk-queue-row')[1].click()`)
  assert.notEqual(await evaluate(`document.querySelector('.study-focus h2').textContent`),originalTopic)
  await evaluate(`document.querySelector('.study-timer-modes button:nth-child(2)').click()`)
  assert.equal(await evaluate(`document.querySelector('.study-timer-value').textContent`),'05:00')
  await evaluate(`document.querySelector('.study-timer-modes button:first-child').click();document.querySelector('.study-timer-value').click()`)
  await fill('.timer-editor input[aria-label=Minutos]','35')
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
  assert.equal(await evaluate(`document.querySelector('.study-timer-value').textContent`),'35:00')
  await evaluate(`document.querySelector('.focus-primary').click()`)
  await wait(`!!document.querySelector('video')`)
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await wait(`!document.querySelector('video')`)
  await evaluate(`document.querySelector('.focus-secondary').click()`)
  await wait(`!!document.querySelector('[role=dialog]')`)
  await fill('[role=dialog] input[type=number]:nth-of-type(1)','0')
  await evaluate(`Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent==='Salvar sessão').click()`)
  await wait(`!document.querySelector('[role=dialog]')`)
  await wait(`true`)
  for(let i=0;i<50&&!responses.some(r=>r.url.endsWith('/api/v1/sessoes')&&r.status===201);i++)await new Promise(resolve=>setTimeout(resolve,100))
  assert.ok(responses.some(r=>r.url.endsWith('/api/v1/sessoes')&&r.status===201),'O registro precisa chegar à API.')
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('OK: 12 telas/viewports, título Studia, calendário/atividade, quatro colunas, seleção de assunto, pausas, edição do cronômetro, modo foco e registro real de sessão em conta temporária.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
