/**
 * `ctx.lockRun` — the power-assertion owner.
 *
 * The service holds at most one helper process. It is not a scheduler: every
 * poll asks the same two questions ("is work in flight", "which position does
 * the selector name") and moves the helper toward that answer, so an
 * interrupted poll cannot strand the machine in a state nobody asked for.
 * @module dsh-lock-run/service
 */
import { Service } from '@deepseek-ai/cordis';
import type { Context, Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type LockRunMode } from './contract.ts';
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
    mode: Volatile<LockRunMode>;
    /** Activity poll interval in milliseconds. */
    pollMs?: number;
    /** How long an assertion survives the last observed activity, in milliseconds. */
    graceMs?: number;
}
/** Owns the platform helper that keeps the machine awake while work is in flight. */
export declare class LockRun extends Service {
    static inject: string[];
    /**
     * Validated form of {@link LockRunConfig}; also the settings row's write
     * target. `mode` has to be volatile: the Host publishes only fields sitting
     * under a volatile node and refuses writes to any other path, so a plain
     * field leaves the row reading nothing and saving nothing.
     */
    static Config: z<Schemastery.ObjectS<NoInfer<{
        mode: z<"off" | "allow-display-sleep" | "keep-display" | "always", "off" | "allow-display-sleep" | "keep-display" | "always", "volatile-defined">;
        pollMs: z<number, number, "defined">;
        graceMs: z<number, number, "defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        mode: z<"off" | "allow-display-sleep" | "keep-display" | "always", "off" | "allow-display-sleep" | "keep-display" | "always", "volatile-defined">;
        pollMs: z<number, number, "defined">;
        graceMs: z<number, number, "defined">;
    }>>, "plain">;
    private readonly config;
    private hold;
    private releaseAt;
    private stopped;
    constructor(ctx: Context, config: LockRunConfig);
    /**
     * One poll. `always` short-circuits the activity read entirely — that is the
     * only position that keeps the machine awake with nothing running. The mode
     * is read through its live reference every time, so the row's write applies
     * on the next poll without remounting this entry.
     */
    private tick;
    /** Spawn the helper for `kind`, replacing one already held for a different kind. */
    private acquire;
    /** Terminate the helper, if one is held. Idempotent. */
    private release;
    /** The row owns the happy path; failures are for the operator's log. */
    private report;
}
