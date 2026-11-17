import { lazy, Suspense } from 'react'
import Carregamento from './components/Carregamento'
import NaoEncontrada from './pages/NaoEncontrada'
import ErroPagina from './components/ErroPagina'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
const Planejamento = lazy(() => import('./pages/Planejamento'))
const Progresso = lazy(() => import('./pages/Progresso'))
const CadastroManual = lazy(() => import('./pages/CadastroManual'))
const UploadEdital = lazy(() => import('./pages/UploadEdital'))
const Editais = lazy(() => import('./pages/Editais'))
const ImportarCargo = lazy(() => import('./pages/ImportarCargo'))
const OrganizarEstudos = lazy(() => import('./pages/OrganizarEstudos'))
const RevisarExtracao = lazy(() => import('./pages/RevisarExtracao'))
const Configuracao = lazy(() => import('./pages/Configuracao'))
const VisaoGeral = lazy(() => import('./pages/VisaoGeral'))
import Autenticacao from './pages/Autenticacao'
import TrocarSenha from './pages/TrocarSenha'
const Usuarios = lazy(() => import('./pages/Usuarios'))
import { useAuth } from './context/AuthContext'
import { EstudoProvider, useEstudo } from './context/EstudoContext'
import RestaurandoSessao from './components/RestaurandoSessao'
import { useCarregamentoPagina } from './context/CarregamentoPaginaContext'

function Protegido() {
  const { usuario, restaurandoSessao } = useAuth()
  if (restaurandoSessao && !usuario) return <RestaurandoSessao />
  if (!usuario) return <Autenticacao />
  if (usuario?.mustChangePassword) return <TrocarSenha />
  return <EstudoProvider><Layout /></EstudoProvider>
}

function DadosEstudo() {
  const { carregando, statusEdital } = useEstudo()
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  // Login already confirms there is no active notice. The welcome screen needs
  // no study data; settings and other data-dependent pages still wait for them.
  const inicioSemEdital = pathname === '/' && usuario?.hasActiveNotice === false && statusEdital === 'vazio'
  const aguardandoDados = carregando && !inicioSemEdital
  useCarregamentoPagina(aguardandoDados)
  return aguardandoDados ? null : <Outlet />
}

export default function App() {
  const { usuario } = useAuth()
  if (usuario?.mustChangePassword) return <TrocarSenha />
  return (
    <ErroPagina><Suspense fallback={<Carregamento rotulo="Abrindo página" />}><Routes>
      <Route path="entrar" element={<Autenticacao />} />
      <Route path="trocar-senha" element={<Navigate to="/" replace />} />
      <Route element={<Protegido />}>
        <Route element={<DadosEstudo />}>
          <Route index element={<Dashboard />} />
          <Route path="planejamento" element={<Planejamento />} />
          <Route path="progresso" element={<Progresso />} />
          <Route path="visao-geral" element={<VisaoGeral />} />
          <Route path="editais/:id/revisar" element={<RevisarExtracao />} />
          <Route path="edital/revisar" element={<RevisarExtracao />} />
          <Route path="configuracao" element={<Configuracao />} />
        </Route>
        <Route path="edital" element={<Navigate to="/editais" replace />} />
        <Route path="editais" element={<Editais />} />
        <Route path="editais/manual" element={<CadastroManual />} />
        <Route path="editais/:id/manual" element={<CadastroManual />} />
        <Route path="editais/novo" element={<UploadEdital />} />
        <Route path="editais/:id/cargo" element={<ImportarCargo />} />
        <Route path="editais/:id/organizar" element={<OrganizarEstudos />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes></Suspense></ErroPagina>
  )
}
