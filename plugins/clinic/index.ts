/** The clinic as a plugin: practitioners, patients, rooms and appointments in the app's data home. */
import { randomUUID } from 'node:crypto'
import { isAbsolute, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { ClinicState } from './domain.ts'
import { Clinic, type ClinicAdapters } from './clinic.ts'
import { jsonFileStore, type Store } from './store.ts'
export * from './clinic.ts'
export * from './domain.ts'
export * from './store.ts'
export { seed } from './seed.ts'
declare module '@deepseek-ai/cordis' { interface Context { clinic: Clinic } }
export interface ClinicConfig { readonly store?: Store<ClinicState>; readonly clock?: () => Date; readonly newId?: ClinicAdapters['newId']; readonly file?: string }
export const name = 'clinic'
export const inject = ['appInstance']
export async function apply(ctx: Context, config: ClinicConfig = {}): Promise<void> {
  const file = config.file ?? 'clinic-booking.json'
  const clinic = await Clinic.open({ store: config.store ?? jsonFileStore<ClinicState>(isAbsolute(file) ? file : join(ctx.appInstance.home, file), 'Clinic Booking'), clock: config.clock ?? (() => new Date()), newId: config.newId ?? ((kind) => `${kind}-${randomUUID().slice(0, 8)}`) })
  ctx.provide('clinic', clinic)
}
