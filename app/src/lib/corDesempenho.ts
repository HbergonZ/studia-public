// Faixa de calibração: mesmos cortes usados por calcularDesempenho (curva.ts) para "ruim"/"bom"
const DESEMPENHO_MIN = 50 // abaixo disso conta como "ruim" -> vermelho
const DESEMPENHO_MAX = 80 // a partir disso conta como "bom" -> verde

export function corDesempenho(pct: number) {
  const proporcao = Math.max(0, Math.min(1, (pct - DESEMPENHO_MIN) / (DESEMPENHO_MAX - DESEMPENHO_MIN)))
  const matiz = proporcao * 120 // 0 = vermelho, 60 = amarelo, 120 = verde
  return `hsl(${matiz}, 75%, 55%)`
}

// Espectro fixo (vermelho -> amarelo -> verde) usado como trilha da barra de desempenho,
// distribuído de forma uniforme ao longo de toda a barra (sem trecho "só vermelho").
export function gradienteDesempenho() {
  return 'linear-gradient(to right, hsl(0, 75%, 55%) 0%, hsl(45, 80%, 55%) 50%, hsl(120, 70%, 50%) 100%)'
}
