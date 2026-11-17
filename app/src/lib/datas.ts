export function dataLocal(data = new Date()): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

export function lerData(data: string): Date {
  // Dates from the API represent calendar days, not UTC instants.
  return new Date(`${data.slice(0, 10)}T12:00:00`)
}

export function diaNoFuso(timezone: string, agora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(agora)
  const valor = (tipo: string) => partes.find(parte => parte.type === tipo)?.value ?? ''
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}
