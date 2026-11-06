import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { createApp, readManifest } from '../src/app.ts'
import type { ClinicState } from '../plugins/clinic/domain.ts'
import { pinnedInstance } from '../plugins/instance/index.ts'
import { noticeOf, NOW, projectRoot, withApp } from './support.ts'
const scratch = join(projectRoot, '.acrylblends', 'test'); mkdirSync(scratch, { recursive: true })
test('the first page is the mockup daybook: metrics, filters, three clinicians and appointment blocks', () =>
  withApp(async (app) => {
    const page = await app.page('/')
    assert.equal(page.status, 200)
    assert.match(page.html, /Willow Clinic/); assert.match(page.html, /Appointments/)
    assert.match(page.html, /Wednesday, 4 November 2026/)
    for (const label of ["Today's appointments", 'Checked in', 'Available slots', 'Cancellation rate', 'Practitioner schedule']) assert.match(page.html, new RegExp(label))
    assert.match(page.html, /<b>18<\/b>/); assert.match(page.html, /<b>06<\/b>/); assert.match(page.html, /<b>09<\/b>/); assert.match(page.html, /4\.2%/)
    assert.match(page.html, /Dr\. Elena Fischer/); assert.match(page.html, /Dr\. Kovač/); assert.match(page.html, /Dr\. Lang/)
    assert.match(page.html, /08:00 · Mia Bauer/); assert.match(page.html, /09:00 · Jonas Weber/)
    assert.equal((page.html.match(/class="appointment/g) ?? []).length, 18)
  }))
test('a selected appointment opens the detail panel and the filters narrow the columns', () =>
  withApp(async (app) => {
    const appointment = app.root.clinic.appointments({ date: '2026-11-04' })[0]!
    const page = await app.page(`/?appointment=${appointment.id}`)
    assert.match(page.html, /class="panel open"/); assert.match(page.html, /Mia Bauer/); assert.match(page.html, /Checked in|Check in/)
    const doctor = app.root.clinic.practitioners()[2]!
    const filtered = await app.page(`/?practitioner=${doctor.id}`)
    assert.match(filtered.html, /Dr\. Lang/); assert.doesNotMatch(filtered.html, /Dr\. Elena Fischer<\/b>/)
    const west = await app.page('/?location=West%20practice')
    assert.match(west.html, /Dr\. Lang/); assert.doesNotMatch(west.html, /Dr\. Kovač<\/b>/)
  }))
test('the new appointment form validates and creates', () =>
  withApp(async (app) => {
    const form = await app.page('/appointments/new')
    assert.match(form.html, /New appointment/)
    const invalid = await app.post('/appointments', { patient: '', practitionerId: app.root.clinic.practitioners()[0]!.id, roomId: app.root.clinic.rooms()[0]!.id, date: '2026-11-04', start: '15:00', durationMinutes: '30', type: 'Follow-up', note: '' })
    assert.equal(invalid.status, 200); assert.match(await invalid.text(), /name is required/)
    const created = await app.post('/appointments', { patient: 'New Patient', practitionerId: app.root.clinic.practitioners()[0]!.id, roomId: app.root.clinic.rooms()[0]!.id, date: '2026-11-04', start: '15:00', durationMinutes: '30', type: 'Follow-up', note: '' })
    assert.equal(created.status, 303); assert.equal(noticeOf(created).kind, 'ok'); assert.equal(app.root.clinic.metrics('2026-11-04').today, 19)
  }))
test('reschedule and status changes work from the appointment page', () =>
  withApp(async (app) => {
    const appointment = app.root.clinic.appointments({ date: '2026-11-04' })[0]!
    const page = await app.page(`/appointments/${appointment.id}`)
    assert.match(page.html, /Reschedule/)
    const moved = await app.post(`/appointments/${appointment.id}`, { date: '2026-11-05', start: '10:00' })
    assert.equal(noticeOf(moved).kind, 'ok'); assert.equal(app.root.clinic.appointment(appointment.id)?.start, '10:00')
    const checked = await app.post(`/appointments/${appointment.id}/status`, { status: 'checked-in', back: '/' })
    assert.equal(noticeOf(checked).kind, 'ok'); assert.equal(app.root.clinic.appointment(appointment.id)?.status, 'checked-in')
  }))
test('directory, reports and settings pages render', () =>
  withApp(async (app) => {
    for (const path of ['/patients', '/practitioners', '/rooms', '/reports', '/settings']) { assert.equal((await app.page(path)).status, 200) }
    assert.match((await app.page('/patients')).html, /Mia Bauer/)
    assert.match((await app.page('/rooms')).html, /Room 01/)
  }))
test('health, 404, prefix and the manifest work', async () => {
  await withApp(async (app) => { assert.equal((await app.page('/health')).status, 200); assert.equal((await app.page('/nope')).status, 404); assert.deepEqual(readManifest().plugins.map((row) => row.id), ['router', 'home', 'clinic', 'clinic-shell', 'schedule', 'appointments', 'directory', 'admin', 'extensions', 'server', 'acryl-door']) })
  await withApp(async (app) => { const response = await app.root.router.request('/app', { headers: { accept: 'text/html' } }); assert.equal(response.status, 200); assert.match(await response.text(), /href="\/app\/appointments\/new\?/) }, { prefix: '/app' })
})
test('switching the schedule off keeps the appointment pages', async () => {
  const manifest = readManifest(); const without = { ...manifest, plugins: manifest.plugins.map((row) => (row.id === 'schedule' ? { ...row, disabled: true } : row)) }
  const home = await mkdtemp(join(scratch, 'off-')); let ids = 0
  const app = await createApp(pinnedInstance(home, { root: projectRoot }), { listen: false, manifest: without, overrides: { clinic: { clock: () => NOW, newId: (kind: string) => `${kind}-${++ids}` } } })
  try { assert.equal((await app.root.router.request('/')).status, 404); assert.equal((await app.root.router.request('/appointments/new', { headers: { accept: 'text/html' } })).status, 200) } finally { await app.stop(); await rm(home, { recursive: true, force: true }) }
})
test('a failed save reports the error', async () => {
  const broken = { load: async (): Promise<ClinicState | undefined> => undefined, save: async (): Promise<void> => { throw new Error('disk full') } }
  await withApp(async (app) => { const appointment = app.root.clinic.appointments()[0]!; const response = await app.post(`/appointments/${appointment.id}/status`, { status: 'checked-in', back: '/' }); assert.equal(noticeOf(response).kind, 'error'); assert.match(noticeOf(response).text, /could not be saved/) }, { overrides: { clinic: { store: broken } } })
})
