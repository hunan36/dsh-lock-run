/**
 * The 「允许锁屏运行」 row: title and description on the left, the mode selector
 * on the right — the shape the shipped Language and Appearance rows use.
 *
 * The settings section only stacks rows and projects no label, so this file
 * owns its own copy, its own control, and its own write.
 * @module dsh-lock-run/client/LockRunRow
 */
import { useState, useSyncExternalStore } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import { LOCK_RUN_MODES, type LockRunMode } from '../contract.ts'
import type { LockRunKey } from './locales.ts'

/** The Host settings section this row reads and writes. */
export interface LockRunSection {
  mode: LockRunMode
}

/** Injected business face: the settings scope, shared with every render. */
export interface LockRunRowInjected {
  /** The row's settings scope, owned by the plugin that mounted it. */
  form: ConfigForm<LockRunSection>
}

/** Full component props: runtime share + locale seat + injected face. */
export type LockRunRowProps = PropsRuntime<'settings.general.item'> & PropsLocale<'lockRun'> & LockRunRowInjected

/** What an unwritten section shows; matches the schema default. */
const FALLBACK: LockRunMode = 'allow-display-sleep'

/**
 * Render the row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function LockRunRow({ t, form }: LockRunRowProps) {
  // The scope already speaks getSnapshot/subscribe with a stable snapshot
  // reference, which is exactly the store contract React subscribes to.
  const snapshot = useSyncExternalStore(
    (listener) => form.subscribe(listener),
    () => form.getSnapshot(),
  )
  const [open, setOpen] = useState(false)
  const mode = snapshot.value?.mode ?? FALLBACK

  return (
    <div className="dsh-lock-run-row">
      <div className="dsh-lock-run-text">
        <div className="dsh-lock-run-title">{t('row.title')}</div>
        <div className="dsh-lock-run-desc">{t('row.description')}</div>
      </div>
      <Menu
        open={open}
        align="end"
        portal
        anchor={
          <button
            type="button"
            className="dsh-lock-run-select"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={t('row.options')}
            onClick={() => setOpen((value) => !value)}
          >
            {t(`mode.${mode}` as LockRunKey)}
            <Caret />
          </button>
        }
        items={LOCK_RUN_MODES.map((value) => ({ id: value, label: t(`mode.${value}` as LockRunKey) }))}
        selectedId={mode}
        onSelect={(id) => {
          setOpen(false)
          void form.set('mode', id)
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}

/** The selector's disclosure mark; the primitives expose no caret glyph. */
function Caret() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M2 4L5 7L8 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
