import { useState } from 'react'

export default function CampoSalvavel({ valor, onSalvar, ...props }: { valor: string; onSalvar: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [texto, setTexto] = useState<string | null>(null)
  return <input {...props} value={texto ?? valor} onFocus={() => setTexto(valor)} onChange={event => setTexto(event.target.value)} onBlur={() => {
    if (texto !== null && texto.trim() !== valor && texto.trim()) onSalvar(texto.trim())
    setTexto(null)
  }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
}
