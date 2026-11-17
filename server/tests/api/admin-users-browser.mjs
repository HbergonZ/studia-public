// Requer Edge/Chrome isolado com --remote-debugging-port=9224 e a fixture CLI.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { lookup } from 'node:dns/promises'

const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json', 'utf8'))
const base = process.env.TEST_BASE_URL ?? 'http://localhost:8088'
const { address } = await lookup('host.docker.internal', { family: 4 })
const pages = await (await fetch(`http://${address}:9224/json/list`)).json()
const page = pages.find(p => p.type === 'page' && p.url === 'about:blank')
assert.ok(page, 'Abra about:blank no navegador isolado.')
const socket = new WebSocket(page.webSocketDebuggerUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal'))
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let sequence = 0
const pending = new Map()
const browserErrors = []
const responses = []
let simulatedStaleProfile = false
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.method === 'Fetch.requestPaused') {
    void (async () => {
      const { requestId, responseStatusCode, responseHeaders } = message.params
      const result = await command('Fetch.getResponseBody', { requestId })
      const payload = JSON.parse(result.base64Encoded ? Buffer.from(result.body, 'base64').toString() : result.body)
      if (payload.user?.mustChangePassword) {
        payload.user.mustChangePassword = false
        simulatedStaleProfile = true
      }
      await command('Fetch.fulfillRequest', {
        requestId, responseCode: responseStatusCode,
        responseHeaders: responseHeaders.filter(header => !['content-length', 'content-encoding'].includes(header.name.toLowerCase())),
        body: Buffer.from(JSON.stringify(payload)).toString('base64'),
      })
    })().catch(error => browserErrors.push(error.message))
  }
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') browserErrors.push(message.params.args.map(arg => arg.description ?? arg.value ?? '').join(' ').slice(0, 1200))
  if (message.method === 'Network.responseReceived' && message.params.response.url.startsWith(base)) responses.push({ url: message.params.response.url, status: message.params.response.status })
  if (!message.id) return
  const handler = pending.get(message.id)
  if (!handler) return
  pending.delete(message.id)
  if (message.error) handler.reject(new Error(message.error.message))
  else handler.resolve(message.result)
})
function command(method, params = {}) {
  return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })) })
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  assert.ok(!result.exceptionDetails, 'A execução no navegador falhou.')
  return result.result.value
}
async function wait(expression) {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(expression)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const state = await evaluate(`JSON.stringify({ path: location.pathname, ready: document.readyState, rootText: document.querySelector('textarea') ? 'mensagem' : document.getElementById('root')?.textContent?.slice(0, 250), title: document.querySelector('h1')?.textContent, error: document.querySelector('[role=alert]')?.textContent })`)
  throw new Error('A interface não chegou ao estado esperado: ' + state + '\n' + browserErrors.join('\n') + '\n' + JSON.stringify(responses.slice(-12)))
}
async function fill(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
}
async function navigate(path) { await command('Page.navigate', { url: base + path }) }
async function login(email, password) {
  await navigate('/entrar')
  await wait(`location.pathname === '/entrar' && document.querySelector('h1')?.textContent === 'Entrar' && !!document.querySelector('input[type=email]')`)
  await fill('input[type=email]', email)
  await fill('input[type=password]', password)
  await evaluate(`document.querySelector('form').requestSubmit()`)
}

try {
  await command('Network.enable')
  await command('Page.enable')
  await command('Network.setCacheDisabled', { cacheDisabled: true })
  await command('Runtime.enable')
  await command('Page.bringToFront')
  await command('Browser.grantPermissions', { origin: base, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
  await command('Network.clearBrowserCookies')
  await login(fixture.email, fixture.password)
  await wait(`!!document.querySelector('a[href="/usuarios"]')`)
  await evaluate(`document.querySelector('a[href="/usuarios"]').click()`)
  await wait(`document.querySelector('h1')?.textContent === 'Usuários'`)
  const email = fixture.prefix + '-ui-' + randomBytes(3).toString('hex') + '@example.com'
  await fill('input[type=email]', email)
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await wait(`!!document.querySelector('textarea[aria-label="Mensagem de acesso"]')`)
  const message = await evaluate(`document.querySelector('textarea').value`)
  assert.ok(message.includes(email))
  const temporary = message.match(/Senha temporária: (\S+)/)?.[1]
  assert.ok(temporary)
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Copiar mensagem').click()`)
  await wait(`Array.from(document.querySelectorAll('button')).some(b => b.textContent === 'Copiado')`)
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Fechar mensagem').click()`)
  assert.equal(await evaluate(`!!document.querySelector('textarea')`), false)
  await evaluate(`fetch('/api/auth/logout', { method: 'POST' })`)
  await command('Network.clearBrowserCookies')
  await command('Fetch.enable', { patterns: [{ urlPattern: '*/api/auth/login', requestStage: 'Response' }] })
  await login(email, temporary)
  await wait(`document.querySelector('h1')?.textContent === 'Escolha sua senha'`)
  assert.equal(simulatedStaleProfile, true, 'O bloqueio da API deve recuperar um perfil desatualizado na interface.')
  await command('Fetch.disable')
  await navigate('/entrar')
  await wait(`document.querySelector('h1')?.textContent === 'Escolha sua senha'`)
  await navigate('/trocar-senha')
  await wait(`document.querySelector('h1')?.textContent === 'Escolha sua senha'`)
  await navigate('/usuarios')
  await wait(`document.querySelector('h1')?.textContent === 'Escolha sua senha'`)
  const replacement = randomBytes(18).toString('hex') + 'Cc3!'
  await fill('input[autocomplete=current-password]', temporary)
  await fill('input[autocomplete=new-password]', replacement)
  await fill('label:nth-of-type(3) input', replacement)
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await wait(`!!document.querySelector('nav') && !document.querySelector('a[href="/usuarios"]')`)
  assert.equal(await evaluate(`document.querySelector('h1')?.textContent === 'Usuários'`), false)
  console.log('OK no navegador: menu admin, criação, mensagem, cópia, troca obrigatória e restrição da área administrativa.')
} finally {
  await command('Browser.close').catch(() => {})
  socket.close()
}
