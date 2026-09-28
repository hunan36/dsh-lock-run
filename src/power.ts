/**
 * Platform power assertions.
 *
 * The assertion is held by a helper *process*, never by an API call the
 * harness would have to undo. When the helper dies — cleanly or with the whole
 * harness — the OS drops the assertion on its own, so no crash can leave a
 * machine that never sleeps again.
 * @module dsh-lock-run/power
 */
import type { HoldMode } from './contract.ts'

/** Executable and arguments for one helper process. `argv[0]` is the program. */
export interface PowerPlan {
  command: string
  args: readonly string[]
}

/** Reason string the helpers record, visible in `pmset -g assertions` and friends. */
const WHY = 'dsh-lock-run: harness task in progress'

/**
 * The helper that holds `kind` on `platform`.
 * @param kind - whether the display stays lit too.
 * @param platform - target platform, defaulting to the running one.
 * @returns the argv to spawn; the helper never exits on its own.
 */
export function planFor(kind: HoldMode, platform: NodeJS.Platform = process.platform): PowerPlan {
  if (platform === 'darwin') {
    // -i: idle sleep off, -s: system sleep off (AC), -d: display sleep off.
    return {
      command: 'caffeinate',
      args: kind === 'keep-display' ? ['-d', '-i', '-s'] : ['-i', '-s'],
    }
  }
  if (platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-Command', windowsScript(flagsFor(kind))],
    }
  }
  // systemd-inhibit covers idle and sleep; display blanking is the compositor's.
  const what = kind === 'keep-display' ? 'idle:sleep' : 'idle'
  return {
    command: 'systemd-inhibit',
    args: [`--what=${what}`, '--mode=block', `--why=${WHY}`, 'sleep', 'infinity'],
  }
}

/** ES_CONTINUOUS | ES_SYSTEM_REQUIRED, plus ES_DISPLAY_REQUIRED for the display. */
function flagsFor(kind: HoldMode): number {
  return kind === 'keep-display' ? 0x80000003 : 0x80000001
}

/**
 * `SetThreadExecutionState` is per-thread, so the assertion lasts exactly as
 * long as the helper thread does — the same lifetime rule the Unix helpers get
 * from their process. The loop is what keeps that thread alive.
 */
function windowsScript(flags: number): string {
  return [
    `$sig = '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'`,
    'Add-Type -Namespace LockRun -Name Power -MemberDefinition $sig | Out-Null',
    `[LockRun.Power]::SetThreadExecutionState(${flags}) | Out-Null`,
    'while ($true) { Start-Sleep -Seconds 60 }',
  ].join('; ')
}
