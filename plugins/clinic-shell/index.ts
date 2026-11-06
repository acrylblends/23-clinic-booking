/** The Willow Clinic shell: the clinical navigation, the administration links and the page content column. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import type { Clinic } from '../clinic/index.ts'
import { createShell, type Shell } from './core.ts'
import { STYLES } from './styles.ts'
export * from './core.ts'
export const APP_TITLE = 'Willow Clinic'
export interface ShellConfig { readonly prefix?: string }
export const name = 'clinic-shell'
export const inject = ['clinic', 'router']
declare module '@deepseek-ai/cordis' { interface Context { shell: Shell } }
function nav(active: string | undefined, href: (path: string) => string): string {
  const item = (id: string, label: string, path: string): string => `<a class="navitem${id === active ? ' active' : ''}" href="${href(path)}">${label}</a>`
  return `<aside class="nav"><a class="logo" href="${href('/')}"><i>✚</i>Willow Clinic</a><small>CLINICAL</small>${item('overview', '▦ &nbsp; Overview', '/')}${item('appointments', '◷ &nbsp; Appointments', '/')}${item('patients', '♧ &nbsp; Patients', '/patients')}${item('practitioners', '♙ &nbsp; Practitioners', '/practitioners')}${item('rooms', '▤ &nbsp; Rooms', '/rooms')}<div class="bottom"><small>ADMINISTRATION</small>${item('settings', '⚙ &nbsp; Schedule settings', '/settings')}${item('reports', '⌑ &nbsp; Reports', '/reports')}</div></aside>`
}
export function apply(ctx: Context, config: ShellConfig = {}): void {
  const clinic: Clinic = ctx.clinic
  const prefix = config.prefix ?? ''
  const shell = createShell(prefix, { appTitle: APP_TITLE, css: STYLES, bodyClass: 'clinic', nav })
  ctx.provide('shell', shell)
  ctx.router.route(prefix === '' ? '/' : prefix, new Acryl().get('/health', (c) => c.json({ ok: true })))
  void clinic
}
