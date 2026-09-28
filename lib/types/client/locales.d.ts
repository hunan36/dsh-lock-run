/**
 * Browser copy for the 「允许锁屏运行」 row. Both dictionaries carry the same
 * keys; `en` is typed against `zh`, so a missing key is a compile error.
 * @module dsh-lock-run/client/locales
 */
export declare const LOCK_RUN_NS = "lockRun";
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Lock-run row copy owned by this plugin. */
        lockRun: LockRunKey;
    }
}
declare const zh: {
    'row.title': string;
    'row.description': string;
    'row.options': string;
    'mode.off': string;
    'mode.allow-display-sleep': string;
    'mode.keep-display': string;
    'mode.always': string;
    'state.busy': string;
    'state.holding': string;
    'state.grace': string;
    'state.idle': string;
    'state.off': string;
    'state.error': string;
};
/** The `lockRun` namespace key union. */
export type LockRunKey = keyof typeof zh;
/** Dictionaries registered under {@link LOCK_RUN_NS}. */
export declare const lockRunLocale: {
    zh: {
        'row.title': string;
        'row.description': string;
        'row.options': string;
        'mode.off': string;
        'mode.allow-display-sleep': string;
        'mode.keep-display': string;
        'mode.always': string;
        'state.busy': string;
        'state.holding': string;
        'state.grace': string;
        'state.idle': string;
        'state.off': string;
        'state.error': string;
    };
    en: {
        "row.title": string;
        "row.description": string;
        "row.options": string;
        "mode.off": string;
        "mode.allow-display-sleep": string;
        "mode.keep-display": string;
        "mode.always": string;
        "state.busy": string;
        "state.holding": string;
        "state.grace": string;
        "state.idle": string;
        "state.off": string;
        "state.error": string;
    };
};
export {};
