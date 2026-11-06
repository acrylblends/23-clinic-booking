/** Clinic Booking's types and pure rules: practitioners, patients, rooms, appointments, slots and the day metrics. */
export type Status = 'scheduled' | 'checked-in' | 'completed' | 'cancelled'
export type Tone = 'teal' | 'coral' | 'blue'
export interface Practitioner { readonly id: string; readonly name: string; readonly specialty: string; readonly initials: string; readonly color: string; readonly location: string }
export interface Patient { readonly id: string; readonly name: string; readonly phone: string }
export interface Room { readonly id: string; readonly name: string; readonly floor: string }
export interface Appointment { readonly id: string; readonly patient: string; readonly practitionerId: string; readonly roomId: string; readonly date: string; readonly start: string; readonly durationMinutes: number; readonly type: string; readonly status: Status; readonly tone: Tone; readonly note: string }
export interface ClinicState { readonly version: 1; practitioners: Practitioner[]; patients: Patient[]; rooms: Room[]; appointments: Appointment[] }
export type ClinicErrorCode = 'invalid' | 'not-found' | 'conflict' | 'storage'
export class ClinicError extends Error { readonly code: ClinicErrorCode; constructor(code: ClinicErrorCode, message: string) { super(message); this.code = code; this.name = 'ClinicError' } }
export const SLOTS_PER_DAY = 27
export const DAY_START = 8 * 60
export function dateLabel(date: string): string { const d = new Date(`${date}T00:00:00Z`); const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }); const month = d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }); return `${weekday}, ${String(d.getUTCDate())} ${month} ${String(d.getUTCFullYear())}` }
export function timeText(minutes: number): string { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` }
export function parseTime(value: string): number { const match = /^(\d{2}):(\d{2})$/.exec(value); if (match === null) throw new ClinicError('invalid', 'The time looks like 09:30.'); return Number(match[1]) * 60 + Number(match[2]) }
export function topOf(start: string): number { return Math.round(7 + (parseTime(start) - DAY_START) * 1.4) }
export function statusLabel(status: Status): string { return status === 'checked-in' ? 'Checked in' : status[0]?.toUpperCase() + status.slice(1) }
export function cleanName(value: unknown): string { if (typeof value !== 'string' || value.trim() === '') throw new ClinicError('invalid', 'A name is required.'); return value.trim().slice(0, 80) }
export function cleanDate(value: unknown): string { const text = typeof value === 'string' ? value.trim() : ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new ClinicError('invalid', 'Enter the date as YYYY-MM-DD.'); return text }
export function cleanStart(value: unknown): string { const text = typeof value === 'string' ? value.trim() : ''; if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) throw new ClinicError('invalid', 'The time looks like 09:30.'); return text }
export function cleanDuration(value: unknown): number { const number = Number(value); if (!Number.isFinite(number) || number < 10 || number > 120) throw new ClinicError('invalid', 'The duration must be 10 to 120 minutes.'); return Math.round(number) }
export function cleanNote(value: unknown): string { return typeof value === 'string' ? value.trim().slice(0, 300) : '' }
export function cleanTone(value: unknown): Tone { return value === 'coral' || value === 'blue' ? value : 'teal' }
export function cleanStatus(value: unknown): Status { return value === 'checked-in' || value === 'completed' || value === 'cancelled' || value === 'scheduled' ? value : 'scheduled' }
export interface DayMetrics { readonly today: number; readonly checkedIn: number; readonly available: number; readonly cancellationRate: number }
export function metricsOf(state: ClinicState, date: string): DayMetrics {
  const today = state.appointments.filter((appointment) => appointment.date === date)
  const cancelled = state.appointments.filter((appointment) => appointment.status === 'cancelled').length
  return { today: today.length, checkedIn: today.filter((appointment) => appointment.status === 'checked-in').length, available: Math.max(0, SLOTS_PER_DAY - today.filter((appointment) => appointment.status !== 'cancelled').length), cancellationRate: state.appointments.length === 0 ? 0 : Math.round((cancelled / state.appointments.length) * 1000) / 10 }
}
