import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { CarregamentoPaginaProvider } from './context/CarregamentoPaginaContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CarregamentoPaginaProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CarregamentoPaginaProvider>
    </BrowserRouter>
  </StrictMode>,
)
