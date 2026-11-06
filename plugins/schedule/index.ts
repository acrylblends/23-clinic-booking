/** Appointments daybook at `/`: the metrics, location/practitioner filters, the practitioner columns and the detail panel. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import { statusLabel, timeText, topOf, type Appointment, type Clinic } from '../clinic/index.ts'
import type { Shell } from '../clinic-shell/index.ts'

export const name = 'schedule'
export const inject = ['clinic', 'shell', 'router']

export function apply(ctx: Context): void {
  const { clinic, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const app = new Acryl().get('/', (c) => {
    const date = c.req.query('date') ?? '2026-11-04'
    const location = c.req.query('location')
    const practitionerId = c.req.query('practitioner')
    const appointments = clinic.appointments({ date, ...(location === undefined || location === '' ? {} : { location }), ...(practitionerId === undefined || practitionerId === '' ? {} : { practitionerId }) })
    const metrics = clinic.metrics(date)
    const selected = clinic.appointment(c.req.query('appointment') ?? '')
    const doctors = clinic.practitioners().filter((doctor) => (practitionerId === undefined || practitionerId === '' || doctor.id === practitionerId) && (location === undefined || location === '' || doctor.location === location))
    const keep = [location === undefined || location === '' ? '' : `location=${encodeURIComponent(location)}`, practitionerId === undefined || practitionerId === '' ? '' : `practitioner=${encodeURIComponent(practitionerId)}`].filter((part) => part !== '').join('&')
    const columns = doctors.map((doctor) => {
      const cards = appointments.filter((appointment) => appointment.practitionerId === doctor.id).map((appointment: Appointment) => `<a class="appointment ${appointment.tone}" style="top:${String(topOf(appointment.start))}px;height:${String(Math.round(appointment.durationMinutes * 1.4))}px" href="${shell.href('/')}?date=${encodeURIComponent(date)}&appointment=${encodeURIComponent(appointment.id)}${keep === '' ? '' : `&${keep}`}"><b>${e(appointment.start)} · ${e(appointment.patient)}</b><small>${e(appointment.type)} · ${e(clinic.rooms().find((room) => room.id === appointment.roomId)?.name ?? '')}</small></a>`).join('')
      return `<div class="doctor"><div class="dochead"><span class="docavatar" style="background:${doctor.color}22;color:${doctor.color}">${e(doctor.initials)}</span><span><b>${e(doctor.name)}</b><small>${e(doctor.specialty)}</small></span></div><div class="slotarea" style="height:760px">${cards}</div></div>`
    }).join('')
    const times = Array.from({ length: 10 }, (_, index) => `<div class="time">${timeText(8 * 60 + index * 60)}</div>`).join('')
    const locations = [...new Set(clinic.practitioners().map((doctor) => doctor.location))]
    const panel = selected === undefined ? '' : `<aside class="panel open"><a class="close" href="${shell.href('/')}?date=${encodeURIComponent(date)}${keep === '' ? '' : `&${keep}`}">×</a><div class="eyebrow" style="color:#2c7774;font-size:10px">APPOINTMENT DETAILS</div><h2>${e(selected.patient)}</h2><p style="color:#829697;font-size:12px">${e(selected.type)} · ${e(statusLabel(selected.status))}</p><div class="coord"><span>Date</span><b>${e(selected.date)}</b></div><div class="coord"><span>Time</span><b>${e(selected.start)} · ${String(selected.durationMinutes)} min</b></div><div class="coord"><span>Practitioner</span><b>${e(clinic.practitioner(selected.practitionerId)?.name ?? '')}</b></div><div class="coord"><span>Room</span><b>${e(clinic.rooms().find((room) => room.id === selected.roomId)?.name ?? '')}</b></div><div class="coord"><span>Note</span><b>${e(selected.note === '' ? 'No note' : selected.note)}</b></div><div class="actions" style="margin-top:14px"><form method="post" action="${shell.href(`/appointments/${encodeURIComponent(selected.id)}/status`)}"><input type="hidden" name="status" value="checked-in"><input type="hidden" name="back" value="${e(c.req.url)}"><button class="btn primary" type="submit">${selected.status === 'checked-in' ? 'Checked in ✓' : 'Check in'}</button></form><a class="btn" href="${shell.href(`/appointments/${encodeURIComponent(selected.id)}`)}">Reschedule</a></div></aside>`
    const main = `<main class="content">${shell.notice(c.req.url)}<div class="top"><div class="title"><h1>Appointments</h1><p>${e(clinic.dateLabel(date))} · Daily schedule</p></div><div class="actions"><a class="btn" href="${shell.href('/')}">Today</a><a class="btn primary" href="${shell.href(`/appointments/new?date=${encodeURIComponent(date)}`)}">＋ New appointment</a></div></div><div class="metrics"><div class="metric"><small>Today's appointments</small><b>${String(metrics.today)}</b></div><div class="metric"><small>Checked in</small><b>${String(metrics.checkedIn).padStart(2, '0')}</b></div><div class="metric"><small>Available slots</small><b>${String(metrics.available).padStart(2, '0')}</b></div><div class="metric"><small>Cancellation rate</small><b>${metrics.cancellationRate.toFixed(1)}%</b></div></div><section class="schedule"><div class="schedhead"><h2>Practitioner schedule</h2><form method="get" action="${shell.href('/')}" class="filters" style="margin:0"><input type="hidden" name="date" value="${e(date)}"><select class="select" name="location" aria-label="Filter by location" onchange="this.form.submit()"><option value="">All locations</option>${locations.map((value) => `<option value="${e(value)}"${value === location ? ' selected' : ''}>${e(value)}</option>`).join('')}</select><select class="select" name="practitioner" aria-label="Filter by practitioner" onchange="this.form.submit()"><option value="">All practitioners</option>${clinic.practitioners().map((doctor) => `<option value="${e(doctor.id)}"${doctor.id === practitionerId ? ' selected' : ''}>${e(doctor.name)}</option>`).join('')}</select></form></div><div class="grid"><div class="timecol"><div class="timehead"></div>${times}</div>${columns}</div></section>${panel}</main>`
    return c.html(shell.page({ title: 'Appointments', active: 'appointments', main }))
  })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
}
