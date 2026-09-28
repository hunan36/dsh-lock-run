/**
 * dsh-lock-run, browser half. Registers the `lockRun` dictionary and one
 * `settings.general.item` row: the 「允许锁屏运行」 selector and its copy.
 * Loaded by the harness module loader as `dsh-lock-run/client.js`.
 * @module dsh-lock-run/client
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only imports: they pull the cordis Context augmentations (`ctx.slots`,
// `ctx.locale`, `ctx.configForms`) and the `settings.general.item` slot
// contract into this program. No runtime module is requested by them.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { LockRunRow, type LockRunSection } from './LockRunRow.tsx'
import { LOCK_RUN_NS, lockRunLocale } from './locales.ts'
import { installStyles } from './styles.ts'

/** Services this fiber needs before it activates. */
export const inject = ['slots', 'locale', 'configForms']

/** Host plugin entry id whose settings section this row reads and writes. */
const ENTRY_ID = 'lock-run'

/**
 * Mount the preference row and its copy.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(LOCK_RUN_NS, lockRunLocale), 'dsh-lock-run: locale dictionary')
  ctx.effect(installStyles, 'dsh-lock-run: stylesheet')

  const form = ctx.configForms.get<LockRunSection>(ENTRY_ID)

  // `inject` waits for the slot's declaration and re-runs after a collapse,
  // so registration order against the settings shell does not matter.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: ENTRY_ID,
    order: 30,
    locale: LOCK_RUN_NS,
    inject: () => ({ form }),
  }, LockRunRow))
}
