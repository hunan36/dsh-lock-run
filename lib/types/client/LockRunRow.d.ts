import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type LockRunMode } from '../contract.ts';
/** The Host settings section this row reads and writes. */
export interface LockRunSection {
    mode: LockRunMode;
}
/** Injected business face: the settings scope, shared with every render. */
export interface LockRunRowInjected {
    /** The row's settings scope, owned by the plugin that mounted it. */
    form: ConfigForm<LockRunSection>;
}
/** Full component props: runtime share + locale seat + injected face. */
export type LockRunRowProps = PropsRuntime<'settings.general.item'> & PropsLocale<'lockRun'> & LockRunRowInjected;
/**
 * Render the row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export declare function LockRunRow({ t, form }: LockRunRowProps): import("react").JSX.Element;
