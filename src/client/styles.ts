/**
 * The one stylesheet this plugin needs. The row's own layout could ride inline
 * styles, but the dropdown anchor is a primitive's own button, so the few rules
 * that must reach across that boundary live here and are installed once per
 * client fiber.
 * @module dsh-lock-run/client/styles
 */

const STYLE_ID = 'dsh-lock-run-styles'

const CSS = `
.dsh-lock-run-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
}
.dsh-lock-run-text {
  min-width: 0;
}
.dsh-lock-run-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-text-l1, inherit);
}
.dsh-lock-run-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-text-l3, inherit);
}
.dsh-lock-run-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 5px 10px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.35));
  border-radius: 8px;
  background: var(--dsw-alias-bg-l2, transparent);
  color: var(--dsw-alias-text-l1, inherit);
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
}
.dsh-lock-run-select:hover {
  border-color: var(--dsw-alias-border-l3, rgba(127, 127, 127, 0.55));
}
.dsh-lock-run-state {
  margin-top: 2px;
  font-size: 12px;
  color: var(--dsw-alias-text-l3, inherit);
}
`

/**
 * Install the stylesheet for this fiber.
 * @returns a disposer removing the style element.
 */
export function installStyles(): () => void {
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const element = document.createElement('style')
  element.id = STYLE_ID
  element.textContent = CSS
  document.head.appendChild(element)
  return () => { element.remove() }
}
