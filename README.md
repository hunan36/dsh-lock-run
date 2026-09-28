# dsh-lock-run

DeepSeek Harness 的「允许锁屏运行」插件：只在 Agent 任务或后台任务真正在跑的时候按住系统防休眠断言，全部空闲后按宽限期自动释放。

## 它做什么

设置 → 通用 里多出一行「允许锁屏运行」，四档：

| 档位 | 含义 | macOS | Linux | Windows |
|---|---|---|---|---|
| 关闭 | 不干预，系统按自己的计划休眠 | — | — | — |
| 熄屏后保持唤醒 | 允许熄屏，阻止系统休眠 | `caffeinate -i -s` | `systemd-inhibit --what=idle` | `ES_CONTINUOUS｜ES_SYSTEM_REQUIRED` |
| 锁屏后保持唤醒 | 同时阻止熄屏与系统休眠 | `caffeinate -d -i -s` | `systemd-inhibit --what=idle:sleep` | 追加 `ES_DISPLAY_REQUIRED` |
| 始终保持唤醒 | 不看任务状态，一直保持 | `caffeinate -d -i -s` | `systemd-inhibit --what=idle:sleep` | 追加 `ES_DISPLAY_REQUIRED` |

`always` 与 `keep-display` 的底层调用相同，区别只在**是否先读任务状态**。

## 为什么锁屏会中断任务

锁屏本身不中断任务——本地进程照跑。真正杀掉任务的是锁屏之后系统进入 sleep：进程被挂起，与模型 API 的长连接超时断开，醒来后重试耗尽。

所以这个插件防的是 **idle sleep**，不是 lock。

## 机制

**用子进程持有断言，不用 API 调用。** 断言的生命周期等于辅助进程的生命周期：进程活着就按住，进程退出系统自动释放。这样 DSH 崩溃、被 kill、或断电重启，都不会留下一个「永不休眠」的机器。

三个平台的实现都遵守这条规则：

- macOS：`caffeinate` 常驻
- Linux：`systemd-inhibit ... sleep infinity` 常驻
- Windows：PowerShell 调 `SetThreadExecutionState`（该 API 是线程级的），`while ($true) { Start-Sleep 60 }` 维持线程存活

**任务判定走两条独立的路**（`src/activity.ts`）：

- `ctx.jobs.list()` 里 status 为 `running` / `stopping` 的后台任务
- `workspace/session-activity` waterfall 报告有活跃项的会话（Agent 正在 turn 中）

第二条是必须的：模型调用在飞、但没有任何 job 的场景，恰恰是最容易被休眠打断的。

**轮询而非事件订阅。** 每 5 秒问一次「现在该不该按住」，然后让辅助进程朝答案靠拢。中断一次轮询不会让机器卡在没人要求的状态里——下一次轮询自然纠正。

**宽限期。** 全部空闲后不立刻释放，默认再等 60 秒。避免两个任务之间的空隙造成反复 spawn/terminate。

## 安装

```bash
cd ~/.dsh/profiles/web
pnpm add link:/path/to/dsh-lock-run
```

把插件的 `cordis.patch.yml` 里的 `- insert:` 段追加到 profile 的 `cordis.patch.yml`，DSH 热监视该文件，追加后立即生效：

```yaml
- insert:
    - id: lock-run
      name: 'dsh-lock-run'
      config:
        mode: allow-display-sleep
        pollMs: 5000
        graceMs: 60000
```

`dsh.client` 声明走 `package.json`，浏览器半由模块加载器按包名加载，无需额外配置。

## 配置

| 字段 | 默认 | 说明 |
|---|---|---|
| `mode` | `allow-display-sleep` | 四档之一，设置行写入的就是它 |
| `pollMs` | `5000` | 活动轮询间隔 |
| `graceMs` | `60000` | 最后一个任务结束后继续持有的时长 |

设置行写的是 `mode`。写入落在 profile 的 patch 文件里，DSH 重新 apply 该 entry，host 半拿到新值——所以配置文件里的值始终是唯一事实来源。

## 局限

- **管不住合盖**。macOS 合盖休眠需要外接显示器加电源，或改 `pmset` 配置。跑通宵任务别合盖。
- **Linux 依赖 `systemd-inhibit`**，精简镜像里可能没有；辅助进程起不来时错误写进 DSH 日志，不会静默。
- **`always` 档是真·常开**，选了就忘掉它的话机器不会自己休眠。
- DSH 处于 developer preview，官方包版本变动可能导致编译或加载失败。本项目按 `0.1.7-rc.2` 的接口编写。

## 开发

```bash
pnpm typecheck   # tsc --noEmit
pnpm build       # typecheck + tsdown 打包
```

源码分两半：`src/*.ts` 是 host 半（Node），`src/client/*` 是浏览器半（React 18）。`src/contract.ts` 只放类型和常量，两边共用。
