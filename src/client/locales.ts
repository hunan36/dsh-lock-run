/**
 * Browser copy for the 「允许锁屏运行」 row. Both dictionaries carry the same
 * keys; `en` is typed against `zh`, so a missing key is a compile error.
 * @module dsh-lock-run/client/locales
 */
export const LOCK_RUN_NS = 'lockRun'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Lock-run row copy owned by this plugin. */
    lockRun: LockRunKey
  }
}

const zh = {
  'row.title': '允许锁屏运行',
  'row.description': '选择锁屏后的运行方式，保障远程控制与后台 Agent 任务持续执行',
  'row.options': '运行方式',
  'mode.off': '关闭',
  'mode.allow-display-sleep': '熄屏后保持唤醒',
  'mode.keep-display': '锁屏后保持唤醒',
  'mode.always': '始终保持唤醒',
  'state.busy': '任务执行中',
  'state.holding': '保持唤醒中',
  'state.grace': '宽限中 {seconds}s',
  'state.idle': '待机',
  'state.off': '已停用',
  'state.error': '助手异常',
}

/** The `lockRun` namespace key union. */
export type LockRunKey = keyof typeof zh

const en: { [K in LockRunKey]: string } = {
  'row.title': 'Allow running while locked',
  'row.description': 'Choose how the machine behaves after the screen locks, so remote control and background agent tasks keep running',
  'row.options': 'Run mode',
  'mode.off': 'Off',
  'mode.allow-display-sleep': 'Stay awake after display sleep',
  'mode.keep-display': 'Stay awake after lock',
  'mode.always': 'Always stay awake',
  'state.busy': 'Working',
  'state.holding': 'Holding awake',
  'state.grace': 'Grace {seconds}s',
  'state.idle': 'Idle',
  'state.off': 'Disabled',
  'state.error': 'Helper failed',
}

/** Dictionaries registered under {@link LOCK_RUN_NS}. */
export const lockRunLocale = { zh, en }
