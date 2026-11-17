import { Link } from 'react-router-dom'

export default function NaoEncontrada() {
  return <section className="daily-empty"><h1>Página não encontrada</h1><p>Este endereço não existe ou mudou. Você pode voltar aos estudos ou escolher um edital.</p><div className="daily-links"><Link className="primary-link" to="/">Ir para Hoje</Link><Link className="quiet-link" to="/editais">Ver editais</Link></div></section>
}
