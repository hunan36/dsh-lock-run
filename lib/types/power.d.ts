/**
 * Platform power assertions.
 *
 * The assertion is held by a helper *process*, never by an API call the
 * harness would have to undo. When the helper dies — cleanly or with the whole
 * harness — the OS drops the assertion on its own, so no crash can leave a
 * machine that never sleeps again.
 * @module dsh-lock-run/power
 */
import type { HoldMode } from './contract.ts';
/** Executable and arguments for one helper process. `argv[0]` is the program. */
export interface PowerPlan {
    command: string;
    args: readonly string[];
}
/**
 * The helper that holds `kind` on `platform`.
 * @param kind - whether the display stays lit too.
 * @param platform - target platform, defaulting to the running one.
 * @returns the argv to spawn; the helper never exits on its own.
 */
export declare function planFor(kind: HoldMode, platform?: NodeJS.Platform): PowerPlan;
