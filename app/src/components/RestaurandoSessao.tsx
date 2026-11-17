import { IconBook } from './icons'

export default function RestaurandoSessao() {
  return <main className="session-restore" aria-busy="true" aria-label="Verificando sua sessão">
    <p className="auth-brand"><IconBook className="h-6 w-6" />Studia</p>
    <span className="sr-only">Verificando sua sessão</span>
  </main>
}
