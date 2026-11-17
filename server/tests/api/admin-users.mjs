// Execute com a fixture CLI criada. Não registra senhas na saída.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const fixture = JSON.parse(readFileSync(process.env.TEST_FIXTURE ?? '/fixtures/testing/admin-users.json', 'utf8'))
const base = `${process.env.TEST_BASE_URL ?? 'http://host.docker.internal:8088'}/api`

function client() {
  const cookies = new Map()
  let csrf = ''
  return async (path, method = 'GET', body, expected = 200, useCsrf = true) => {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(useCsrf ? { 'X-CSRF-TOKEN': csrf } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0], separator = pair.indexOf('=')
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
    }
    if (response.headers.has('X-CSRF-TOKEN')) csrf = response.headers.get('X-CSRF-TOKEN')
    assert.equal(response.status, expected, `${method} ${path}: status inesperado`)
    const data = await response.json()
    if (data.user?.csrfToken || data.csrfToken) csrf = data.user?.csrfToken ?? data.csrfToken
    return { data, headers: response.headers }
  }
}

const anon = client(), admin = client(), user = client()
await anon('/v1/admin/users', 'GET', undefined, 401)
await anon('/v1/admin/users', 'POST', {}, 401)
await anon('/auth/change-password', 'POST', {}, 401)
await anon('/auth/register', 'POST', {}, 403)

const logged = await admin('/auth/login', 'POST', { email: fixture.email, password: fixture.password })
assert.equal(logged.data.user.isAdmin, true)
await admin('/v1/admin/users', 'POST', { email: `${fixture.prefix}-one@example.com` }, 403, false)
await admin('/v1/admin/users', 'POST', { email: 'invalid' }, 400)
await admin('/v1/admin/users', 'POST', { email: ['invalid'] }, 400)
await admin('/v1/admin/users', 'POST', 'invalid', 400)

const email = `${fixture.prefix}-one@example.com`
const created = await admin('/v1/admin/users', 'POST', { email, isAdmin: true, groups: ['admin'] }, 201)
assert.equal(created.headers.get('Cache-Control'), 'no-store')
assert.equal(created.headers.has('Debugbar-Link'), false, 'O convite não pode ser capturado pela barra de diagnóstico.')
assert.equal(created.data.user.isAdmin, false, 'Requisição não pode elevar privilégios.')
assert.equal(created.data.user.mustChangePassword, true)
assert.ok(created.data.message.includes(email))
assert.ok(created.data.message.includes(`${process.env.APP_BASE_URL ?? 'http://localhost:8088'}/entrar`))
const temporary = created.data.message.match(/Senha temporária: (\S+)/)?.[1]
assert.ok(temporary?.length >= 24)
await admin('/v1/admin/users', 'POST', { email: email.toUpperCase() }, 409)
const listing = (await admin('/v1/admin/users')).data
assert.ok(listing.some(u => u.email === email && u.mustChangePassword))
assert.ok(!JSON.stringify(listing).includes(temporary), 'A lista nunca retorna senhas.')

const second = await admin('/v1/admin/users', 'POST', { email: `${fixture.prefix}-two@example.com` }, 201)
assert.notEqual(second.data.message.match(/Senha temporária: (\S+)/)?.[1], temporary)
const firstLogin = await user('/auth/login', 'POST', { email, password: temporary })
assert.equal(firstLogin.data.user.mustChangePassword, true)
assert.equal((await user('/v1/me')).data.mustChangePassword, true)
await user('/auth/logout', 'POST')
await user('/v1/me', 'GET', undefined, 401)
assert.equal((await user('/auth/login', 'POST', { email, password: temporary })).data.user.mustChangePassword, true)
for (const path of ['/v1/dashboard', '/v1/editais', '/v1/admin/users']) {
  const blocked = await user(path, 'GET', undefined, 403)
  assert.equal(blocked.data.code, 'password_change_required')
}
await user('/v1/admin/users', 'POST', { email: `${fixture.prefix}-forbidden@example.com` }, 403)
await user('/auth/change-password', 'POST', { current_password: temporary, password: 'different', password_confirm: 'different' }, 403, false)
await user('/auth/change-password', 'POST', { current_password: 'wrong', password: 'different', password_confirm: 'different' }, 400)
await user('/auth/change-password', 'POST', { current_password: temporary, password: temporary, password_confirm: temporary }, 400)
await user('/auth/change-password', 'POST', { current_password: temporary, password: '123', password_confirm: '123' }, 400)
await user('/auth/change-password', 'POST', 'invalid', 400)
await user('/auth/change-password', 'POST', { current_password: temporary, password: 'password123', password_confirm: 'password123' }, 400)
const replacement = randomBytes(18).toString('hex') + 'Bb2!'
await user('/auth/change-password', 'POST', { current_password: temporary, password: replacement, password_confirm: replacement + 'x' }, 400)
const changed = await user('/auth/change-password', 'POST', { current_password: temporary, password: replacement, password_confirm: replacement })
assert.equal(changed.data.user.mustChangePassword, false)
assert.equal((await user('/v1/me')).data.mustChangePassword, false)
await user('/v1/dashboard')
await user('/v1/admin/users', 'GET', undefined, 403)
await user('/v1/admin/users', 'POST', { email: `${fixture.prefix}-forbidden@example.com` }, 403)
await user('/auth/logout', 'POST')
await user('/v1/me', 'GET', undefined, 401)
await user('/auth/login', 'POST', { email, password: temporary }, 401)
assert.equal((await user('/auth/login', 'POST', { email, password: replacement })).data.user.mustChangePassword, false)
console.log('OK: autorização admin, CSRF, senha aleatória, convite, bloqueio no primeiro acesso, validação, troca e login com a nova senha.')
