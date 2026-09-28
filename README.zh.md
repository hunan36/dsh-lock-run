# dsh-lock-run

[English](README.md) | 中文

DeepSeek Harness 的「允许锁屏运行」插件：只在 Agent 任务或后台任务真正在跑的时候按住系统防休眠断言，全部空闲并过了宽限期后再让机器休眠。

```
设置 → 通用：
   允许锁屏运行     [锁屏后保持唤醒 ▾]   ← 点击
                          ├ 关闭
                          ├ 熄屏后保持唤醒
                          ├ 锁屏后保持唤醒          ✓
                          └ 始终保持唤醒
```

## 它做什么

一行四档：

| 档位 | 含义 | macOS | Linux | Windows |
|---|---|---|---|---|
| 关闭 | 不干预，系统按自己的计划休眠 | — | — | — |
| 熄屏后保持唤醒 | 允许熄屏，阻止系统休眠 | `caffeinate -i -s` | `systemd-inhibit --what=idle` | `ES_CONTINUOUS｜ES_SYSTEM_REQUIRED` |
| 锁屏后保持唤醒 | 同时阻止熄屏与系统休眠 | `caffeinate -d -i -s` | `systemd-inhibit --what=idle:sleep` | 追加 `ES_DISPLAY_REQUIRED` |
| 始终保持唤醒 | 不看任务状态，一直保持 | `caffeinate -d -i -s` | `systemd-inhibit --what=idle:sleep` | 追加 `ES_DISPLAY_REQUIRED` |

`always` 与 `keep-display` 的底层调用相同，区别只在**是否先读任务状态**。

### 为什么锁屏会中断任务

锁屏本身不中断任务——本地进程照跑。真正杀掉任务的是锁屏之后系统进入 sleep：进程被挂起，与模型 API 的长连接超时断开，醒来后重试耗尽。

所以这个插件防的是 **idle sleep**，不是 lock。

## 安装

两种方式，任选其一。

### 方式一：插件页（GUI）

界面左侧「插件」→「添加插件」→「包名或地址」填：

```
https://github.com/hunan36/dsh-lock-run
```

点「安装」，装好后在「已安装」里启用（立即启用）。插件页会在**它自己所在的 profile**（通常是 `web`）里执行 `pnpm add <地址>` 并把本包写进 `dsh.profile.bundles`，两条都不用你手动做。带不带 `.git` 后缀都认。

装完**刷新页面**（⌘⇧R），浏览器才会取到新的 client bundle；如果该 profile 没有 `patchReload: live`，再重启一次 `dsh web` 让 host 半生效。

### 方式二：命令行（推荐用独立 profile）

```bash
# 1. 建一个独立 profile（不动现有 web profile）
dsh --profile lockrun-web --from-default-profile web

# 2. 加插件——git 地址，或本地检出的绝对路径
dsh plugin --profile lockrun-web add https://github.com/hunan36/dsh-lock-run
# dsh plugin --profile lockrun-web add "$PWD"

# 3. 在插件页点「启用」，或直接改 bundle 列表：
#    dsh.profile.bundles += "dsh-lock-run"
#    本包声明了 dsh.bundle.patch，启用后会从包自带的 cordis.patch.yml
#    挂载 LockRun 服务。

# 4. 启动
dsh --profile lockrun-web
```

本地检出也可以不用插件管理器，手动链接：

```bash
cd ~/.dsh/profiles/web
pnpm add link:/path/to/dsh-lock-run
```

然后把插件 `cordis.patch.yml` 里的 `insert:` 段追加到 profile 的 `cordis.patch.yml`。DSH 热监视该文件，追加后立即生效；浏览器半无需额外配置——`dsh.client` 声明在 `package.json` 里，模块加载器按包名加载。

### 没有 pnpm 的机器

dsh 的插件管理——插件页的「安装」和 `dsh plugin …`——底层调用 pnpm，机器上没有就直接失败：

```
dsh: pnpm was not found; install pnpm and make it available on PATH.
```

