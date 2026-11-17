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
  if(message.method==='Page.javascriptDialogOpening')void command('Page.handleJavaScriptDialog',{accept:true})
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
async function button(text,root='document'){await evaluate(`(()=>{const b=Array.from(${root}.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)});b.focus();b.click()})()`)}
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
 mkdirSync('/fixtures/testing/layout-qa',{recursive:true});await command('Runtime.enable');await command('Page.enable');await command('Network.enable');await command('Network.clearBrowserCookies');
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:browserBase+'/entrar'});await wait(`!!document.querySelector('input[type=email]')`);
 await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password);await evaluate(`document.querySelector('form').requestSubmit()`);await ready();
 for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile'],[320,568,'small']]){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
  for(const [path,title]of [['/','Hoje'],['/planejamento','Planejamento'],['/progresso','Meu progresso'],['/visao-geral','Tópicos'],['/configuracao','Configurar'],[`/editais/${notice.id}/revisar`,response.title],['/unknown-route','Página não encontrada']]){
   await navigate(path,title);await wait(`!document.querySelector('.study-loading')`);
   assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),`overflow ${label} ${path}`);
   if(path==='/configuracao')assert.equal(await evaluate(`Array.from(document.querySelectorAll('.routine-tabs button')).filter(b=>b.getAttribute('aria-label')&&b.innerText.trim()).length`),4);
   if(path==='/')assert.equal(await evaluate(`document.querySelector('.daily-plan-fixed').getBoundingClientRect().height`),640);
   if(path==='/visao-geral')assert.equal(await evaluate(`document.querySelectorAll('.library-list>ul>li').length`),30);
   if(path==='/'||path==='/visao-geral'||path==='/configuracao')await capture('reliability-'+path.replaceAll('/','')+'-'+label);
  }
 }
 await navigate('/visao-geral','Tópicos');await fill('input[type=search]','portugues');
 await wait(`document.querySelectorAll('.library-list>ul>li').length>0`);assert.ok(await evaluate(`Array.from(document.querySelectorAll('.library-list>ul>li')).every(li=>li.innerText.includes('Portuguesa'))`));
 await fill('input[type=search]','');await button('Ver detalhes');await wait(`!!document.querySelector('[role=dialog]')`);
 assert.ok(await evaluate(`document.querySelector('[role=dialog]').contains(document.activeElement)`));
 assert.equal(await evaluate(`document.getElementById('root').inert`),true);
 for(let i=0;i<20;i++){
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.ok(await evaluate(`document.querySelector('[role=dialog]').contains(document.activeElement)`),'Tab stays inside modal');
 }
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait(`!document.querySelector('[role=dialog]')`);
 assert.equal(await evaluate(`document.activeElement.textContent.trim()`),'Ver detalhes');assert.equal(await evaluate(`document.getElementById('root').inert`),false);
 // Routine drafts do not affect saved configuration or disappear on navigation.
 const routineBefore=(await api('/v1/dashboard')).configuracao;
 await navigate('/configuracao','Configurar');await fill('.routine-block-settings input[type=number]','35');
 assert.equal((await api('/v1/dashboard')).configuracao.blocoMinutos,routineBefore.blocoMinutos);
 await evaluate(`document.querySelector('a[href="/"]').click()`);await ready();
 await navigate('/configuracao','Configurar');assert.equal(await evaluate(`document.querySelector('.routine-block-settings input[type=number]').value`),'35');
 await button('Descartar rascunho e voltar');await ready();
 // Catalog fields save on blur; failures keep the local text and expose retry.
 await navigate(`/editais/${notice.id}/revisar`,response.title);
 const field='input[aria-label^="Nome da matéria"]';await wait(`!!document.querySelector(${JSON.stringify(field)})`);
 const subjectId=board.materias[0].id;
 await evaluate(`window.__realFetch=window.fetch;window.__failCatalog=true;window.fetch=(url,init)=>{if(window.__failCatalog&&String(url).includes('/v1/materias/')&&init?.method==='PATCH'){window.__failCatalog=false;return Promise.reject(new TypeError('offline simulation'))}return window.__realFetch(url,init)}`);
 await fill(field,'Nome salvo após falha');await evaluate(`document.querySelector(${JSON.stringify(field)}).dispatchEvent(new FocusEvent('focusout',{bubbles:true}))`);
 await wait(`document.querySelector('.save-status')?.textContent.includes('Sem conexão')`);
 assert.equal(await evaluate(`document.querySelector(${JSON.stringify(field)}).value`),'Nome salvo após falha');
 await button('Tentar salvar novamente');await wait(`document.querySelector('.save-status')?.textContent==='Alterações salvas.'`);
 assert.equal((await api(`/v1/dashboard?edital_id=${notice.id}`)).materias.find(m=>m.id===subjectId).nome,'Nome salvo após falha');
 await evaluate(`window.fetch=window.__realFetch`);
 // Browser back must preserve measured time as an explicit recoverable draft.
 await navigate('/planejamento','Planejamento');await evaluate(`document.querySelector('a[href="/"]').click()`);await ready();
 await button('Iniciar sessão');await wait(`!!document.querySelector('.study-timer-value')`);await new Promise(r=>setTimeout(r,2300));
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await evaluate(`history.back()`);await wait(`location.pathname==='/planejamento'`);
 await evaluate(`document.querySelector('a[href="/"]').click()`);await ready();await wait(`!!document.querySelector('[aria-label="Estudo não registrado"]')`);
 const draft=await evaluate(`Object.keys(localStorage).filter(k=>k.startsWith('studia:cronometro:')).map(k=>JSON.parse(localStorage.getItem(k))).find(d=>d.segundosEstudados>0)`);assert.ok(draft?.segundosEstudados>=1);
 await button('Recuperar estudo');await wait(`!document.querySelector('[aria-label="Estudo não registrado"]')`);
 await button('Registrar estudo');await wait(`!!document.querySelector('input[aria-label="Minutos estudados"]')`);
 assert.ok(Number(await evaluate(`document.querySelector('input[aria-label="Minutos estudados"]').value`))>=1);
 await fill('input[aria-label="Minutos estudados"]','3');await button('Salvar sessão');await wait(`!document.querySelector('[role=dialog]')`);
 assert.equal(await evaluate(`Object.keys(localStorage).filter(k=>k.startsWith('studia:cronometro:')).length`),0);
 await navigate('/visao-geral','Tópicos');await button('Ver detalhes');await wait(`!!document.querySelector('[role=dialog]')`);
 if(await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Corrigir registro')`)){
  await button('Corrigir registro');await wait(`!!document.querySelector('#corrigir-sessao')`);
  await fill('#corrigir-sessao input[type=number]','4');await fill('#corrigir-sessao textarea','Correção de teste');await button('Salvar correção');await wait(`!document.querySelector('[role=dialog]')`);
 }
 // An expired session must keep the form and its idempotency key for the same account.
 if(await evaluate(`!!document.querySelector('[role=dialog]')`)){await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait(`!document.querySelector('[role=dialog]')`)}
 await button('Registrar estudo');await wait(`!!document.querySelector('input[aria-label="Minutos estudados"]')`);await fill('input[aria-label="Minutos estudados"]','9');
 await evaluate(`(async()=>{const r=await fetch('/api/v1/me',{credentials:'include'});const me=await r.json();await fetch('/api/auth/logout',{method:'POST',credentials:'include',headers:{'X-CSRF-TOKEN':me.csrfToken}})})()`);
 await button('Salvar sessão');await wait(`!!document.querySelector('input[type=email]')`);
 await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password);await evaluate(`document.querySelector('form').requestSubmit()`);
 await wait(`document.querySelector('#conteudo h1')?.textContent==='Tópicos'`);await button('Registrar estudo');await wait(`!!document.querySelector('input[aria-label="Minutos estudados"]')`);
 assert.equal(await evaluate(`document.querySelector('input[aria-label="Minutos estudados"]').value`),'9');await button('Salvar sessão');await wait(`!document.querySelector('[role=dialog]')`);
 // Lost create response: repeating import reuses the same request key and notice.
 const noticesBefore=(await api('/v1/editais')).length;
 await navigate('/editais/novo','Enviar edital');await button('Usar minha IA: copiar prompt e importar resposta');await wait(`!!document.querySelector('#resposta-ia')`);await fill('#resposta-ia',JSON.stringify(response));await button('Conferir organização');await wait(`!!document.querySelector('.unit-import-preview')`);
 await evaluate(`window.__realFetch=window.fetch;window.__loseCreate=true;window.fetch=async(url,init)=>{const r=await window.__realFetch(url,init);if(window.__loseCreate&&String(url).endsWith('/v1/editais')&&init?.method==='POST'){window.__loseCreate=false;throw new TypeError('simulated lost response')}return r}`);
 await button('Aplicar importação');await wait(`document.querySelector('[role=dialog] [role=alert]')?.textContent.includes('Sem conexão')`);assert.equal((await api('/v1/editais')).length,noticesBefore+1);
 await button('Aplicar importação');await wait(`location.pathname.endsWith('/revisar') && !document.querySelector('[role=dialog]')`);assert.equal((await api('/v1/editais')).length,noticesBefore+1);await evaluate(`window.fetch=window.__realFetch`);
 await command('Emulation.setTimezoneOverride',{timezoneId:'Pacific/Kiritimati'});await navigate('/','Hoje');await ready();
 const canonicalToday=(await api('/v1/plano')).today;
 assert.ok(await evaluate(`document.querySelector('.agenda-calendar button[aria-current=date]')?.getAttribute('aria-label').includes(${JSON.stringify(String(Number(canonicalToday.slice(-2))))})`));
 await command('Emulation.setTimezoneOverride',{timezoneId:'America/Manaus'});
 // Text enlarged to 200%, in addition to the normal narrow viewport matrix.
 for(const width of [1440,390,320]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
  for(const [path,title]of [['/','Hoje'],['/visao-geral','Tópicos'],['/configuracao','Configurar']]){
   await navigate(path,title);await evaluate(`document.documentElement.style.fontSize='32px'`);await new Promise(r=>setTimeout(r,100));
   assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),`200% text overflow ${width} ${path}`);await evaluate(`document.documentElement.style.fontSize=''`);
  }
 }
 await navigate('/progresso','Meu progresso');await evaluate(`Array.from(document.querySelectorAll('summary')).find(s=>s.textContent==='Ver valores por dia').click()`);assert.equal(await evaluate(`Array.from(document.querySelectorAll('table')).find(t=>t.caption?.textContent==='Valores da semana por dia').querySelectorAll('tbody tr').length`),7);
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 const recoveryUser=await api('/v1/admin/users','POST',{email:fixture.prefix+'-browser-recovery@example.com'},201);
 await navigate('/usuarios','Usuários');await wait(`Array.from(document.querySelectorAll('li')).some(li=>li.textContent.includes(${JSON.stringify(fixture.prefix+'-browser-recovery@example.com')}))`);
 await evaluate(`Array.from(document.querySelectorAll('li')).find(li=>li.textContent.includes(${JSON.stringify(fixture.prefix+'-browser-recovery@example.com')})).querySelector('button').click()`);await wait(`!!document.querySelector('textarea[aria-label="Mensagem de acesso"]')`);
 assert.ok(await evaluate(`document.querySelector('textarea[aria-label="Mensagem de acesso"]').value.includes('Seu acesso ao Studia foi redefinido.')`));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: 21 route/viewport combinations, fixed plans, bounded/paginated library, search, mobile labels, modal focus, routine drafts, catalog retry, timer recovery after browser back, session/correction, 401 form recovery, import retry after lost create response without duplication.');
}finally{await command('Browser.close').catch(()=>{});socket.close()}
