import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UploadEdital from './pages/UploadEdital'
import Editais from './pages/Editais'
import RevisarExtracao from './pages/RevisarExtracao'
import Configuracao from './pages/Configuracao'
import VisaoGeral from './pages/VisaoGeral'
import Autenticacao from './pages/Autenticacao'
import { useAuth } from './context/AuthContext'

function Protegido() {
  const { usuario, carregando } = useAuth()
  if (carregando) return <div className="flex min-h-screen items-center justify-center bg-navy-950 text-slate-400">Carregando…</div>
  return usuario ? <Layout /> : <Navigate to="/entrar" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="entrar" element={<Autenticacao />} />
      <Route element={<Protegido />}>
        <Route index element={<Dashboard />} />
        <Route path="visao-geral" element={<VisaoGeral />} />
        <Route path="edital" element={<Navigate to="/editais" replace />} />
        <Route path="editais" element={<Editais />} />
        <Route path="editais/novo" element={<UploadEdital />} />
        <Route path="editais/:id/revisar" element={<RevisarExtracao />} />
        <Route path="edital/revisar" element={<RevisarExtracao />} />
        <Route path="configuracao" element={<Configuracao />} />
      </Route>
    </Routes>
  )
}
