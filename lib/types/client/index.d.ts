/**
 * dsh-lock-run, browser half. Registers the `lockRun` dictionary and one
 * `settings.general.item` row: the 「允许锁屏运行」 selector and its copy.
 * Loaded by the harness module loader as `dsh-lock-run/client.js`.
 * @module dsh-lock-run/client
 */
import type { Context } from '@deepseek-ai/cordis';
/** Services this fiber needs before it activates. */
export declare const inject: string[];
/**
 * Mount the preference row and its copy.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
