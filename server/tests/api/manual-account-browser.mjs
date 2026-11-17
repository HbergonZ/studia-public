import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json','utf8'))
const {address} = await lookup('host.docker.internal',{family:4})
const pages = await (await fetch(`http://${address}:9224/json/list`)).json()
const socket = new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl.replace('localhost','host.docker.internal').replace('127.0.0.1','host.docker.internal'))
await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})})
let sequence=0; const pending=new Map(),errors=[]
socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)})
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,200))}throw new Error('Timeout: '+expression)}
async function button(text){await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`);await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled);b.focus();b.click()})()`)}
async function fill(selector,value){await evaluate(`(()=>{const i=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(i instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`)}
async function capture(name){const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync('/fixtures/testing/layout-qa/'+name+'.png',Buffer.from(r.data,'base64'))}
async function matrix(stage){for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile'],[320,568,'small']]){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await evaluate('window.scrollTo(0,0)');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),stage+' '+label);await capture('manual-'+stage+'-'+label)}}

async function heading(text){ await wait(`document.querySelector('section h2')?.textContent===${JSON.stringify(text)}`) }
async function navigate(path){ await command('Page.navigate',{url:'http://127.0.0.1:8092'+path}) }
async function clickAt(selector){ const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`); await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p}); await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p}) }
try {
 mkdirSync('/fixtures/testing/layout-qa',{recursive:true});await command('Runtime.enable');await command('Page.enable');await command('Network.clearBrowserCookies')
 await navigate('/entrar');await wait(`!!document.querySelector('input[type=email]')`)
 await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password);await evaluate(`document.querySelector('form').requestSubmit()`);await wait(`!!document.querySelector('#conteudo')`)
 await navigate('/editais');await wait(`document.querySelector('h1')?.textContent==='Editais'`)
 // Test actual pointer events and visible state, not just the details attribute.
 for(const [width,height] of [[1440,1000],[390,844],[320,568]]){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
  assert.equal(await evaluate(`document.querySelector('.sidebar-bottom').getClientRects().length`),0)
  await clickAt('.agenda-account summary');await wait(`document.querySelector('.sidebar-bottom').getClientRects().length>0`);assert.ok(await evaluate(`document.querySelector('.sidebar-bottom').getBoundingClientRect().right<=innerWidth+1`),'account fits viewport');await capture('manual-account-'+width)
  await button('Fechar minha conta');await wait(`document.querySelector('.sidebar-bottom').getClientRects().length===0`)
  await clickAt('.agenda-account summary');await wait(`document.querySelector('.agenda-account').open`)
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await wait(`document.querySelector('.sidebar-bottom').getClientRects().length===0`)
  await clickAt('.agenda-account summary');await wait(`document.querySelector('.agenda-account').open`)
  await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:8,y:400});await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:8,y:400});await wait(`document.querySelector('.sidebar-bottom').getClientRects().length===0`)
  await clickAt('.agenda-account summary');await wait(`document.querySelector('.agenda-account').open`);await clickAt('.agenda-account summary');await wait(`document.querySelector('.sidebar-bottom').getClientRects().length===0`)
 }
 await navigate('/editais/novo?manual=1');await wait(`location.pathname==='/editais/manual'`);await heading('Nome do edital');await matrix('name')
 assert.equal(await evaluate(`document.querySelectorAll('input[type=file]').length`),0)
 await fill('section input','Concurso manual, Assistente administrativo');await button('Salvar e continuar');await heading('Matérias')
 const path=await evaluate('location.pathname');assert.match(path,/^\/editais\/\d+\/manual$/)
 const noticeId=path.split('/')[2]
 await fill('section input','Língua Portuguesa');await button('Adicionar matéria');await wait(`document.querySelectorAll('section li').length===1`)
 await fill('section input','Matéria temporária');await button('Adicionar matéria');await wait(`document.querySelectorAll('section li').length===2`)
 await evaluate(`document.querySelector('[aria-label="Remover matéria Matéria temporária"]').click()`);await wait(`document.querySelectorAll('section li').length===1`)
 await fill('section input','Matemática');await button('Adicionar matéria');await wait(`document.querySelectorAll('section li').length===2`)
 await button('Continuar para tópicos');await heading('Tópicos')
 assert.ok(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Conferir edital').disabled`),'empty subjects block continuation')
 await matrix('topics')
 await fill('section textarea','Compreensão e interpretação de textos');await button('Adicionar tópico');await wait(`document.querySelectorAll('section li').length===1`)
 await evaluate(`document.querySelector('[aria-label="Remover tópico Compreensão e interpretação de textos"]').click()`);await wait(`document.querySelectorAll('section li').length===0`)
 await fill('section textarea','Compreensão e interpretação de textos');await button('Adicionar tópico');await wait(`document.querySelectorAll('section li').length===1`)
 await evaluate(`(()=>{const a=document.querySelectorAll('textarea')[1];Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(a,'Porcentagem');a.dispatchEvent(new Event('input',{bubbles:true}))})()`)
 await wait(`Array.from(document.querySelectorAll('button')).filter(b=>b.textContent==='Adicionar tópico'&&!b.disabled).length===1`)
 await button('Adicionar tópico');await wait(`document.querySelectorAll('section li').length===2`)
 await navigate('/editais');await wait(`Array.from(document.querySelectorAll('a')).some(a=>a.textContent==='Continuar cadastro')`)
 await evaluate(`Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')===${JSON.stringify(path)}).click()`);await heading('Tópicos')
 assert.equal(await evaluate(`document.querySelectorAll('section li').length`),2,'saved topics restored')
 await button('Conferir edital');await heading('Conferência');await matrix('review')
 const draft=await evaluate(`fetch('/api/v1/editais/${noticeId}').then(r=>r.json())`);assert.equal(draft.status,'draft');assert.equal(draft.source,'manual');assert.equal(draft.subjects.length,2)
 await button('Ativar edital e configurar rotina');await wait(`location.pathname==='/configuracao'`)
 const active=await evaluate(`fetch('/api/v1/editais/${noticeId}').then(r=>r.json())`);assert.equal(active.status,'confirmed')
 await navigate(path);await wait(`location.pathname.endsWith('/revisar')`)
 assert.equal(errors.length,0,errors.join('\n'))
 console.log('PASS: manual wizard without PDF/AI, saved draft and resume, subject/topic add/remove, activation validation and routine; account closes using summary/button/Escape/outside at 1440,390,320; nine responsive screenshots; zero JS exceptions.')
}catch(e){await capture('manual-account-failure');throw e}finally{await command('Browser.close').catch(()=>{});socket.close()}
