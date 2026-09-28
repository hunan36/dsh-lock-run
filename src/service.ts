/**
 * `ctx.lockRun` — the power-assertion owner.
 *
 * The service holds at most one helper process. It is not a scheduler: every
 * poll asks the same two questions ("is work in flight", "which position does
 * the selector name") and moves the helper toward that answer, so an
 * interrupted poll cannot strand the machine in a state nobody asked for.
 * @module dsh-lock-run/service
 */
import { Service } from '@deepseek-ai/cordis'
import type { Context, Volatile } from '@deepseek-ai/cordis'
import type { SubprocessHandle } from '@deepseek-ai/dsh-subprocess'
import { homedir } from 'node:os'
import z from '@deepseek-ai/schemastery'
import { activeMode, isPermanent, type HoldMode, type LockRunMode } from './contract.ts'
import { isBusy } from './activity.ts'
import { planFor } from './power.ts'

/**
 * Mountable configuration. `mode` is volatile, so the settings row mutates it
 * through a live reference and a change never remounts this entry; the other
 * two are read once, at construction.
 */
export interface LockRunConfig {
  /**
   * Selector position the row writes. Always present: the schema defaults it,
   * and `.volatile()` turns that default into a live reference.
   */
  mode: Volatile<LockRunMode>
  /** Activity poll interval in milliseconds. */
  pollMs?: number
  /** How long an assertion survives the last observed activity, in milliseconds. */
  graceMs?: number
}

/** A held assertion. The helper process *is* the assertion. */
interface Hold {
  kind: HoldMode
  handle: SubprocessHandle
}

/** Owns the platform helper that keeps the machine awake while work is in flight. */
export class LockRun extends Service {
  static inject = ['subprocess', 'jobs', 'sessions']

  /**
   * Validated form of {@link LockRunConfig}; also the settings row's write
   * target. `mode` has to be volatile: the Host publishes only fields sitting
   * under a volatile node and refuses writes to any other path, so a plain
   * field leaves the row reading nothing and saving nothing.
   */
  static Config = z.object({
    mode: z.union([
      z.const('off'),
      z.const('allow-display-sleep'),
      z.const('keep-display'),
      z.const('always'),
    ]).default('allow-display-sleep').volatile(),
    pollMs: z.number().default(5000),
    graceMs: z.number().default(60000),
  })

  private readonly config: {
    mode: Volatile<LockRunMode>
    pollMs: number
    graceMs: number
  }
  private hold: Hold | undefined
  private releaseAt: number | undefined
  private stopped = false

  constructor(ctx: Context, config: LockRunConfig) {
    super(ctx, 'lockRun')
    this.config = {
      mode: config.mode,
      pollMs: config.pollMs ?? 5000,
      graceMs: config.graceMs ?? 60000,
    }

    ctx.effect(() => {
      const timer = setInterval(() => { void this.tick() }, this.config.pollMs)
      void this.tick()
      return () => {
        this.stopped = true
        clearInterval(timer)
        this.release()
      }
    }, 'dsh-lock-run: activity poll')
  }

  /**
   * One poll. `always` short-circuits the activity read entirely — that is the
   * only position that keeps the machine awake with nothing running. The mode
   * is read through its live reference every time, so the row's write applies
   * on the next poll without remounting this entry.
   */
  private async tick(): Promise<void> {
    if (this.stopped) return
    const mode = this.config.mode.get()
    const permanent = isPermanent(mode)
    const wanted: HoldMode | undefined = permanent ? 'keep-display' : activeMode(mode)

    if (wanted === undefined) {
      this.release()
      return
    }

    let busy = permanent
    if (!permanent) {
      try {
        busy = await isBusy(this.ctx)
      } catch (error) {
        // A broken probe must not read as "idle": holding the previous
        // decision is the safer failure, and the reason is reported once.
        this.report(`activity probe failed: ${String(error)}`)
        return
      }
    }

    if (busy) {
      this.releaseAt = undefined
      this.acquire(wanted)
      return
    }

    if (this.hold === undefined) return
    if (this.releaseAt === undefined) {
      this.releaseAt = Date.now() + this.config.graceMs
      return
    }
    if (Date.now() >= this.releaseAt) this.release()
  }

  /** Spawn the helper for `kind`, replacing one already held for a different kind. */
  private acquire(kind: HoldMode): void {
    if (this.hold?.kind === kind) return
    this.release()

    const plan = planFor(kind)
    try {
      const handle = this.ctx.subprocess.spawn({
        argv: [plan.command, ...plan.args],
        cwd: homedir(),
        stdio: { stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' },
        graceMs: 5000,
      })
      // A helper that dies on its own — no `caffeinate` on a slim image, a
      // refused PowerShell — has to be reported, not swallowed.
      void handle.done.catch((error: unknown) => {
        this.report(`${plan.command}: ${String(error)}`)
        if (this.hold?.handle === handle) this.hold = undefined
      })
      this.hold = { kind, handle }
    } catch (error) {
      this.report(`${plan.command}: ${String(error)}`)
    }
  }

  /** Terminate the helper, if one is held. Idempotent. */
  private release(): void {
    const hold = this.hold
    this.hold = undefined
    this.releaseAt = undefined
    if (hold === undefined) return
    try {
      hold.handle.terminate()
    } catch (error) {
      this.report(`terminate failed: ${String(error)}`)
    }
  }

  /** The row owns the happy path; failures are for the operator's log. */
  private report(message: string): void {
    console.error(`[dsh-lock-run] ${message}`)
  }
}
