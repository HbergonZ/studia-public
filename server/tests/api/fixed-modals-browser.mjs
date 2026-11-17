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
async function fill(selector,value){await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`)}
async function capture(name){await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>resolve(true),100))))`);const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync('/fixtures/testing/layout-qa/'+name+'.png',Buffer.from(result.data,'base64'))}
async function button(text,root='document'){await wait(`Array.from(${root}.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`);await evaluate(`Array.from(${root}.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`)}
async function ready(){await wait(`!!document.querySelector('.daily-plan') && !document.querySelector('.study-loading')`)}
async function reload(){await evaluate(`document.documentElement.dataset.reloading='true'`);await command('Page.navigate',{url:browserBase+'/'});await wait(`!document.documentElement.dataset.reloading && document.querySelector('#conteudo h1')?.textContent==='Hoje'`);await ready()}
async function idle(){await wait(`!Array.from(document.querySelectorAll('.daily-plan button')).some(b=>b.textContent.includes('Salvando')) && !document.querySelector('.daily-edit-form')`)}

async function checkModal(name,footer=true){
  await wait(`!!document.querySelector('.modal-body')`)
  await evaluate(`Promise.all(document.querySelector('[role=dialog]').getAnimations().map(animation=>animation.finished)).then(()=>true)`)
  const inspect=()=>evaluate(`(()=>{const d=document.querySelector('[role=dialog]'),b=d.querySelector('.modal-body'),r=d.getBoundingClientRect(),f=d.querySelector('.modal-footer')?.getBoundingClientRect();return {height:r.height,width:r.width,top:r.top,bottom:r.bottom,right:r.right,viewport:innerHeight,overflow:b.scrollWidth-b.clientWidth,scroll:b.scrollHeight>b.clientHeight,locked:document.body.style.overflow==='hidden',footer:!f||(f.top>=r.top&&f.bottom<=r.bottom)}})()`)
  const before=await inspect()
  assert.ok(before.top>=15&&before.bottom<=before.viewport-15,name+' vertical fit')
  assert.ok(before.right<=await evaluate('innerWidth'),name+' horizontal fit')
  assert.ok(before.overflow<=1,name+' body fit');assert.ok(before.footer&&before.locked,name+' footer and body lock')
  if(footer)assert.ok(await evaluate(`!!document.querySelector('.modal-footer')`),name+' fixed footer')
  await capture('fixed-modal-'+name)
  await evaluate(`(()=>{const b=document.querySelector('.modal-body');for(let i=0;i<80;i++){const p=document.createElement('p');p.dataset.modalStress='true';p.textContent='Conteúdo temporário de teste para verificar rolagem interna. '.repeat(8);b.append(p)}b.scrollTop=b.scrollHeight;})()`)
  const after=await inspect()
  assert.equal(after.height,before.height,name+' stable height with growing content')
  assert.equal(after.width,before.width,name+' stable width with growing content')
  assert.ok(after.scroll&&after.footer,name+' internal scroll and fixed footer')
  await evaluate(`document.querySelectorAll('[data-modal-stress]').forEach(p=>p.remove());document.querySelector('.modal-body').scrollTop=0`)
}
async function close(){await evaluate(`document.querySelector('.modal-close').click()`);await wait(`!document.querySelector('[role=dialog]')`);assert.ok(await evaluate(`document.body.style.overflow!=='hidden'`))}
try {
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.clearBrowserCookies')
  await command('Page.navigate',{url:browserBase+'/entrar'});await wait(`!!document.querySelector('input[type=email]')`)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`);await ready()
  for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile'],[320,568,'small'],[844,390,'landscape']]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    await navigate('/','Hoje');await ready()
    await button('Registrar estudo');await checkModal('register-'+label);await close()
    await button('Ajustar',"document.querySelector('.daily-plan')");await checkModal('adjust-'+label)
    assert.equal(await evaluate(`!!document.querySelector('.daily-edit-form input[type=search]')`),false,'search appears only when changing the topic')
    if(width===1440)assert.ok(await evaluate(`document.querySelector('[role=dialog]').getBoundingClientRect().width>=700`),'roomy block editor on desktop')
    await button('Trocar assunto');await wait(`!!document.querySelector('#block-topic-search')`)
    await fill('#block-topic-search','nenhum resultado xyz');await wait(`document.querySelector('#block-topic-picker').textContent.includes('Nenhum assunto encontrado')`)
    await fill('#block-topic-search','atos administrativos');await wait(`document.querySelectorAll('.block-topic-results li').length===1`)
    if(width===1440)assert.ok(await evaluate(`document.querySelector('.block-topic-results button').getBoundingClientRect().bottom<=document.querySelector('.modal-body').getBoundingClientRect().bottom`),'matching topic visible without scrolling on desktop')
    await capture('block-topic-search-'+label)
    await evaluate(`document.querySelector('.block-topic-results button').click()`)
    assert.equal(await evaluate(`document.querySelector('.block-topic-title').textContent`),'Atos administrativos')
    assert.equal(await evaluate(`!!document.querySelector('#block-topic-search')`),false,'choice closes the topic picker')
    await fill('.daily-edit-form input[type=number]','20');await button('Salvar bloco');await idle()
    assert.equal(await evaluate(`document.querySelector('.daily-block h3').textContent`),'Atos administrativos')
    assert.equal((await api('/v1/plano')).blocks[0].minutes,20)
    await navigate('/editais','Editais');await button('Renomear');await checkModal('notice-'+label)
    await fill('#edital-action-form input','Edital temporário de teste dos modais')
    await button('Renomear',"document.querySelector('.modal-footer')");await wait(`!document.querySelector('[role=dialog]')`)
    await navigate('/visao-geral','Tópicos');await button('Ver detalhes');await checkModal('history-'+label,false);await close()
    await navigate('/editais/novo','Enviar edital');await button('Usar minha IA: copiar prompt e importar resposta');await checkModal('import-'+label)
    await fill('#resposta-ia',JSON.stringify(JSON.parse(readFileSync('/samples/porto-velho-enfermeiro-725.json','utf8'))))
    const initial=await evaluate(`document.querySelector('[role=dialog]').clientHeight`)
    await button('Conferir organização');await wait(`!!document.querySelector('.unit-import-preview')`)
    assert.equal(await evaluate(`document.querySelector('[role=dialog]').clientHeight`),initial,'preview keeps height')
    await checkModal('preview-'+label);await close()
  }
  await navigate('/','Hoje');await ready();await button('Registrar estudo');await wait(`!!document.querySelector('.modal-footer')`)
  await fill('input[aria-label="Minutos estudados"]','5');await button('Salvar sessão');await wait(`!document.querySelector('[role=dialog]')`)
  assert.ok((await api('/v1/plano')).spentMinutes>=5)
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: fixed modal dimensions and internal scrolling in 6 flows x4 viewports; long titles and 80 appended paragraphs cannot resize panels; footer actions remain visible; plan/save/rename/preview/register function; background scrolling restored. Zero JS exceptions.')
}catch(e){await capture('fixed-modal-failure');throw e}finally{await command('Browser.close').catch(()=>{});socket.close()}

