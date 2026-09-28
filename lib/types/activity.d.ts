/**
 * Whether the harness has work in flight.
 *
 * Two independent sources, because they answer different questions:
 * `ctx.jobs` answers "is a background command or subagent still running", and
 * the workspace activity waterfall answers "is a session inside a turn" — the
 * sleep-prone case where the model call is in flight but no job exists.
 * @module dsh-lock-run/activity
 */
import type { Context } from '@deepseek-ai/cordis';
/**
 * @param ctx - host context carrying the jobs, sessions, and workspace seams.
 * @returns true while any background job or agent turn is in flight.
 */
export declare function isBusy(ctx: Context): Promise<boolean>;
