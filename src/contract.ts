/**
 * Wire contract shared by the node half and the browser half. Types and plain
 * constants only — importing this module pulls no runtime code worth naming
 * into either bundle.
 * @module dsh-lock-run/contract
 */

/** The four positions of the 「允许锁屏运行」 selector. */
export type LockRunMode =
  /** No assertion at all; the OS sleeps on its own schedule. */
  | 'off'
  /** Stop system sleep, but let the display turn off. */
  | 'allow-display-sleep'
  /** Stop system sleep and keep the display on. */
  | 'keep-display'
  /** Same flags as `keep-display`, held regardless of agent activity. */
  | 'always'

/** Modes that hold a power assertion, in selector order. */
export const LOCK_RUN_MODES: readonly LockRunMode[] = [
  'off',
  'allow-display-sleep',
  'keep-display',
  'always',
]

/** Modes that actually hold a power assertion; `always` runs as `keep-display`. */
export type HoldMode = Exclude<LockRunMode, 'off' | 'always'>

/** Mode held while agents or background jobs are running. */
export function activeMode(mode: LockRunMode): HoldMode | undefined {
  if (mode === 'off') return undefined
  return mode === 'always' ? 'keep-display' : mode
}

/** Whether a mode ignores agent activity and holds its assertion permanently. */
export function isPermanent(mode: LockRunMode): boolean {
  return mode === 'always'
}
