import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { EstudoProvider } from './context/EstudoContext'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EstudoProvider>
          <App />
        </EstudoProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
