# dsh-lock-run

English | [中文](README.zh.md)

A DeepSeek Harness "keep running while locked" plugin: it holds a system power assertion only while agents or background jobs are actually running, and lets the machine sleep again once everything has been idle past a grace period.

```
Settings → General:
   Allow running while locked   [Stay awake after lock ▾]   ← click
                                      ├ Off
                                      ├ Stay awake after display sleep
                                      ├ Stay awake after lock          ✓
                                      └ Always stay awake
```

## What it does

Four positions, one row:

| Position | Meaning | macOS | Linux | Windows |
|---|---|---|---|---|
| Off | no intervention; the OS sleeps on its own schedule | — | — | — |
| Stay awake after display sleep | allow the display off, block system sleep | `caffeinate -i -s` | `systemd-inhibit --what=idle` | `ES_CONTINUOUS｜ES_SYSTEM_REQUIRED` |
| Stay awake after lock | block both display sleep and system sleep | `caffeinate -d -i -s` | `systemd-inhibit --what=idle:sleep` | adds `ES_DISPLAY_REQUIRED` |
| Always stay awake | ignore task state, hold forever | `caffeinate -d -i -s` | `systemd-inhibit --what=idle:sleep` | adds `ES_DISPLAY_REQUIRED` |

`always` and `keep-display` issue the same underlying call; the only difference is **whether the task state is read first**.

### Why a locked screen interrupts tasks

Locking itself does not — local processes keep running. What kills the task is the sleep that follows the lock: the process is suspended, its long-lived connection to the model API times out, and by the time the machine wakes the retries are exhausted.

So this plugin guards against **idle sleep**, not against the lock.

## Install

Two ways in; either one is enough.

### From the plugin page (GUI)

Sidebar → **Plugins** → **Add plugin**, then put this in "Package or address":

```
https://github.com/hunan36/dsh-lock-run
```

Press Install and enable it afterwards ("Enable"). That path runs `pnpm add <spec>` in **the profile serving the page** (usually `web`) and writes this package into `dsh.profile.bundles` for you — you do neither by hand. The URL is accepted with or without the `.git` suffix.

**Reload the page** (⌘⇧R) afterwards so the browser fetches the new client bundle; if that profile does not have `patchReload: live`, restart `dsh web` once for the host side.

### From the CLI (a dedicated profile is recommended)

```bash
# 1. Create a dedicated profile (leaves your existing web profile alone)
dsh --profile lockrun-web --from-default-profile web

# 2. Add the plugin — a git URL, or the absolute path of a local checkout
dsh plugin --profile lockrun-web add https://github.com/hunan36/dsh-lock-run
# dsh plugin --profile lockrun-web add "$PWD"

# 3. Enable it on the plugin page ("Enable"), or edit the bundle list directly:
#    dsh.profile.bundles += "dsh-lock-run"
#    The package declares dsh.bundle.patch, so enabling it mounts the LockRun
#    service from the bundle's own cordis.patch.yml.

# 4. Boot
dsh --profile lockrun-web
```

A local checkout can also be linked by hand, without the plugin manager:

```bash
cd ~/.dsh/profiles/web
pnpm add link:/path/to/dsh-lock-run
```

then append the plugin's `cordis.patch.yml` `insert:` block to the profile's `cordis.patch.yml`. DSH watches that file, so the entry takes effect immediately; the browser half needs no extra setup — `dsh.client` is declared in `package.json` and the module loader loads it by package name.

### A machine without pnpm

dsh's plugin management — the plugin page's Install, and `dsh plugin …` — shells out to pnpm, and fails outright when there is none:

```
dsh: pnpm was not found; install pnpm and make it available on PATH.
```

Install one (Node ships npm):

```bash
npm install -g pnpm        # the latest 10.x
# or: corepack enable && corepack prepare pnpm@10 --activate
```

Do not let Corepack use its own default: after a bare `corepack enable` you get pnpm **8.15.7**, which walks straight into the `ERR_PNPM_ADDING_TO_ROOT` failure below.

If you would rather not install pnpm at all, the plugin itself does not need it (it has no runtime `dependencies`):

- **Use Node's npm**: `cd ~/.dsh/profiles/<profile> && npm install https://github.com/hunan36/dsh-lock-run`
- **Copy the directory**: drop the whole `dsh-lock-run` folder (including `lib/`) into `<profile>/node_modules/`, for offline or fully manual setups

Both need one extra step: add `dsh-lock-run` to that profile's `dsh.profile.bundles` in its `package.json`, then restart `dsh web`. The plugin page and `dsh plugin add` do that for you; a manual install does not, and the package stays unloaded even though it sits in `node_modules`.

### Installation fails with ERR_PNPM_ADDING_TO_ROOT

A dsh profile directory is itself a pnpm workspace (`pnpm-workspace.yaml` with `packages: [.]`), and pnpm 8 treats `pnpm add` there as adding to a workspace root — which it refuses. When the profile has no `packageManager` field, Node's Corepack fills one in (commonly `pnpm@8.15.7`), and the install then dies on that check **before it ever resolves this plugin**, so the failure is not about this package.

Any one of these gets you through:

1. **Installing from the plugin page (GUI)**: that path runs `pnpm add <spec>` and cannot pass `-w`, so write `ignore-workspace-root-check=true` into the profile's `.npmrc` first, then press "Retry" in the dialog — the same command then succeeds under pnpm 8:

   ```bash
   echo 'ignore-workspace-root-check=true' >> ~/.dsh/profiles/lockrun-web/.npmrc
   ```

