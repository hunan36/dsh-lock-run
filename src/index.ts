/**
 * dsh-lock-run, node half. The bundle patch mounts {@link LockRun} as
 * `ctx.lockRun` and registers `/api/dsh-lock-run/*` on the web profile. The
 * browser half ships through `exports['./client']` and the package.json
 * `dsh.client` declaration.
 * @module dsh-lock-run
 */
import { LockRun } from './service.ts'

export { LockRun }
export default LockRun
export type { LockRunConfig } from './service.ts'
export type * from './contract.ts'
