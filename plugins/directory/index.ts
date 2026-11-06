/** Directory at `/patients`, `/practitioners` and `/rooms`: the clinic's people and spaces with their records. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import type { Clinic } from '../clinic/index.ts'
import type { Shell } from '../clinic-shell/index.ts'
export const name = 'directory'
export const inject = ['clinic', 'shell', 'router']
export function apply(ctx: Context): void {
  const { clinic, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const page = (title: string, kicker: string, rows: string, active: string): string => shell.page({ title, active, main: `<main class="content"><div class="top"><div class="title"><h1>${title}</h1><p>${kicker}</p></div><a class="btn" href="${shell.href('/')}">Back to appointments</a></div><div class="listpage">${rows}</div></main>` })
  const app = new Acryl()
    .get('/patients', (c) => c.html(page('Patients', `${String(clinic.patients().length)} sample records · demo data`, clinic.patients().map((patient) => `<div class="listrow"><span><b>${e(patient.name)}</b><small>${e(patient.phone)}</small></span><span>${String(clinic.appointments({}).filter((appointment) => appointment.patient === patient.name).length)} appointments</span></div>`).join(''), 'patients')))
    .get('/practitioners', (c) => c.html(page('Practitioners', `${String(clinic.practitioners().length)} clinicians · ${String(clinic.rooms().length)} rooms`, clinic.practitioners().map((doctor) => `<div class="listrow"><span><b>${e(doctor.name)}</b><small>${e(doctor.specialty)} · ${e(doctor.location)}</small></span><span>${String(clinic.appointments({ practitionerId: doctor.id, date: '2026-11-04' }).length)} today</span></div>`).join(''), 'practitioners')))
    .get('/rooms', (c) => c.html(page('Rooms', `${String(clinic.rooms().length)} rooms · sample clinic`, clinic.rooms().map((room) => `<div class="listrow"><span><b>${e(room.name)}</b><small>${e(room.floor)}</small></span><span>${String(clinic.appointments({ date: '2026-11-04' }).filter((appointment) => appointment.roomId === room.id).length)} appointments today</span></div>`).join(''), 'rooms')))
  ctx.router.route(prefix === '' ? '/' : prefix, app)
}
