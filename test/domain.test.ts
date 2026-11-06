import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Clinic, ClinicError, metricsOf, parseTime, timeText, topOf, type ClinicState } from '../plugins/clinic/index.ts'
import { seed, SEED_FACTS } from '../plugins/clinic/seed.ts'
import { memoryStore } from '../plugins/clinic/store.ts'
import { NOW } from './support.ts'
const ids = (): ((kind: string) => string) => { let next = 0; return (kind) => `${kind}-${String(++next)}` }
const open = (): Promise<Clinic> => Clinic.open({ store: memoryStore<ClinicState>(), clock: () => NOW, newId: ids() })
test('the seed is the Willow Clinic day: 18 appointments, six checked in, nine slots and 4.2% cancellations', () => {
  const state = seed(NOW, ids())
  assert.equal(state.practitioners.length, SEED_FACTS.practitioners)
  assert.equal(state.patients.length, SEED_FACTS.patients)
  assert.equal(state.rooms.length, SEED_FACTS.rooms)
  const metrics = metricsOf(state, '2026-11-04')
  assert.equal(metrics.today, 18); assert.equal(metrics.checkedIn, 6); assert.equal(metrics.available, 9); assert.equal(metrics.cancellationRate, 4.2)
  assert.equal(state.appointments[0]?.patient, 'Mia Bauer')
  assert.equal(state.appointments[0]?.start, '08:00')
})
test('time helpers and validation', () => {
  assert.equal(parseTime('09:30'), 570); assert.equal(timeText(570), '09:30'); assert.equal(topOf('08:00'), 7)
  assert.throws(() => parseTime('9:30'), /09:30/)
})
test('adding, rescheduling and status changes persist', async () => {
  const store = memoryStore<ClinicState>()
  const clinic = await Clinic.open({ store, clock: () => NOW, newId: ids() })
  const doctor = clinic.practitioners()[0]!; const room = clinic.rooms()[0]!
  const appointment = await clinic.add({ patient: 'New Patient', practitionerId: doctor.id, roomId: room.id, date: '2026-11-04', start: '15:00', durationMinutes: 30, type: 'Follow-up', note: 'First visit' })
  assert.equal(clinic.metrics('2026-11-04').today, 19)
  const moved = await clinic.reschedule(appointment.id, '2026-11-05', '10:00')
  assert.equal(moved.start, '10:00')
  const checked = await clinic.setStatus(appointment.id, 'checked-in')
  assert.equal(checked.status, 'checked-in')
  await assert.rejects(clinic.add({ patient: '', practitionerId: doctor.id, roomId: room.id, date: '2026-11-04', start: '15:00', durationMinutes: 30, type: 'Follow-up' }), /name/)
  await assert.rejects(clinic.add({ patient: 'X', practitionerId: 'missing', roomId: room.id, date: '2026-11-04', start: '15:00', durationMinutes: 30, type: 'Follow-up' }), /practitioner/)
  assert.equal(store.saved, 3)
})
test('the day filters by practitioner and location', async () => {
  const clinic = await open()
  const doctor = clinic.practitioners()[1]!
  assert.ok(clinic.appointments({ date: '2026-11-04', practitionerId: doctor.id }).every((appointment) => appointment.practitionerId === doctor.id))
  assert.ok(clinic.appointments({ date: '2026-11-04', location: 'West practice' }).every((appointment) => clinic.practitioner(appointment.practitionerId)?.location === 'West practice'))
})
test('a failed save is a storage error', async () => {
  const broken = await Clinic.open({ store: { load: async () => undefined, save: async () => { throw new Error('disk full') } }, clock: () => NOW, newId: ids() })
  const appointment = broken.appointments()[0]!
  await assert.rejects(broken.setStatus(appointment.id, 'checked-in'), (error: unknown) => error instanceof ClinicError && error.code === 'storage')
})
