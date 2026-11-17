import { Component, type ReactNode } from 'react'

export default class ErroPagina extends Component<{children: ReactNode}, {falhou: boolean}> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() {
    if (!this.state.falhou) return this.props.children
    return <main className="auth-page"><section className="auth-card"><h1 className="text-xl font-semibold">Não foi possível abrir esta página</h1><p className="mt-3 text-muted">A conexão pode ter sido interrompida ou o sistema recebeu uma atualização. Seus estudos já salvos continuam disponíveis.</p><div className="daily-links mt-5"><button type="button" className="daily-button daily-button-primary" onClick={() => location.reload()}>Atualizar página</button><button type="button" className="daily-button" onClick={() => location.assign('/')}>Voltar para Hoje</button></div></section></main>
  }
}
