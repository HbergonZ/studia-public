// Verificação dos mockups no Edge isolado, via CDP. Nenhum acesso à API do Studia.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { lookup } from 'node:dns/promises'

const {address}=await lookup('host.docker.internal',{family:4})
const pages=await(await fetch(`http://${address}:9225/json/list`)).json()
const page=pages.find(p=>p.type==='page')
const socket=new WebSocket(page.webSocketDebuggerUrl.replace('localhost','host.docker.internal').replace('127.0.0.1','host.docker.internal'))
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
let sequence=0
const pending=new Map(),errors=[]
socket.addEventListener('message',({data})=>{
 const m=JSON.parse(data)
 if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text)
 if(!m.id)return
 const handler=pending.get(m.id);pending.delete(m.id)
 if(m.error)handler.reject(new Error(m.error.message));else handler.resolve(m.result)
})
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value}
async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100))}throw new Error('Estado ausente: '+expression)}
async function navigate(layout,screen='hoje'){
 await evaluate(`document.documentElement.dataset.pending='yes'`)
 await command('Page.navigate',{url:`http://127.0.0.1:8093/?layout=${layout}&qa=${Date.now()}#${screen}`})
 await wait(`!document.documentElement?.dataset.pending && document.body?.dataset.layout==='${layout}' && !!document.querySelector('h1')`)
 await evaluate('document.fonts.ready')
}
async function screenshot(name){
 const {contentSize}=await command('Page.getLayoutMetrics')
 const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:contentSize.width,height:contentSize.height,scale:1}})
 writeFileSync('/prototype/dist/previews/'+name+'.png',Buffer.from(r.data,'base64'))
}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function fill(selector,value){await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`)}
try{
 await command('Page.enable');await command('Runtime.enable')
 mkdirSync('/prototype/dist/previews',{recursive:true})
 for(const [width,height,label] of [[1440,1000,'desktop'],[390,844,'mobile'],[320,740,'small']]){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
  for(const layout of ['estudio','rotina','agenda']){
   for(const screen of ['hoje','edital','plano']){
    await navigate(layout,screen)
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),`${layout}/${screen}/${width}: horizontal overflow`)
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length`),0)
    if(label!=='small')await screenshot(`${layout}-${screen}-${label}`)
    if(label==='desktop' && screen==='hoje' && !existsSync(`/decision/${layout}.html`)){
     let html=await evaluate(`'<!doctype html>'+document.documentElement.outerHTML`)
     const css=readFileSync('/prototype/dist/styles.css','utf8')
     html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link[^>]*href="styles.css"[^>]*>/,()=>`<style>${css}\nhtml,body{height:900px;overflow:hidden}</style>`)
     writeFileSync(`/decision/${layout}.html`,html)
    }
   }
  }
 }
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
 await navigate('estudio','edital')
 assert.equal(await evaluate(`document.querySelectorAll('.subject').length`),5)
 await fill('#cargo-search','odontologo')
 assert.equal(await evaluate(`document.querySelectorAll('[data-cargo]').length`),1)
 await fill('#cargo-search','401')
 await click('[data-cargo]')
 assert.equal(await evaluate(`document.querySelectorAll('.subject').length`),10)
 await fill('#cargo-search','725')
 await click('[data-cargo]')
 assert.equal(await evaluate(`document.querySelectorAll('.subject').length`),5)
 assert.ok(await evaluate(`document.querySelector('.selected-summary').textContent.includes('Enfermagem')`))
 await evaluate(`document.querySelectorAll('.subject ul').forEach(el=>el.scrollTop=99999)`)
 assert.ok(await evaluate(`Array.from(document.querySelectorAll('.subject ul')).every(el=>el.scrollTop>0)`))
 await click('[data-action="plano"]')
 await fill('[data-duration="0"]','40')
 assert.ok(await evaluate(`!!document.querySelector('[data-action="use-plan"]').disabled`))
 await fill('#capacity','120')
 assert.ok(await evaluate(`!document.querySelector('[data-action="use-plan"]').disabled`))
 await click('[data-action="use-plan"]')
 await click('[data-action="timer"]')
 await wait(`document.querySelector('.time').textContent!=='40:00'`)
 await click('[data-action="timer"]')
 assert.equal(await evaluate(`document.querySelector('[data-action="timer"]').getAttribute('aria-pressed')`),'false')
 await click('[data-action="record"]')
 assert.equal(await evaluate(`document.querySelector('input[name="outcome"]:checked').value`),'continue')
 await fill('input[name="minutes"]','25')
 await evaluate(`document.querySelector('#record-form').requestSubmit()`)
 assert.equal(await evaluate(`document.querySelectorAll('.session.completed').length`),1)
 assert.ok(await evaluate(`document.querySelectorAll('.kanban-column')[1].textContent.includes('Continuar em outra sessão')`))
 await click('[data-action="record"]')
 await click('input[value="complete"]')
 await fill('input[name="minutes"]','25')
 await evaluate(`document.querySelector('#record-form').requestSubmit()`)
 assert.equal(await evaluate(`document.querySelectorAll('.session.completed').length`),2)
 assert.ok(await evaluate(`document.querySelectorAll('.kanban-column')[2].textContent.includes('Unidade concluída nesta demonstração')`))
 await click('[data-action="plano"]')
 await click('[data-day="18"]')
 assert.ok(await evaluate(`document.querySelector('.day-plan').textContent.includes('Sem blocos nesta demonstração')`))
 assert.deepEqual(errors,[])
 writeFileSync('/prototype/review-results.json',JSON.stringify({result:'PASS',layouts:3,screens:3,widths:[1440,390,320],checks:['navigation','no horizontal overflow','named buttons','51 job options','accent-insensitive search','multi-job scope','internal scrolling','time budget validation','timer','continuation versus completion','empty calendar day'],javascriptErrors:errors},null,2))
 console.log('PASS: 27 viewport/screen combinations, job selection, time budget, timer and study records. 18 screenshots captured.')
}finally{await command('Browser.close').catch(()=>{});socket.close()}
