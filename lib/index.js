import { Service } from "@deepseek-ai/cordis";
import { homedir } from "node:os";
import z from "@deepseek-ai/schemastery";
//#region src/contract.ts
/** Mode held while agents or background jobs are running. */
function activeMode(mode) {
	if (mode === "off") return void 0;
	return mode === "always" ? "keep-display" : mode;
}
/** Whether a mode ignores agent activity and holds its assertion permanently. */
function isPermanent(mode) {
	return mode === "always";
}
//#endregion
//#region src/activity.ts
/**
* @param ctx - host context carrying the jobs, sessions, and workspace seams.
* @returns true while any background job or agent turn is in flight.
*/
async function isBusy(ctx) {
	if (ctx.jobs.list().some((job) => job.status === "running" || job.status === "stopping")) return true;
	for (const session of ctx.sessions.list()) if ((await ctx.waterfall("workspace/session-activity", { sessionId: session.id }, () => Promise.resolve([]))).length > 0) return true;
	return false;
}
//#endregion
//#region src/power.ts
/** Reason string the helpers record, visible in `pmset -g assertions` and friends. */
const WHY = "dsh-lock-run: harness task in progress";
/**
* The helper that holds `kind` on `platform`.
* @param kind - whether the display stays lit too.
* @param platform - target platform, defaulting to the running one.
* @returns the argv to spawn; the helper never exits on its own.
*/
function planFor(kind, platform = process.platform) {
	if (platform === "darwin") return {
		command: "caffeinate",
		args: kind === "keep-display" ? [
			"-d",
			"-i",
			"-s"
		] : ["-i", "-s"]
	};
	if (platform === "win32") return {
		command: "powershell.exe",
		args: [
			"-NoProfile",
			"-NonInteractive",
			"-Command",
			windowsScript(flagsFor(kind))
		]
	};
	return {
		command: "systemd-inhibit",
		args: [
			`--what=${kind === "keep-display" ? "idle:sleep" : "idle"}`,
			"--mode=block",
			`--why=${WHY}`,
			"sleep",
			"infinity"
		]
	};
}
/** ES_CONTINUOUS | ES_SYSTEM_REQUIRED, plus ES_DISPLAY_REQUIRED for the display. */
function flagsFor(kind) {
	return kind === "keep-display" ? 2147483651 : 2147483649;
}
/**
* `SetThreadExecutionState` is per-thread, so the assertion lasts exactly as
* long as the helper thread does — the same lifetime rule the Unix helpers get
* from their process. The loop is what keeps that thread alive.
*/
function windowsScript(flags) {
	return [
		`$sig = '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'`,
		"Add-Type -Namespace LockRun -Name Power -MemberDefinition $sig | Out-Null",
		`[LockRun.Power]::SetThreadExecutionState(${flags}) | Out-Null`,
		"while ($true) { Start-Sleep -Seconds 60 }"
	].join("; ");
}
//#endregion
//#region src/service.ts
/**
* `ctx.lockRun` — the power-assertion owner.
*
* The service holds at most one helper process. It is not a scheduler: every
* poll asks the same two questions ("is work in flight", "which position does
* the selector name") and moves the helper toward that answer, so an
* interrupted poll cannot strand the machine in a state nobody asked for.
* @module dsh-lock-run/service
*/
/** Owns the platform helper that keeps the machine awake while work is in flight. */
var LockRun = class extends Service {
	static inject = [
		"subprocess",
		"jobs",
		"sessions"
	];
	/**
	* Validated form of {@link LockRunConfig}; also the settings row's write
	* target. `mode` has to be volatile: the Host publishes only fields sitting
	* under a volatile node and refuses writes to any other path, so a plain
	* field leaves the row reading nothing and saving nothing.
	*/
	static Config = z.object({
		mode: z.union([
			z.const("off"),
			z.const("allow-display-sleep"),
			z.const("keep-display"),
			z.const("always")
		]).default("allow-display-sleep").volatile(),
		pollMs: z.number().default(5e3),
		graceMs: z.number().default(6e4)
	});
	config;
	hold;
	releaseAt;
	stopped = false;
	constructor(ctx, config) {
		super(ctx, "lockRun");
		this.config = {
			mode: config.mode,
			pollMs: config.pollMs ?? 5e3,
			graceMs: config.graceMs ?? 6e4
		};
		ctx.effect(() => {
			const timer = setInterval(() => {
				this.tick();
			}, this.config.pollMs);
			this.tick();
			return () => {
				this.stopped = true;
				clearInterval(timer);
				this.release();
			};
		}, "dsh-lock-run: activity poll");
	}
	/**
	* One poll. `always` short-circuits the activity read entirely — that is the
	* only position that keeps the machine awake with nothing running. The mode
	* is read through its live reference every time, so the row's write applies
	* on the next poll without remounting this entry.
	*/
	async tick() {
		if (this.stopped) return;
		const mode = this.config.mode.get();
		const permanent = isPermanent(mode);
		const wanted = permanent ? "keep-display" : activeMode(mode);
		if (wanted === void 0) {
			this.release();
			return;
		}
		let busy = permanent;
		if (!permanent) try {
			busy = await isBusy(this.ctx);
		} catch (error) {
			this.report(`activity probe failed: ${String(error)}`);
			return;
		}
		if (busy) {
			this.releaseAt = void 0;
			this.acquire(wanted);
			return;
		}
		if (this.hold === void 0) return;
		if (this.releaseAt === void 0) {
			this.releaseAt = Date.now() + this.config.graceMs;
			return;
		}
		if (Date.now() >= this.releaseAt) this.release();
	}
	/** Spawn the helper for `kind`, replacing one already held for a different kind. */
	acquire(kind) {
		if (this.hold?.kind === kind) return;
		this.release();
		const plan = planFor(kind);
		try {
			const handle = this.ctx.subprocess.spawn({
				argv: [plan.command, ...plan.args],
				cwd: homedir(),
				stdio: {
					stdin: "ignore",
					stdout: "inherit",
					stderr: "inherit"
				},
				graceMs: 5e3
			});
			handle.done.catch((error) => {
				this.report(`${plan.command}: ${String(error)}`);
				if (this.hold?.handle === handle) this.hold = void 0;
			});
			this.hold = {
				kind,
				handle
			};
		} catch (error) {
			this.report(`${plan.command}: ${String(error)}`);
		}
	}
	/** Terminate the helper, if one is held. Idempotent. */
	release() {
		const hold = this.hold;
		this.hold = void 0;
		this.releaseAt = void 0;
		if (hold === void 0) return;
		try {
			hold.handle.terminate();
		} catch (error) {
			this.report(`terminate failed: ${String(error)}`);
		}
	}
	/** The row owns the happy path; failures are for the operator's log. */
	report(message) {
		console.error(`[dsh-lock-run] ${message}`);
	}
};
//#endregion
//#region src/index.ts
/**
* dsh-lock-run, node half. The bundle patch mounts {@link LockRun} as
* `ctx.lockRun` and registers `/api/dsh-lock-run/*` on the web profile. The
* browser half ships through `exports['./client']` and the package.json
* `dsh.client` declaration.
* @module dsh-lock-run
*/
var src_default = LockRun;
//#endregion
export { LockRun, src_default as default };
