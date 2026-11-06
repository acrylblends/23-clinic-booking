/** Administration at `/reports` and `/settings`: the day metrics and the schedule hours. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import type { Clinic } from '../clinic/index.ts'
import type { Shell } from '../clinic-shell/index.ts'
export const name = 'admin'
export const inject = ['clinic', 'shell', 'router']
export function apply(ctx: Context): void {
  const { clinic, shell } = ctx
  const prefix = shell.prefix
  const app = new Acryl()
    .get('/reports', (c) => {
      const metrics = clinic.metrics('2026-11-04')
      const main = `<main class="content"><div class="top"><div class="title"><h1>Reports</h1><p>Daily schedule · demo data</p></div></div><div class="metrics"><div class="metric"><small>Appointments</small><b>${String(metrics.today)}</b></div><div class="metric"><small>Checked in</small><b>${String(metrics.checkedIn)}</b></div><div class="metric"><small>Available slots</small><b>${String(metrics.available)}</b></div><div class="metric"><small>Cancellation rate</small><b>${metrics.cancellationRate.toFixed(1)}%</b></div></div><div class="listpage"><p style="color:#72898a;font-size:12px">This is a sample report. Production would add utilisation and no-show trends from the appointment history.</p></div></main>`
      return c.html(shell.page({ title: 'Reports', active: 'reports', main }))
    })
    .get('/settings', (c) => {
      const main = `<main class="content"><div class="top"><div class="title"><h1>Schedule settings</h1><p>Clinic hours · sample configuration</p></div></div><div class="listpage"><div class="listrow"><span><b>Opening hours</b><small>Monday to Friday</small></span><span>08:00 – 17:00</span></div><div class="listrow"><span><b>Slot length</b><small>Default appointment</small></span><span>30 minutes</span></div><div class="listrow"><span><b>Locations</b><small>Practitioners</small></span><span>Central clinic · West practice</span></div><div class="listrow"><span><b>Rooms</b><small>Bookable</small></span><span>${String(clinic.rooms().length)}</span></div></div><p style="color:#72898a;font-size:11px;margin-top:12px">Sample scheduling environment · no real patient records.</p></main>`
      return c.html(shell.page({ title: 'Schedule settings', active: 'settings', main }))
    })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
}