装一个（Node 自带 npm）：

```bash
npm install -g pnpm        # 最新的 10.x
# 或：corepack enable && corepack prepare pnpm@10 --activate
```

别让 Corepack 用它自己的默认值：裸跑 `corepack enable` 得到的是 pnpm **8.15.7**，会一头撞进下面的 `ERR_PNPM_ADDING_TO_ROOT`。

完全不想装 pnpm 也可以——本插件自身不依赖它（没有运行时 `dependencies`）：

- **用 Node 的 npm**：`cd ~/.dsh/profiles/<profile> && npm install https://github.com/hunan36/dsh-lock-run`
- **整个目录拷进去**：把 `dsh-lock-run` 文件夹（含 `lib/`）直接放进 `<profile>/node_modules/`，适合离线或纯手工场景

两种方式都差一步：把 `dsh-lock-run` 写进该 profile `package.json` 的 `dsh.profile.bundles`，然后重启 `dsh web`。插件页和 `dsh plugin add` 会替你做这件事，手工安装不会——包躺在 `node_modules` 里也不会被加载。

### 安装报 ERR_PNPM_ADDING_TO_ROOT

dsh 的 profile 目录本身就是一个 pnpm workspace（`pnpm-workspace.yaml` 里 `packages: [.]`），pnpm 8 把那里的 `pnpm add` 当成「往 workspace 根目录加依赖」，直接拒绝。profile 没有 `packageManager` 字段时，Node 的 Corepack 会替它填一个（通常是 `pnpm@8.15.7`），于是安装在**还没解析到本插件之前**就死在这条检查上——这个失败与本包无关。

任选其一即可通过：

1. **走插件页（GUI）**：这条路执行的 `pnpm add <spec>` 传不了 `-w`，先往 profile 的 `.npmrc` 写一行，再在对话框里点「重试」，同一条命令就能在 pnpm 8 下成功：

   ```bash
   echo 'ignore-workspace-root-check=true' >> ~/.dsh/profiles/lockrun-web/.npmrc
   ```

2. 命令行里把 `-w` 透传进去（dsh 会把额外参数转给 pnpm）：

   ```bash
   dsh plugin --profile lockrun-web add -w https://github.com/hunan36/dsh-lock-run.git
   ```

3. 把 profile 升到 pnpm 10（本插件实测所用的版本）：在 profile 里跑 `corepack use pnpm@10`，或把 Corepack 写入的 `packageManager` 字段改成 `pnpm@10.34.5`。

注意第一次失败后 Corepack 已经把 `packageManager: pnpm@8.15.7+sha512…` 写进了该 profile 的 `package.json`，此后那里所有插件操作都用 pnpm 8——第 3 条才是治本的。

需要 Node `^22.19.0 || >=24.0.0` 与 pnpm 10；本仓库用 `packageManager: pnpm@10.34.5` 锁定。

## 配置

写在 `cordis.patch.yml` 里：

| 字段 | 默认 | 说明 |
|---|---|---|
| `mode` | `allow-display-sleep` | 上面四档之一，设置行写入的就是它 |
| `pollMs` | `5000` | 活动轮询间隔 |
| `graceMs` | `60000` | 最后一个任务结束后继续持有的时长 |

设置行写的是 `mode`。写入落在 profile 的 patch 文件里，DSH 重新 apply 该 entry，host 半拿到新值——所以配置文件里的值始终是唯一事实来源。

## 机制

**用子进程持有断言，不用 API 调用。** 断言的生命周期等于辅助进程的生命周期：进程活着就按住，进程退出系统自动释放。这样 DSH 崩溃、被 kill、或断电重启，都不会留下一个「永不休眠」的机器。三个平台的实现都遵守这条规则：

- macOS：`caffeinate` 常驻
- Linux：`systemd-inhibit ... sleep infinity` 常驻
- Windows：PowerShell 调 `SetThreadExecutionState`（该 API 是线程级的），`while ($true) { Start-Sleep 60 }` 维持线程存活

