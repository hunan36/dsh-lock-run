/**
 * Whether the harness has work in flight.
 *
 * Two independent sources, because they answer different questions:
 * `ctx.jobs` answers "is a background command or subagent still running", and
 * the workspace activity waterfall answers "is a session inside a turn" — the
 * sleep-prone case where the model call is in flight but no job exists.
 * @module dsh-lock-run/activity
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-jobs'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-workspace'

/**
 * @param ctx - host context carrying the jobs, sessions, and workspace seams.
 * @returns true while any background job or agent turn is in flight.
 */
export async function isBusy(ctx: Context): Promise<boolean> {
  const running = ctx.jobs.list().some((job) => job.status === 'running' || job.status === 'stopping')
  if (running) return true

  for (const session of ctx.sessions.list()) {
    const activity = await ctx.waterfall('workspace/session-activity', { sessionId: session.id }, () => Promise.resolve([]))
    if (activity.length > 0) return true
  }
  return false
}
