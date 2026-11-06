/** The clinic service: the daybook, filters, appointment creation, rescheduling and status changes. */
import { cleanDate, cleanDuration, cleanName, cleanNote, cleanStart, cleanStatus, cleanTone, type ClinicState, ClinicError, dateLabel, metricsOf, type Appointment, type DayMetrics, type Practitioner } from './domain.ts'
import { seed } from './seed.ts'
import type { Store } from './store.ts'
export interface ClinicAdapters { readonly store: Store<ClinicState>; readonly clock: () => Date; readonly newId: (kind: string) => string }
export interface NewAppointment { readonly patient: unknown; readonly practitionerId: unknown; readonly roomId: unknown; readonly date: unknown; readonly start: unknown; readonly durationMinutes: unknown; readonly type: unknown; readonly note?: unknown }
export class Clinic {
  private state: ClinicState
  private readonly adapters: ClinicAdapters
  private constructor(state: ClinicState, adapters: ClinicAdapters) { this.state = state; this.adapters = adapters }
  static async open(adapters: ClinicAdapters): Promise<Clinic> { const saved = await adapters.store.load(); return new Clinic(saved ?? seed(adapters.clock(), adapters.newId), adapters) }
  get now(): Date { return this.adapters.clock() }
  practitioners(): readonly Practitioner[] { return this.state.practitioners }
  practitioner(id: string): Practitioner | undefined { return this.state.practitioners.find((item) => item.id === id) }
  patients(): readonly ClinicState['patients'][number][] { return this.state.patients }
  rooms(): readonly ClinicState['rooms'][number][] { return this.state.rooms }
  appointments(filter: { date?: string; practitionerId?: string; location?: string; status?: string } = {}): Appointment[] {
    return [...this.state.appointments]
      .filter((appointment) => filter.date === undefined || appointment.date === filter.date)
      .filter((appointment) => filter.practitionerId === undefined || appointment.practitionerId === filter.practitionerId)
      .filter((appointment) => filter.location === undefined || this.practitioner(appointment.practitionerId)?.location === filter.location)
      .filter((appointment) => filter.status === undefined || appointment.status === filter.status)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  }
  appointment(id: string): Appointment | undefined { return this.state.appointments.find((appointment) => appointment.id === id) }
  today(): string { return this.now.toISOString().slice(0, 10) }
  metrics(date = this.today()): DayMetrics { return metricsOf(this.state, date) }
  dateLabel(date: string): string { return dateLabel(date) }
  async add(input: NewAppointment): Promise<Appointment> {
    const practitioner = this.practitioner(String(input.practitionerId ?? ''))
    if (practitioner === undefined) throw new ClinicError('invalid', 'Choose a practitioner.')
    const room = this.state.rooms.find((item) => item.id === String(input.roomId ?? ''))
    if (room === undefined) throw new ClinicError('invalid', 'Choose a room.')
    const appointment: Appointment = { id: this.adapters.newId('appointment'), patient: cleanName(input.patient), practitionerId: practitioner.id, roomId: room.id, date: cleanDate(input.date), start: cleanStart(input.start), durationMinutes: cleanDuration(input.durationMinutes), type: cleanName(input.type), status: 'scheduled', tone: 'teal', note: cleanNote(input.note) }
    return this.commit(() => { this.state.appointments.push(appointment); return appointment })
  }
  async reschedule(id: string, date: unknown, start: unknown): Promise<Appointment> {
    const appointment = this.appointment(id)
    if (appointment === undefined) throw new ClinicError('not-found', 'That appointment no longer exists.')
    if (appointment.status === 'cancelled') throw new ClinicError('conflict', 'A cancelled appointment cannot be rescheduled.')
    const next = { ...appointment, date: cleanDate(date), start: cleanStart(start) }
    return this.commit(() => { this.state.appointments = this.state.appointments.map((item) => (item.id === id ? next : item)); return next })
  }
  async setStatus(id: string, status: unknown): Promise<Appointment> {
    const appointment = this.appointment(id)
    if (appointment === undefined) throw new ClinicError('not-found', 'That appointment no longer exists.')
    const next = { ...appointment, status: cleanStatus(status) }
    return this.commit(() => { this.state.appointments = this.state.appointments.map((item) => (item.id === id ? next : item)); return next })
  }
  private async commit<T>(change: () => T): Promise<T> { const snapshot = structuredClone(this.state); const result = change(); try { await this.save() } catch (error) { this.state = snapshot; throw error } return result }
  private async save(): Promise<void> { this.state = { ...this.state, appointments: [...this.state.appointments] }; try { await this.adapters.store.save(this.state) } catch (error) { throw new ClinicError('storage', `The clinic could not be saved: ${(error as Error).message}`) } }
}
