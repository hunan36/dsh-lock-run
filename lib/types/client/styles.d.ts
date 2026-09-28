/**
 * The one stylesheet this plugin needs. The row's own layout could ride inline
 * styles, but the dropdown anchor is a primitive's own button, so the few rules
 * that must reach across that boundary live here and are installed once per
 * client fiber.
 * @module dsh-lock-run/client/styles
 */
/**
 * Install the stylesheet for this fiber.
 * @returns a disposer removing the style element.
 */
export declare function installStyles(): () => void;
