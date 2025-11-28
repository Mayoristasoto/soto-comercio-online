import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'

/**
 * Convierte una fecha UTC a hora de Argentina
 */
export function toArgentinaTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return toZonedTime(dateObj, ARGENTINA_TZ)
}

/**
 * Convierte una fecha de Argentina a UTC
 */
export function fromArgentinaTime(date: Date): Date {
  return fromZonedTime(date, ARGENTINA_TZ)
}

/**
 * Formatea una timestamp UTC mostrando la hora de Argentina
 */
export function formatArgentinaDate(timestamp: string, formatStr: string = 'dd/MM/yyyy'): string {
  const argDate = toArgentinaTime(timestamp)
  return format(argDate, formatStr)
}

/**
 * Formatea una timestamp UTC mostrando la hora de Argentina
 */
export function formatArgentinaTime(timestamp: string, formatStr: string = 'HH:mm:ss'): string {
  const argDate = toArgentinaTime(timestamp)
  return format(argDate, formatStr)
}

/**
 * Formatea una timestamp UTC mostrando fecha y hora de Argentina
 */
export function formatArgentinaDateTime(timestamp: string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const argDate = toArgentinaTime(timestamp)
  return format(argDate, formatStr)
}

/**
 * Obtiene el inicio del día en Argentina en UTC
 * Para usarse en queries de Supabase
 */
export function getArgentinaStartOfDay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  // Crear fecha en Argentina a las 00:00:00
  const argDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0)
  // Convertir a UTC
  const utcDate = fromArgentinaTime(argDate)
  return utcDate.toISOString()
}

/**
 * Obtiene el fin del día en Argentina en UTC
 * Para usarse en queries de Supabase
 */
export function getArgentinaEndOfDay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  // Crear fecha en Argentina a las 23:59:59.999
  const argDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999)
  // Convertir a UTC
  const utcDate = fromArgentinaTime(argDate)
  return utcDate.toISOString()
}

/**
 * Obtiene la fecha en formato YYYY-MM-DD considerando zona horaria de Argentina
 */
export function getArgentinaDateString(timestamp: string): string {
  const argDate = toArgentinaTime(timestamp)
  return format(argDate, 'yyyy-MM-dd')
}

/**
 * Obtiene la hora en formato HH:mm considerando zona horaria de Argentina
 */
export function getArgentinaTimeString(timestamp: string): string {
  const argDate = toArgentinaTime(timestamp)
  return format(argDate, 'HH:mm')
}