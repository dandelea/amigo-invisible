// Formato de fechas e importes en español de España.

const parse = (isoDate: string) => new Date(`${isoDate}T12:00:00`)

// «20 dic 2026»
export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(parse(isoDate))
    .replace(/\./g, '')
}

// «sábado 20 de diciembre de 2026»
export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(parse(isoDate))
    .replace(',', '')
}

// «15 €», «15,50 €»
export function formatBudget(euros: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros)
}

// Fecha de hoy en formato YYYY-MM-DD, en la zona horaria del navegador.
export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase('es') ?? '?'
}