**任务判定走两条独立的路**（`src/activity.ts`）：

- `ctx.jobs.list()` 里 status 为 `running` / `stopping` 的后台任务
- `workspace/session-activity` waterfall 报告有活跃项的会话（Agent 正在 turn 中）

第二条是必须的：模型调用在飞、但没有任何 job 的场景，恰恰是最容易被休眠打断的。

**轮询而非事件订阅。** 每 `pollMs` 问一次「现在该不该按住」，然后让辅助进程朝答案靠拢。中断一次轮询不会让机器卡在没人要求的状态里——下一次轮询自然纠正。

**宽限期。** 全部空闲后不立刻释放，默认再等 `graceMs`。避免两个任务之间的空隙造成反复 spawn/terminate。

## 目录

```
src/
├── index.ts          host 入口（默认导出 LockRun 服务）
├── service.ts        LockRun：断言的持有者——轮询、起停、宽限期
├── activity.ts       有没有活在跑：ctx.jobs + session-activity waterfall
├── power.ts          各平台辅助进程的 argv（caffeinate / systemd-inhibit / PowerShell）
├── contract.ts       两半共用的类型与常量
└── client/
    ├── index.ts        slots.inject('settings.general.item') + 词典注册
    ├── LockRunRow.tsx  设置行：标题、描述、档位选择、写回
    ├── locales.ts      中英文案（en 按 zh 的键生成类型，缺键就是编译错误）
    └── styles.ts       设置行需要的少量 CSS
```

`src/*.ts` 是 host 半（Node），`src/client/*` 是浏览器半（React 18）。

## 构建

```bash
pnpm install
pnpm build       # tsc -> lib/types/**，tsdown -> lib/index.js + lib/client.js
pnpm typecheck   # 只跑 tsc --noEmit
```

**`lib/` 提交进了仓库**（不在 `.gitignore` 里），且本包没有 `prepare` 脚本，所以从 git 地址安装不需要构建、不需要 devDependencies，也不需要往 pnpm 的 `onlyBuiltDependencies` 白名单里加条目：

- pnpm 10.34+ 会拦截 git 依赖的 `prepare`（`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`），而它要求的白名单条目是 `dsh-lock-run@<spec>#<commit sha>`——上游每提交一次这个字符串就过期；
- 直接带上构建产物，则 `dsh plugin add <spec>` 原样拿到 `lib/`。

改过 `src/` 之后，**跑 `pnpm build` 并把 `lib/` 一起提交**，否则所有从 git 安装的人拿到的都是上一次的构建。

产物契约：

- `lib/index.js`：Node ESM，cordis loader 直接 import。
- `lib/client.js`：CJS 工厂，外层是 `window.__ModuleLoader__.load({ id: "dsh-lock-run", factory: (require) => … })`；`react`、`react/jsx-runtime`、`@deepseek-ai/dsh-client-ui-primitives` 保持 external，由页面的静态模块表提供。

## 兼容性

按 `@deepseek-ai/dsh@0.1.7-rc.2` 开发，devDependencies 锁在该版本线上。dsh 仍处于 developer preview，`settings.general.item`、`ctx.locale.register`、`ctx.configForms` 这类契约可能随版本漂移。升级 dsh 后重新构建，并确认 `lib/client.js` 第一行仍是 `window.__ModuleLoader__.load({ id: "dsh-lock-run"`。

## 局限

- **管不住合盖**。macOS 合盖休眠需要外接显示器加电源，或改 `pmset` 配置。跑通宵任务别合盖。
- **Linux 依赖 `systemd-inhibit`**，精简镜像里可能没有；辅助进程起不来时错误写进 DSH 日志，不会静默。
- **`always` 档是真·常开**，选了就忘掉它的话机器不会自己休眠。
- DSH 处于 developer preview，官方包版本变动可能导致编译或加载失败。本项目按 `0.1.7-rc.2` 的接口编写。