2. From the CLI, pass `-w` through (dsh forwards extra arguments to pnpm):

   ```bash
   dsh plugin --profile lockrun-web add -w https://github.com/hunan36/dsh-lock-run.git
   ```

3. Put the profile on pnpm 10 (the version this plugin is tested with): run `corepack use pnpm@10` in the profile, or set the `packageManager` field Corepack added to `pnpm@10.34.5`.

Note that after the first failure Corepack has already written `packageManager: pnpm@8.15.7+sha512…` into that profile's `package.json`, so every later plugin operation there uses pnpm 8 — step 3 is the durable fix.

Requires Node `^22.19.0 || >=24.0.0` and pnpm 10; this repository pins it with `packageManager: pnpm@10.34.5`.

## Configuration

Set in `cordis.patch.yml`:

| Key | Default | Meaning |
|---|---|---|
| `mode` | `allow-display-sleep` | one of the four positions above; this is what the settings row writes |
| `pollMs` | 5000 | activity poll interval |
| `graceMs` | 60000 | how long the assertion stays held after the last task ends |

The settings row writes `mode`. The write lands in the profile's patch file, DSH re-applies that entry, and the host half receives the new value — so the value in the config file is always the single source of truth.

## How it works

**The assertion is held by a helper process, never by an API call.** Its lifetime equals the helper's lifetime: while the process lives the assertion is held, when it exits the OS releases it on its own. A crash, a `kill`, or a power cut therefore never leaves a machine that refuses to sleep. All three platforms follow that rule:

- macOS: a resident `caffeinate`
- Linux: a resident `systemd-inhibit … sleep infinity`
- Windows: PowerShell calling `SetThreadExecutionState` (a thread-scoped API) kept alive by `while ($true) { Start-Sleep 60 }`

**Activity comes from two independent sources** (`src/activity.ts`):

- background jobs from `ctx.jobs.list()` whose status is `running` / `stopping`
- sessions whose `workspace/session-activity` waterfall reports an active item (an agent inside a turn)

The second one is not optional: a model call in flight with no job at all is precisely the case most vulnerable to being cut by sleep.

**Polling, not event subscription.** Every `pollMs` the service asks "should this be held right now", then moves the helper toward the answer. A missed poll cannot strand the machine in a state nobody asked for — the next poll corrects it.

**Grace period.** When everything goes idle the assertion is not released immediately; it is held for another `graceMs`. That absorbs the gap between two tasks instead of churning spawn/terminate.

## Layout

```
src/
├── index.ts          host entry (default-exports the LockRun service)
├── service.ts        LockRun: the assertion owner — poll, spawn/terminate, grace
├── activity.ts       is work in flight: ctx.jobs + session-activity waterfall
├── power.ts          per-platform helper argv (caffeinate / systemd-inhibit / PowerShell)
├── contract.ts       types and constants shared by both halves
└── client/
    ├── index.ts        slots.inject('settings.general.item') + locale registration
    ├── LockRunRow.tsx  the row: title, description, mode selector, write-back
    ├── locales.ts      zh/en dictionaries (en is typed against zh, so a missing key is a compile error)
    └── styles.ts       the few CSS rules the row needs
```

`src/*.ts` is the host half (Node); `src/client/*` is the browser half (React 18).

## Build

```bash
pnpm install
pnpm build       # tsc -> lib/types/**, tsdown -> lib/index.js + lib/client.js
pnpm typecheck   # tsc --noEmit only
```

**`lib/` is committed to the repository** (it is not in `.gitignore`) and the package carries no `prepare` script, so installing from the git URL needs no build, no dev dependencies, and no entry in pnpm's `onlyBuiltDependencies` allowlist:

- pnpm 10.34+ blocks a git dependency's `prepare` (`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`), and the allowlist entry it demands is `dsh-lock-run@<spec>#<commit sha>` — a string that goes stale on every upstream commit;
- shipping the build instead makes `dsh plugin add <spec>` take `lib/` as-is.

After editing `src/`, run **`pnpm build` and commit `lib/` along with it**, or everyone installing from git gets the previous build.

Artifact contract:

- `lib/index.js`: Node ESM, imported directly by the cordis loader.
- `lib/client.js`: a CJS factory wrapped as `window.__ModuleLoader__.load({ id: "dsh-lock-run", factory: (require) => … })`; `react`, `react/jsx-runtime`, and `@deepseek-ai/dsh-client-ui-primitives` stay external and come from the page's static module table.

## Compatibility

Developed against `@deepseek-ai/dsh@0.1.7-rc.2`, with dev dependencies pinned to that line. dsh is still in developer preview, so contracts such as `settings.general.item`, `ctx.locale.register`, and `ctx.configForms` may drift between versions. After upgrading dsh, rebuild and confirm the first line of `lib/client.js` is still `window.__ModuleLoader__.load({ id: "dsh-lock-run"`.

## Known limits

- **A closed lid is out of reach.** On macOS, clamshell sleep needs an external display and power, or a `pmset` tweak. Do not close the lid on an overnight job.
- **Linux needs `systemd-inhibit`**, which lean images may not ship; when the helper cannot start the error goes to the DSH log rather than failing silently.
- **`always` is genuinely always-on** — pick it and forget it and the machine will never sleep by itself.
- DSH is in developer preview; official package version bumps may break compilation or loading. This project is written against `0.1.7-rc.2`.
