/** Appointments: the new form, one appointment's detail/reschedule and the status changes. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import { ClinicError, statusLabel, type Clinic } from '../clinic/index.ts'
import type { Shell } from '../clinic-shell/index.ts'

export const name = 'appointments'
export const inject = ['clinic', 'shell', 'router']

interface Values { readonly patient: string; readonly date: string; readonly start: string; readonly practitionerId: string; readonly roomId: string; readonly type: string; readonly durationMinutes: string; readonly note: string }

export function apply(ctx: Context): void {
  const { clinic, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const form = (url: string, date: string, values?: Values, error?: string): string => {
    const v = values ?? { patient: '', date, start: '09:00', practitionerId: clinic.practitioners()[0]?.id ?? '', roomId: clinic.rooms()[0]?.id ?? '', type: 'Initial consultation', durationMinutes: '30', note: '' }
    const main = `${shell.notice(url)}<div class="top"><div class="title"><h1>New appointment</h1><p>${e(clinic.dateLabel(date))} · Sample scheduling environment</p></div><a class="btn" href="${shell.href('/')}">Back to the daybook</a></div>${error === undefined ? '' : `<p class="notice error" role="alert">${e(error)}</p>`}<form class="form" method="post" action="${shell.href('/appointments')}"><h2>Appointment details</h2><label class="field"><span>PATIENT</span><input name="patient" value="${e(v.patient)}" placeholder="Mia Bauer" required></label><div class="field"><span>DATE</span><input name="date" type="date" value="${e(v.date)}" required></div><div class="field"><span>TIME</span><input name="start" type="time" value="${e(v.start)}" required></div><div class="formgrid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><label class="field"><span>PRACTITIONER</span><select name="practitionerId">${clinic.practitioners().map((doctor) => `<option value="${e(doctor.id)}"${doctor.id === v.practitionerId ? ' selected' : ''}>${e(doctor.name)}</option>`).join('')}</select></label><label class="field"><span>ROOM</span><select name="roomId">${clinic.rooms().map((room) => `<option value="${e(room.id)}"${room.id === v.roomId ? ' selected' : ''}>${e(room.name)}</option>`).join('')}</select></label><label class="field"><span>TYPE</span><input name="type" value="${e(v.type)}" required></label><label class="field"><span>DURATION (MINUTES)</span><input name="durationMinutes" type="number" min="10" max="120" value="${e(v.durationMinutes)}" required></label></div><label class="field"><span>NOTE</span><input name="note" value="${e(v.note)}" placeholder="Optional appointment note"></label><div class="actions"><button class="btn primary" type="submit">Save appointment</button><a href="${shell.href('/')}">Cancel</a></div></form>`
    return shell.page({ title: 'New appointment', active: 'appointments', main })
  }
  const app = new Acryl()
    .get('/appointments/new', (c) => c.html(form(c.req.url, c.req.query('date') ?? '2026-11-04')))
    .post('/appointments', async (c) => {
      const body = await c.req.parseBody()
      const values: Values = { patient: String(body.patient ?? ''), date: String(body.date ?? ''), start: String(body.start ?? ''), practitionerId: String(body.practitionerId ?? ''), roomId: String(body.roomId ?? ''), type: String(body.type ?? ''), durationMinutes: String(body.durationMinutes ?? ''), note: String(body.note ?? '') }
      try { const appointment = await clinic.add(values); return c.redirect(shell.url(`/?date=${encodeURIComponent(appointment.date)}&appointment=${encodeURIComponent(appointment.id)}`, { kind: 'ok', text: 'Appointment created.' }), 303) } catch (error) { if (!(error instanceof ClinicError)) throw error; return c.html(form(c.req.url, values.date, values, error.message)) }
    })
    .get('/appointments/:id', (c) => {
      const appointment = clinic.appointment(c.req.param('id'))
      if (appointment === undefined) return c.redirect(shell.url('/', { kind: 'error', text: 'That appointment no longer exists.' }), 303)
      const main = `${shell.notice(c.req.url)}<div class="top"><div class="title"><h1>${e(appointment.patient)}</h1><p>${e(appointment.date)} · ${e(appointment.start)} · ${e(statusLabel(appointment.status))}</p></div><a class="btn" href="${shell.href(`/?date=${encodeURIComponent(appointment.date)}&appointment=${encodeURIComponent(appointment.id)}`)}">Back to the schedule</a></div><form class="form" method="post" action="${shell.href(`/appointments/${encodeURIComponent(appointment.id)}`)}"><h2>Reschedule</h2><label class="field"><span>DATE</span><input name="date" type="date" value="${e(appointment.date)}" required></label><label class="field"><span>TIME</span><input name="start" type="time" value="${e(appointment.start)}" required></label><div class="actions"><button class="btn primary" type="submit">Save new time</button></div></form><form class="form" method="post" action="${shell.href(`/appointments/${encodeURIComponent(appointment.id)}/status`)}"><h2>Status</h2><input type="hidden" name="back" value="${shell.href(`/appointments/${encodeURIComponent(appointment.id)}`)}"><div class="actions"><button class="btn" name="status" value="checked-in" type="submit">Check in</button><button class="btn" name="status" value="completed" type="submit">Complete</button><button class="btn" name="status" value="cancelled" type="submit">Cancel appointment</button></div></form>`
      return c.html(shell.page({ title: appointment.patient, active: 'appointments', main }))
    })
    .post('/appointments/:id', async (c) => {
      const body = await c.req.parseBody()
      try { const appointment = await clinic.reschedule(c.req.param('id'), body.date, body.start); return c.redirect(shell.url(`/appointments/${encodeURIComponent(appointment.id)}`, { kind: 'ok', text: 'Appointment rescheduled.' }), 303) } catch (error) { return c.redirect(shell.url(`/appointments/${encodeURIComponent(c.req.param('id'))}`, { kind: 'error', text: (error as Error).message }), 303) }
    })
    .post('/appointments/:id/status', async (c) => {
      const body = await c.req.parseBody()
      const back = typeof body.back === 'string' ? body.back : '/'
      try { await clinic.setStatus(c.req.param('id'), body.status); return c.redirect(shell.url(back, { kind: 'ok', text: 'Appointment status updated.' }), 303) } catch (error) { return c.redirect(shell.url(back, { kind: 'error', text: (error as Error).message }), 303) }
    })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
}
