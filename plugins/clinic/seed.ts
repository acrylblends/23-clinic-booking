/** The Willow Clinic daybook: three practitioners, four rooms, 18 appointments on 4 November 2026 and a month of history. */
import type { Appointment, ClinicState, Patient, Practitioner, Room, Tone } from './domain.ts'
const PRACTITIONERS: readonly Omit<Practitioner, 'id'>[] = [
  { name: 'Dr. Elena Fischer', specialty: 'General practice', initials: 'EF', color: '#2c7774', location: 'Central clinic' },
  { name: 'Dr. Kovač', specialty: 'Dermatology', initials: 'MK', color: '#b76d5b', location: 'Central clinic' },
  { name: 'Dr. Lang', specialty: 'Physiotherapy', initials: 'TL', color: '#8067ad', location: 'West practice' },
]
const PATIENT_NAMES = ['Mia Bauer', 'Jonas Weber', 'Lena Hoffmann', 'Paul Gruber', 'Sara Leitner', 'David Maier', 'Anna Winkler', 'Markus Huber', 'Eva Schmid', 'Clara Steiner', 'Felix Wagner', 'Nina Berger', 'Tobias Roth', 'Lea Fuchs', 'Simon Wolf', 'Julia Pichler', 'Max Hofer', 'Laura Kern']
const SLOTS: readonly { start: string; durationMinutes: number; type: string; tone: Tone; room: number; practitioner: number; status: Appointment['status']; patient?: string }[] = [
  { start: '08:00', durationMinutes: 45, type: 'Follow-up', tone: 'teal', room: 2, practitioner: 0, status: 'checked-in', patient: 'Mia Bauer' },
  { start: '09:00', durationMinutes: 45, type: 'Initial consultation', tone: 'coral', room: 2, practitioner: 0, status: 'checked-in', patient: 'Jonas Weber' },
  { start: '11:00', durationMinutes: 45, type: 'Routine check-up', tone: 'teal', room: 1, practitioner: 0, status: 'checked-in', patient: 'Lena Hoffmann' },
  { start: '12:00', durationMinutes: 50, type: 'Vaccination', tone: 'blue', room: 2, practitioner: 0, status: 'checked-in', patient: 'Paul Gruber' },
  { start: '08:30', durationMinutes: 45, type: 'Skin consultation', tone: 'blue', room: 3, practitioner: 1, status: 'checked-in', patient: 'Sara Leitner' },
  { start: '10:00', durationMinutes: 45, type: 'Review', tone: 'teal', room: 3, practitioner: 1, status: 'checked-in', patient: 'David Maier' },
  { start: '13:00', durationMinutes: 45, type: 'New patient', tone: 'coral', room: 3, practitioner: 1, status: 'scheduled', patient: 'Anna Winkler' },
  { start: '08:00', durationMinutes: 45, type: 'Physiotherapy session', tone: 'teal', room: 4, practitioner: 2, status: 'scheduled', patient: 'Markus Huber' },
  { start: '11:00', durationMinutes: 45, type: 'Mobility assessment', tone: 'blue', room: 4, practitioner: 2, status: 'scheduled', patient: 'Eva Schmid' },
  { start: '14:00', durationMinutes: 45, type: 'Follow-up', tone: 'teal', room: 2, practitioner: 0, status: 'scheduled', patient: 'Clara Steiner' },
  { start: '15:00', durationMinutes: 30, type: 'Routine check-up', tone: 'teal', room: 1, practitioner: 0, status: 'scheduled', patient: 'Felix Wagner' },
  { start: '16:00', durationMinutes: 30, type: 'Review', tone: 'teal', room: 2, practitioner: 0, status: 'scheduled', patient: 'Nina Berger' },
  { start: '14:00', durationMinutes: 45, type: 'Follow-up', tone: 'teal', room: 3, practitioner: 1, status: 'scheduled', patient: 'Tobias Roth' },
  { start: '15:30', durationMinutes: 30, type: 'Review', tone: 'teal', room: 3, practitioner: 1, status: 'scheduled', patient: 'Julia Pichler' },
  { start: '16:30', durationMinutes: 45, type: 'New patient', tone: 'coral', room: 3, practitioner: 1, status: 'scheduled', patient: 'Lea Fuchs' },
  { start: '14:00', durationMinutes: 45, type: 'Physiotherapy session', tone: 'teal', room: 4, practitioner: 2, status: 'scheduled', patient: 'Simon Wolf' },
  { start: '15:00', durationMinutes: 45, type: 'Follow-up', tone: 'teal', room: 4, practitioner: 2, status: 'scheduled', patient: 'Laura Kern' },
  { start: '16:00', durationMinutes: 45, type: 'Physiotherapy session', tone: 'teal', room: 4, practitioner: 2, status: 'scheduled', patient: 'Max Hofer' },
]
export function seed(_now: Date, newId: (kind: string) => string): ClinicState {
  const practitioners: Practitioner[] = PRACTITIONERS.map((item) => ({ ...item, id: newId('practitioner') }))
  const patients: Patient[] = PATIENT_NAMES.map((name, index) => ({ id: newId('patient'), name, phone: `+43 660 100 20${String(index).padStart(2, '0')}` }))
  const rooms: Room[] = [1, 2, 3, 4].map((number) => ({ id: newId('room'), name: `Room 0${String(number)}`, floor: number < 3 ? 'Ground floor' : 'First floor' }))
  const appointments: Appointment[] = SLOTS.map((slot, index) => ({ id: newId('appointment'), patient: slot.patient ?? (PATIENT_NAMES[index % PATIENT_NAMES.length] as string), practitionerId: (practitioners[slot.practitioner] as Practitioner).id, roomId: (rooms[slot.room - 1] as Room).id, date: '2026-11-04', start: slot.start, durationMinutes: slot.durationMinutes, type: slot.type, status: slot.status, tone: slot.tone, note: '' }))
  for (let index = 0; index < 30; index += 1) {
    const day = 5 + (index % 25)
    appointments.push({ id: newId('appointment'), patient: PATIENT_NAMES[index % PATIENT_NAMES.length] as string, practitionerId: (practitioners[index % 3] as Practitioner).id, roomId: (rooms[index % 4] as Room).id, date: `2026-10-${String(day).padStart(2, '0')}`, start: '09:00', durationMinutes: 30, type: 'Follow-up', status: index < 2 ? 'cancelled' : 'completed', tone: 'teal', note: '' })
  }
  return { version: 1, practitioners, patients, rooms, appointments }
}
export const SEED_FACTS = { practitioners: 3, patients: 18, rooms: 4, today: 18, checkedIn: 6, available: 9, cancellationRate: 4.2 } as const
