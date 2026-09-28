window.__ModuleLoader__.load({
	id: "dsh-lock-run",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/contract.ts
		/** Modes that hold a power assertion, in selector order. */
		const LOCK_RUN_MODES = [
			"off",
			"allow-display-sleep",
			"keep-display",
			"always"
		];
		//#endregion
		//#region src/client/LockRunRow.tsx
		/**
		* The 「允许锁屏运行」 row: title and description on the left, the mode selector
		* on the right — the shape the shipped Language and Appearance rows use.
		*
		* The settings section only stacks rows and projects no label, so this file
		* owns its own copy, its own control, and its own write.
		* @module dsh-lock-run/client/LockRunRow
		*/
		/** What an unwritten section shows; matches the schema default. */
		const FALLBACK = "allow-display-sleep";
		/**
		* Render the row.
		* @param props - composed slot props.
		* @returns the row element tree.
		*/
		function LockRunRow({ t, form }) {
			const snapshot = (0, react.useSyncExternalStore)((listener) => form.subscribe(listener), () => form.getSnapshot());
			const [open, setOpen] = (0, react.useState)(false);
			const mode = snapshot.value?.mode ?? FALLBACK;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-lock-run-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-lock-run-text",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-lock-run-title",
						children: t("row.title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-lock-run-desc",
						children: t("row.description")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open,
					align: "end",
					portal: true,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-lock-run-select",
						"aria-haspopup": "listbox",
						"aria-expanded": open,
						"aria-label": t("row.options"),
						onClick: () => setOpen((value) => !value),
						children: [t(`mode.${mode}`), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Caret, {})]
					}),
					items: LOCK_RUN_MODES.map((value) => ({
						id: value,
						label: t(`mode.${value}`)
					})),
					selectedId: mode,
					onSelect: (id) => {
						setOpen(false);
						form.set("mode", id);
					},
					onClose: () => setOpen(false)
				})]
			});
		}
		/** The selector's disclosure mark; the primitives expose no caret glyph. */
		function Caret() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "10",
				height: "10",
				viewBox: "0 0 10 10",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2 4L5 7L8 4",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.2",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Browser copy for the 「允许锁屏运行」 row. Both dictionaries carry the same
		* keys; `en` is typed against `zh`, so a missing key is a compile error.
		* @module dsh-lock-run/client/locales
		*/
		const LOCK_RUN_NS = "lockRun";
		/** Dictionaries registered under {@link LOCK_RUN_NS}. */
		const lockRunLocale = {
			zh: {
				"row.title": "允许锁屏运行",
				"row.description": "选择锁屏后的运行方式，保障远程控制与后台 Agent 任务持续执行",
				"row.options": "运行方式",
				"mode.off": "关闭",
				"mode.allow-display-sleep": "熄屏后保持唤醒",
				"mode.keep-display": "锁屏后保持唤醒",
				"mode.always": "始终保持唤醒",
				"state.busy": "任务执行中",
				"state.holding": "保持唤醒中",
				"state.grace": "宽限中 {seconds}s",
				"state.idle": "待机",
				"state.off": "已停用",
				"state.error": "助手异常"
			},
			en: {
				"row.title": "Allow running while locked",
				"row.description": "Choose how the machine behaves after the screen locks, so remote control and background agent tasks keep running",
				"row.options": "Run mode",
				"mode.off": "Off",
				"mode.allow-display-sleep": "Stay awake after display sleep",
				"mode.keep-display": "Stay awake after lock",
				"mode.always": "Always stay awake",
				"state.busy": "Working",
				"state.holding": "Holding awake",
				"state.grace": "Grace {seconds}s",
				"state.idle": "Idle",
				"state.off": "Disabled",
				"state.error": "Helper failed"
			}
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* The one stylesheet this plugin needs. The row's own layout could ride inline
		* styles, but the dropdown anchor is a primitive's own button, so the few rules
		* that must reach across that boundary live here and are installed once per
		* client fiber.
		* @module dsh-lock-run/client/styles
		*/
		const STYLE_ID = "dsh-lock-run-styles";
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
`;
		/**
		* Install the stylesheet for this fiber.
		* @returns a disposer removing the style element.
		*/
		function installStyles() {
			if (document.getElementById(STYLE_ID) !== null) return () => {};
			const element = document.createElement("style");
			element.id = STYLE_ID;
			element.textContent = CSS;
			document.head.appendChild(element);
			return () => {
				element.remove();
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** Services this fiber needs before it activates. */
		const inject = [
			"slots",
			"locale",
			"configForms"
		];
		/** Host plugin entry id whose settings section this row reads and writes. */
		const ENTRY_ID = "lock-run";
		/**
		* Mount the preference row and its copy.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(LOCK_RUN_NS, lockRunLocale), "dsh-lock-run: locale dictionary");
			ctx.effect(installStyles, "dsh-lock-run: stylesheet");
			const form = ctx.configForms.get(ENTRY_ID);
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: ENTRY_ID,
				order: 30,
				locale: LOCK_RUN_NS,
				inject: () => ({ form })
			}, LockRunRow));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
