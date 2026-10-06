window.__ModuleLoader__.load({
	id: "dsh-deepseek-balance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		// ---- DSH design tokens ----
		// Near-black bluish surfaces + the DeepSeek blue accent, straight from the
		// host theme: the panel follows light/dark and any custom theme.
		// NOTE: --dsw-alias-bg-overlay is a mid-gray mask (bluish-700 in dark), and
		// --dsw-alias-brand-primary is the monochrome ink (near-white in dark) —
		// neither is a surface or an accent, so both are avoided here.
		function palette() {
			return {
				bg: "var(--dsw-alias-bg-base)",
				sidebar: "var(--dsw-specific-sidebar-fill)",
				card: "var(--dsw-alias-button-floating-fill)",
				card2: "var(--dsw-alias-bg-layer-3)",
				overlay: "var(--dsw-alias-button-floating-fill)",
				border: "var(--dsw-alias-border-l1)",
				borderStrong: "var(--dsw-alias-border-l2)",
				fg: "var(--dsw-alias-label-primary)",
				muted: "var(--dsw-alias-label-secondary)",
				tertiary: "var(--dsw-alias-label-tertiary)",
				mutedBg: "var(--dsw-alias-interactive-bg-hover)",
				hover: "var(--dsw-alias-interactive-bg-hover)",
				active: "var(--dsw-alias-interactive-bg-active)",
				chip: "var(--dsw-alias-button-tool-bar-fill)",
				primary: "var(--dsw-alias-link)",
				onPrimary: "var(--dsw-alias-label-primary-foreground)",
				primaryFill: "var(--dsw-alias-button-primary-fill)",
				primaryHover: "var(--dsw-alias-button-primary-hover)",
				warn: "var(--dsw-alias-state-warn-primary)",
				ok: "var(--dsw-alias-state-success-primary)",
				bad: "var(--dsw-alias-state-error-primary)",
				idle: "var(--dsw-alias-state-idle-primary)",
				radiusSm: "var(--dsw-radius-sm)",
				radiusMd: "var(--dsw-radius-md)",
				radiusLg: "var(--dsw-radius-lg)",
				shadow: "0 16px 40px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)",
				menuShadow: "0 10px 28px rgba(0,0,0,0.24)",
				font: "var(--dsw-font-family)"
			};
		}
		/** Translucent tint of a token color — keeps light/dark fidelity. */
		const tint = (color, percent) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;
		/** Hover state without a stylesheet. */
		function useHover() {
			const [hover, setHover] = react.useState(false);
			return [hover, { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) }];
		}
		/** Select chip: caption + current value + chevron, like DSH's filter chips. */
		function SelectChip(props) {
			const C = palette();
			const [hover, setHover] = react.useState(false);
			return react_jsx_runtime.jsxs("button", {
				type: "button",
				onClick: props.onClick,
				title: props.title,
				"aria-label": props.title ?? props.label,
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					flex: props.flex === false ? "none" : 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 6,
					minWidth: 0,
					maxWidth: props.maxWidth,
					background: props.open === true ? C.hover : (hover ? C.hover : C.chip),
					border: `1px solid ${props.open === true ? C.borderStrong : "transparent"}`,
					borderRadius: C.radiusSm,
					padding: "5px 8px",
					cursor: "pointer",
					fontFamily: C.font,
					color: C.fg,
					fontSize: 11,
					lineHeight: "16px",
					textAlign: "left",
					transition: "background 120ms ease, border-color 120ms ease"
				},
				children: [
					react_jsx_runtime.jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 }, children: [
						props.label ? react_jsx_runtime.jsx("span", { style: { color: C.tertiary, fontSize: 10, flex: "none" }, children: props.label }) : null,
						react_jsx_runtime.jsx("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500, letterSpacing: "-0.01em" }, children: props.value })
					] }),
					react_jsx_runtime.jsx("span", { style: { color: C.tertiary, fontSize: 9, flex: "none" }, children: "▾" })
				]
			});
		}
		/** Dropdown panel shared by every menu. */
		function MenuPanel(props) {
			const C = palette();
			return react_jsx_runtime.jsx("div", {
				style: {
					position: "absolute",
					top: "calc(100% + 4px)",
					left: props.left,
					right: props.right,
					zIndex: 10001,
					background: C.card2,
					border: `1px solid ${C.borderStrong}`,
					borderRadius: C.radiusMd,
					boxShadow: C.menuShadow,
					padding: 4,
					display: "flex",
					flexDirection: "column",
					gap: 1,
					minWidth: props.minWidth,
					maxHeight: props.maxHeight,
					overflowY: "auto",
					...props.style
				},
				children: props.children
			});
		}
		/** One row inside a MenuPanel. */
		function MenuItem(props) {
			const C = palette();
			const [hover, setHover] = react.useState(false);
			return react_jsx_runtime.jsx("button", {
				type: "button",
				onClick: props.onClick,
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					display: "flex",
					alignItems: "center",
					gap: 6,
					background: hover ? C.hover : "transparent",
					border: "none",
					borderRadius: C.radiusSm,
					padding: "5px 8px",
					cursor: "pointer",
					fontFamily: C.font,
					fontSize: 11,
					lineHeight: "16px",
					textAlign: "left",
					whiteSpace: "nowrap",
					color: props.selected === true ? C.primary : C.fg,
					fontWeight: props.selected === true ? 600 : 400,
					transition: "background 120ms ease"
				},
				children: props.children
			});
		}
		/** Tool-row button: ghost by default, `variant: "primary"` for the main action. */
		function SoftButton(props) {
			const C = palette();
			const [hover, setHover] = react.useState(false);
			const primary = props.variant === "primary";
			const disabled = props.disabled === true;
			const tone = primary
				? { background: hover && !disabled ? C.primaryHover : C.primaryFill, color: C.onPrimary }
				: { background: hover && !disabled ? C.hover : "transparent", color: hover && !disabled ? C.fg : C.muted };
			return react_jsx_runtime.jsx("button", {
				type: "button",
				onClick: props.onClick,
				disabled,
				title: props.title,
				"aria-label": props.ariaLabel,
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					border: "none",
					borderRadius: C.radiusSm,
					padding: primary ? "5px 12px" : "5px 9px",
					cursor: disabled ? "default" : "pointer",
					fontFamily: C.font,
					fontSize: 11,
					fontWeight: primary ? 600 : 500,
					lineHeight: "16px",
					flex: "none",
					opacity: disabled ? 0.45 : 1,
					transition: "background 120ms ease, color 120ms ease, opacity 120ms ease",
					...tone,
					...props.style
				},
				children: props.children
			});
		}
		const LOW_BALANCE_THRESHOLD = 10;

		// ---- polling hook ----
		function useStatus(intervalMs, keyRef) {
			const [state, setState] = react.useState({ status: "loading" });
			const [version, setVersion] = react.useState(0);
			react.useEffect(() => {
				let current = true;
				let timer = null;
				const load = () => {
					const url = "/api/deepseek-status" + (keyRef ? `?key=${encodeURIComponent(keyRef)}` : "");
					fetch(url, { cache: "no-store" })
						.then((response) => response.json())
						.then((data) => { if (current) setState({ status: "ready", data }); })
						.catch((error) => { if (current) setState({ status: "error", message: String(error) }); });
				};
				load();
				if (intervalMs > 0) timer = window.setInterval(load, intervalMs);
				return () => { current = false; if (timer !== null) window.clearInterval(timer); };
			}, [version, intervalMs, keyRef]);
			return { state, refresh: () => setVersion((value) => value + 1) };
		}

		// ---- formatting ----
		const fmtMoney = (value) =>
			typeof value === "number" && Number.isFinite(value) ? `¥${value.toFixed(2)}` : "—";
		const fmtInt = (value) =>
			typeof value === "number" && Number.isFinite(value) ? Math.round(value).toLocaleString() : "—";
		const fmtTokensCompact = (value) => {
			if (typeof value !== "number" || !Number.isFinite(value)) return "—";
			if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
			if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
			if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
			return String(Math.round(value));
		};
		const fmtCountCompact = (value) => {
			if (typeof value !== "number" || !Number.isFinite(value)) return "—";
			if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
			if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
			return String(Math.round(value));
		};
		const fmtKey = (key) => key ?? "—";
		const formatTime = (iso) => {
			if (typeof iso !== "string" || iso.length === 0) return "";
			const date = new Date(iso);
			return Number.isFinite(date.getTime()) ? date.toLocaleTimeString() : "";
		};

		// ---- period keys ----
		const PERIODS = ["today", "yesterday", "days7", "days30", "month", "lastMonth"];

		// ---- sidebar strip: a native-feeling sidebar row above Settings ----
		function StatusStrip({ t, state, period, onClick, stripRef }) {
			const C = palette();
			const [hover, setHover] = react.useState(false);
			const data = state.status === "ready" ? state.data : null;
			const balance = data?.balance ?? null;
			const usage = data?.usage ?? null;
			const low = balance !== null && balance.infos.some((info) => info.total < LOW_BALANCE_THRESHOLD);
			const total = balance !== null && balance.infos.length > 0 ? balance.infos[0].total : null;
			const periodData = usage ? usage[period] : null;
			const color = low ? C.warn : C.primary;
			const item = (label, value, strong) => react_jsx_runtime.jsxs("span", {
				style: { display: "inline-flex", alignItems: "baseline", gap: 3, whiteSpace: "nowrap", lineHeight: "16px" },
				children: [
					react_jsx_runtime.jsx("span", { style: { color: C.tertiary, fontSize: 10 }, children: label }),
					react_jsx_runtime.jsx("span", { style: { color: strong ? color : C.fg, fontSize: strong ? 12 : 11, fontWeight: strong ? 600 : 500, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }, children: value })
				]
			});
			return react_jsx_runtime.jsx("button", {
				ref: stripRef,
				type: "button",
				"aria-label": t("title"),
				title: `${t("title")} · ${t("balance")} ${fmtMoney(total)} · ${t("spent")} ${fmtMoney(periodData?.cost ?? null)} · ${t("apiRequests")} ${fmtInt(periodData?.requests ?? null)} · ${t("tokens")} ${fmtTokensCompact(periodData?.tokens ?? null)}`,
				onClick,
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => setHover(false),
				style: {
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					columnGap: 10,
					rowGap: 2,
					width: "100%",
					minWidth: 0,
					border: "none",
					background: hover ? C.hover : "transparent",
					borderRadius: C.radiusSm,
					padding: "5px 8px",
					cursor: "pointer",
					fontFamily: C.font,
					color: C.fg,
					textAlign: "left",
					transition: "background 120ms ease"
				},
				children: [
					item(t("balanceShort"), fmtMoney(total), true),
					item(t("spentShort"), fmtMoney(periodData?.cost ?? null), false),
					item(t("requestsShort"), fmtCountCompact(periodData?.requests ?? null), false),
					item(t("tokensShort"), fmtTokensCompact(periodData?.tokens ?? null), false)
				]
			});
		}

		// ---- platform token row: [手动输入][自动获取] ... [更新时间][刷新] ----
		function TokenRow({ t, refresh, updatedText }) {
			const C = palette();
			const [manualOpen, setManualOpen] = react.useState(false);
			const [draft, setDraft] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [msg, setMsg] = react.useState(null);
			const msgTimer = react.useRef(null);
			react.useEffect(() => () => { if (msgTimer.current !== null) window.clearTimeout(msgTimer.current); }, []);
			const showMsg = (text) => {
				setMsg(text);
				if (msgTimer.current !== null) window.clearTimeout(msgTimer.current);
				msgTimer.current = window.setTimeout(() => setMsg(null), 5000);
			};
			const run = async (action, token) => {
				setBusy(true);
				setMsg(null);
				if (msgTimer.current !== null) { window.clearTimeout(msgTimer.current); msgTimer.current = null; }
				try {
					const response = await fetch("/api/deepseek-token", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(action === "auto" ? { action: "auto" } : { action: "save", token })
					});
					const result = await response.json();
					if (result.ok && result.found) {
						setDraft("");
						showMsg(`${t("tokenFetched")} ${result.masked}`);
						setManualOpen(false);
						refresh();
					} else if (result.ok) {
						setDraft("");
						showMsg(`${t("tokenSaved")} ${result.masked}`);
						setManualOpen(false);
						refresh();
					} else {
						showMsg(result.error ?? t("tokenFailed"));
					}
				} catch (error) {
					showMsg(String(error));
				} finally {
					setBusy(false);
				}
			};
			return react_jsx_runtime.jsxs("div", {
				style: { borderTop: `1px solid ${C.border}`, background: "transparent", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 },
				children: [
					react_jsx_runtime.jsxs("div", {
						style: { display: "flex", alignItems: "center", gap: 4 },
						children: [
							react_jsx_runtime.jsx(SoftButton, {
								onClick: () => setManualOpen(!manualOpen),
								disabled: busy,
								children: t("manualInput")
							}),
							react_jsx_runtime.jsx(SoftButton, {
								onClick: () => run("auto"),
								disabled: busy,
								children: busy ? t("fetching") : t("tokenAuto")
							}),
							react_jsx_runtime.jsx("span", { style: { flex: 1 } }),
							react_jsx_runtime.jsx("span", { style: { color: C.tertiary, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: updatedText }),
							react_jsx_runtime.jsx(SoftButton, {
								onClick: refresh,
								children: t("refresh")
							})
						]
					}),
					manualOpen ? react_jsx_runtime.jsxs("div", {
						style: { display: "flex", alignItems: "center", gap: 6 },
						children: [
							react_jsx_runtime.jsx("input", {
								type: "text",
								value: draft,
								onChange: (event) => setDraft(event.currentTarget.value),
								placeholder: t("tokenPlaceholder"),
								style: { flex: 1, minWidth: 0, background: C.card2, border: `1px solid ${C.borderStrong}`, borderRadius: C.radiusSm, padding: "5px 8px", color: C.fg, fontFamily: C.font, fontSize: 11, outline: "none" }
							}),
							react_jsx_runtime.jsx(SoftButton, {
								variant: "primary",
								onClick: () => run("save", draft),
								disabled: busy || draft.trim().length === 0,
								children: t("tokenSave")
							})
						]
					}) : null,
					msg ? react_jsx_runtime.jsx("span", { style: { color: C.tertiary, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: msg, children: msg }) : null
				]
			});
		}

		// ---- DeepSeek peak / off-peak window badge (Beijing time, UTC+8) ----
		// Peak: 09:00–12:00 and 14:00–18:00 (start inclusive, end exclusive); the rest is idle.
		const PEAK_WINDOWS = [
			[9 * 60, 12 * 60],
			[14 * 60, 18 * 60]
		];
		function isPeakNow() {
			let minuteOfDay = null;
			try {
				const parts = new Intl.DateTimeFormat("en-US", {
					timeZone: "Asia/Shanghai",
					hour: "2-digit",
					minute: "2-digit",
					hourCycle: "h23"
				}).formatToParts(new Date());
				let hour = null;
				let minute = null;
				for (const part of parts) {
					if (part.type === "hour") hour = Number(part.value);
					else if (part.type === "minute") minute = Number(part.value);
				}
				if (hour !== null && minute !== null && Number.isFinite(hour) && Number.isFinite(minute)) minuteOfDay = hour * 60 + minute;
			} catch { }
			// fallback: UTC+8 wall-clock arithmetic when Intl lacks the timezone
			if (minuteOfDay === null) {
				const shifted = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 8 * 3600000);
				minuteOfDay = shifted.getHours() * 60 + shifted.getMinutes();
			}
			return PEAK_WINDOWS.some(([start, end]) => minuteOfDay >= start && minuteOfDay < end);
		}
		function PeakBadge({ t }) {
			const C = palette();
			const [, setTick] = react.useState(0);
			react.useEffect(() => {
				const id = window.setInterval(() => setTick((value) => value + 1), 30000);
				return () => window.clearInterval(id);
			}, []);
			const peak = isPeakNow();
			// amber while the expensive window is open, DeepSeek blue when idle
			const color = peak ? C.warn : C.primary;
			return react_jsx_runtime.jsx("span", {
				title: t("peakWindow"),
				style: { display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 600, lineHeight: "14px", letterSpacing: "-0.01em", color, background: tint(color, 14), border: `1px solid ${tint(color, 32)}`, whiteSpace: "nowrap", flex: "none" },
				children: [
					react_jsx_runtime.jsx("span", { "aria-hidden": "true", style: { width: 5, height: 5, borderRadius: "50%", background: color, flex: "none", boxShadow: `0 0 0 3px ${tint(color, 16)}` } }),
					react_jsx_runtime.jsx("span", { children: peak ? t("peak") : t("idle") })
				]
			});
		}

		// ---- the reference-style card ----
		function StatusCard({ wide, t, state, refresh, onClose, period, onPeriodChange, keyRef, onSelectKey, currentModel, onModelChange, pos }) {
			const C = palette();
			const [menuOpen, setMenuOpen] = react.useState(false);
			const [keyMenu, setKeyMenu] = react.useState(false);
			const [modelMenu, setModelMenu] = react.useState(false);
			const data = state.status === "ready" ? state.data : null;
			const balance = data?.balance ?? null;
			const usage = data?.usage ?? null;
			const keyList = data?.keys ?? [];
			const activeKeyRef = keyRef ?? data?.key?.ref ?? "DEEPSEEK_API_KEY";
			const activeKeyMasked = (keyList.find((k) => k.ref === activeKeyRef)?.masked) ?? data?.key?.masked ?? null;
			// model selector: prefer the platform usage categories, else the harness catalog
			const usageModels = usage?.models ?? [];
			const harnessModels = data?.models ?? [];
			const usePlatformModels = usageModels.length > 0;
			const selectorOptions = usePlatformModels
				? usageModels.map((m) => ({ model: m.model, name: m.model }))
				: harnessModels.flatMap((group) => group.models.map((m) => ({ model: m.id, name: m.name ?? m.id })));
			const activeModelId = currentModel !== null && selectorOptions.some((o) => o.model === currentModel)
				? currentModel
				: (selectorOptions.length > 0 ? selectorOptions[0].model : null);
			const selModel = usePlatformModels && activeModelId !== null
				? usageModels.find((m) => m.model === activeModelId) ?? null
				: null;
			const low = balance !== null && balance.infos.some((info) => info.total < LOW_BALANCE_THRESHOLD);
			const info = balance !== null && balance.infos.length > 0 ? balance.infos[0] : null;
			const periodData = selModel !== null
				? (selModel[period] ?? null)
				: (usage ? usage[period] : null);
			const spent = periodData?.cost ?? null;
			const requests = periodData?.requests ?? null;
			const tokens = periodData?.tokens ?? null;
			const chartDays = selModel !== null ? (selModel.days ?? []) : (usage?.days ?? []);
			const maxCost = chartDays.reduce((m, d) => Math.max(m, d.cost ?? 0), 0);
			// data reads as DeepSeek blue; only a low balance turns amber
			const balanceColor = low ? C.warn : C.primary;
			const cumulativeColor = C.primary;
			const cumulativeOfficial = usage?.cumulativeOfficial ?? null;
			const cumulativeText = cumulativeOfficial !== null
				? fmtMoney(cumulativeOfficial)
				: `≈${fmtMoney(usage?.cumulative ?? null)}`;
			// one metric cell: caption / value / optional unit
			const metric = (label, value, options = {}) => react_jsx_runtime.jsxs("div", {
				style: { padding: "12px 14px", minWidth: 0, borderRight: options.right === true ? `1px solid ${C.border}` : void 0 },
				children: [
					react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 10, lineHeight: "14px", color: C.tertiary }, children: label }),
					react_jsx_runtime.jsx("p", { style: { margin: "4px 0 0", fontSize: 15, fontWeight: 600, lineHeight: "20px", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: options.accent ?? C.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: value }),
					options.suffix ? react_jsx_runtime.jsx("p", { style: { margin: "1px 0 0", fontSize: 10, lineHeight: "14px", color: C.tertiary }, children: options.suffix }) : null
				]
			});

			let body;
			if (state.status === "loading") {
				body = react_jsx_runtime.jsx("p", { style: { margin: 0, padding: "16px", fontSize: 12, color: C.muted }, children: t("loading") });
			} else if (state.status === "error" || (data && !data.ok)) {
				body = react_jsx_runtime.jsxs("div", {
					style: { padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 },
					children: [
						react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 12, fontWeight: 600, color: C.bad }, children: t("error") }),
						data?.error ? react_jsx_runtime.jsx("code", { style: { fontSize: 11, lineHeight: "16px", color: C.tertiary, wordBreak: "break-all" }, children: data.error }) : null
					]
				});
			} else if (!data.key.configured) {
				body = react_jsx_runtime.jsxs("div", {
					style: { padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 },
					children: [
						react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 12, fontWeight: 600, color: C.warn }, children: t("notConfigured") }),
						react_jsx_runtime.jsx("code", { style: { fontSize: 11, lineHeight: "16px", color: C.tertiary }, children: t("notConfiguredHint") })
					]
				});
			} else {
				body = react_jsx_runtime.jsxs("div", {
					children: [
						// filter chips (period + API key)
						react_jsx_runtime.jsxs("div", {
							style: { position: "relative", display: "flex", gap: 6, borderBottom: `1px solid ${C.border}`, padding: "10px 12px" },
							children: [
								react_jsx_runtime.jsx(SelectChip, {
									label: t("period"),
									value: t(period),
									title: t("period"),
									open: menuOpen,
									onClick: () => { setMenuOpen(!menuOpen); setModelMenu(false); setKeyMenu(false); }
								}),
								react_jsx_runtime.jsx(SelectChip, {
									label: t("keys"),
									value: fmtKey(activeKeyMasked),
									title: t("keys"),
									open: keyMenu,
									onClick: () => { setKeyMenu(!keyMenu); setMenuOpen(false); setModelMenu(false); }
								}),
								menuOpen ? react_jsx_runtime.jsx(MenuPanel, {
									left: 12,
									minWidth: 124,
									children: PERIODS.map((p) => react_jsx_runtime.jsx(MenuItem, {
										selected: period === p,
										onClick: () => { onPeriodChange(p); setMenuOpen(false); },
										children: t(p)
									}, p))
								}) : null,
								keyMenu ? react_jsx_runtime.jsx(MenuPanel, {
									right: 12,
									minWidth: 186,
									maxHeight: 220,
									children: keyList.length === 0
										? react_jsx_runtime.jsx("div", { style: { padding: "6px 8px", color: C.tertiary, fontSize: 11 }, children: t("noKeys") })
										: keyList.map((k) => react_jsx_runtime.jsx(MenuItem, {
											selected: activeKeyRef === k.ref,
											onClick: () => { onSelectKey(k.ref); setKeyMenu(false); },
											children: [
												react_jsx_runtime.jsx("span", { style: { color: C.tertiary }, children: k.ref }),
												react_jsx_runtime.jsx("span", { style: { fontWeight: 600 }, children: fmtKey(k.masked) })
											]
										}, k.ref))
								}) : null
							]
						}),
						// balance overview (2 cols)
						react_jsx_runtime.jsxs("div", {
							style: { display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${C.border}` },
							children: [
								metric(t("topUpBalance"), fmtMoney(info?.toppedUp ?? null), { accent: balanceColor, suffix: info?.currency ?? "—", right: true }),
								metric(t("cumulativeSpent"), cumulativeText, { accent: cumulativeColor, suffix: info?.currency ?? "—" })
							]
						}),
						// usage metrics (3 cols)
						react_jsx_runtime.jsxs("div", {
							style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${C.border}` },
							children: [
								metric(t("spent"), fmtMoney(spent), { accent: C.primary, right: true }),
								metric(t("apiRequests"), fmtInt(requests), { accent: C.primary, right: true }),
								metric(t("tokens"), fmtInt(tokens), { accent: C.primary })
							]
						}),
						// mini chart (last 7 days cost)
						react_jsx_runtime.jsx("div", {
							style: { padding: "14px 16px 16px" },
							children: react_jsx_runtime.jsx("div", {
								style: { display: "flex", alignItems: "flex-end", gap: 5, height: 52 },
								children: chartDays.length === 0
									? react_jsx_runtime.jsx("div", { style: { flex: 1, height: 4, borderRadius: 999, background: tint(C.primary, 22) } })
									: chartDays.map((day) => {
										const value = day.cost ?? 0;
										const pct = maxCost > 0 ? Math.max(6, Math.round((value / maxCost) * 100)) : 6;
										const mix = maxCost > 0 ? Math.round(20 + 80 * (value / maxCost)) : 20;
										return react_jsx_runtime.jsx("div", {
											style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" },
											children: react_jsx_runtime.jsx("div", {
												title: `${day.date} · ${fmtMoney(day.cost)}`,
												style: { width: "100%", borderRadius: "3px 3px 0 0", height: `${pct}%`, background: tint(C.primary, mix) }
											})
										}, day.date);
									})
							})
						})
					]
				});
			}

			return react_jsx_runtime.jsx("div", {
				role: "dialog",
				"aria-label": t("title"),
				style: {
					position: "fixed",
					left: pos.left,
					bottom: pos.bottom,
					width: 288,
					maxWidth: "calc(100vw - 96px)",
					background: C.overlay,
					border: `1px solid ${C.borderStrong}`,
					borderRadius: C.radiusLg,
					overflow: "hidden",
					boxShadow: C.shadow,
					color: C.fg,
					fontFamily: C.font,
					fontSize: 13,
					lineHeight: "20px",
					zIndex: 9999
				},
				children: [
					menuOpen || modelMenu || keyMenu ? react_jsx_runtime.jsx("div", {
						onClick: () => { setMenuOpen(false); setModelMenu(false); setKeyMenu(false); },
						style: { position: "fixed", inset: 0, zIndex: 1000 }
					}) : null,
							react_jsx_runtime.jsxs("header", {
								style: { position: "relative", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, padding: "10px 12px" },
								children: [
									react_jsx_runtime.jsx("span", {
										"aria-hidden": "true",
										title: balance?.isAvailable ? t("available") : t("unavailable"),
										style: { width: 6, height: 6, borderRadius: "50%", background: balance?.isAvailable ? C.ok : C.bad, flex: "none", boxShadow: `0 0 0 3px ${tint(balance?.isAvailable ? C.ok : C.bad, 16)}` }
									}),
									react_jsx_runtime.jsx(SelectChip, {
										value: activeModelId ? activeModelId : t("selectModel"),
										title: t("selectModel"),
										open: modelMenu,
										flex: false,
										maxWidth: 148,
										onClick: () => { setModelMenu(!modelMenu); setMenuOpen(false); setKeyMenu(false); }
									}),
									react_jsx_runtime.jsx(PeakBadge, { t }),
									react_jsx_runtime.jsx("span", { style: { flex: 1 } }),
									react_jsx_runtime.jsx(SoftButton, {
										ariaLabel: t("close"),
										onClick: onClose,
										style: { padding: "2px 7px", fontSize: 15, lineHeight: "18px" },
										children: "×"
									}),
									modelMenu ? react_jsx_runtime.jsx(MenuPanel, {
										left: 12,
										minWidth: 180,
										maxHeight: 240,
										children: selectorOptions.length === 0
											? react_jsx_runtime.jsx("div", { style: { padding: "6px 8px", color: C.tertiary, fontSize: 11 }, children: t("noModels") })
											: selectorOptions.map((opt) => react_jsx_runtime.jsx(MenuItem, {
												selected: activeModelId === opt.model,
												onClick: () => { onModelChange(opt.model); setModelMenu(false); },
												children: opt.name
											}, opt.model))
									}) : null
								]
							}),
							body,
							react_jsx_runtime.jsx(TokenRow, {
								t,
								refresh,
								updatedText: data?.at ? `${t("updated")} ${formatTime(data.at)}` : ""
							})
						]
					});
				}

		// ---- module-level persisted selections (survive card open/close, remounts and page refresh) ----
		const STORAGE_KEY = "dsh-deepseek-balance.persist";
		function loadPersisted() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw) {
					const parsed = JSON.parse(raw);
					return {
						period: typeof parsed.period === "string" && PERIODS.includes(parsed.period) ? parsed.period : "days30",
						keyRef: typeof parsed.keyRef === "string" ? parsed.keyRef : null,
						model: typeof parsed.model === "string" ? parsed.model : null
					};
				}
			} catch { }
			return { period: "days30", keyRef: null, model: null };
		}
		function savePersisted() {
			try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)); } catch { }
		}
		const persisted = loadPersisted();

		// ---- root component: strip (always visible) + card on click ----
		// re-render on harness theme changes so palette() picks the new mode
		function useThemeTick() {
			const [, setTick] = react.useState(0);
			react.useEffect(() => {
				let media = null;
				let observer = null;
				const bump = () => setTick((value) => value + 1);
				try {
					media = window.matchMedia("(prefers-color-scheme: light)");
					media.addEventListener("change", bump);
				} catch { }
				try {
					observer = new MutationObserver(bump);
					observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"], childList: false, subtree: false });
				} catch { }
				return () => {
					try { media?.removeEventListener("change", bump); } catch { }
					try { observer?.disconnect(); } catch { }
				};
			}, []);
		}

		function DeepSeekStatus({ wide, t }) {
			useThemeTick();
			const [period, setPeriodState] = react.useState(persisted.period);
			const [keyRef, setKeyRefState] = react.useState(persisted.keyRef);
			const [currentModel, setCurrentModelState] = react.useState(persisted.model);
			const setPeriod = (value) => { persisted.period = value; savePersisted(); setPeriodState(value); };
			const setKeyRef = (value) => { persisted.keyRef = value; savePersisted(); setKeyRefState(value); };
			const setCurrentModel = (value) => { persisted.model = value; savePersisted(); setCurrentModelState(value); };
			const { state, refresh } = useStatus(60000, keyRef);
			const [open, setOpen] = react.useState(false);
			const stripRef = react.useRef(null);
			const [cardPos, setCardPos] = react.useState({ left: 76, bottom: 52 });
			const measureCardPos = () => {
				const el = stripRef.current;
				if (!el) return;
				try {
					const rect = el.getBoundingClientRect();
					setCardPos({
						left: Math.max(8, Math.round(rect.right + 14)),
						bottom: Math.max(8, Math.round(window.innerHeight - rect.bottom + 4))
					});
				} catch { }
			};
			const openCard = () => {
				measureCardPos();
				setOpen(true);
			};
			// re-anchor when the sidebar folds/expands while the card is open
			react.useEffect(() => {
				if (!open) return;
				measureCardPos();
			}, [wide, open]);
			return react_jsx_runtime.jsxs(react.Fragment, {
				children: [
					react_jsx_runtime.jsx(StatusStrip, { t, state, period, stripRef, onClick: openCard }),
					open ? react_jsx_runtime.jsxs(react.Fragment, {
						children: [
							react_jsx_runtime.jsx("div", {
								"aria-hidden": "true",
								onClick: () => setOpen(false),
								style: { position: "fixed", inset: 0, background: "transparent", zIndex: 9998 }
							}),
							react_jsx_runtime.jsx(StatusCard, {
								wide, t, state, refresh,
								pos: cardPos,
								onClose: () => setOpen(false),
								period, onPeriodChange: setPeriod,
								keyRef, onSelectKey: setKeyRef,
								currentModel, onModelChange: setCurrentModel
							})
						]
					}) : null
				]
			});
		}

		// ---- locales ----
		const NS = "deepseekApi";
		const zh = {
			title: "DeepSeek 用量",
			balance: "余额",
			balanceShort: "余额",
			spentShort: "消费",
			requestsShort: "请求",
			tokensShort: "Tkn",
			today: "今天",
			yesterday: "昨天",
			days7: "近7天",
			days30: "近30天",
			month: "本月",
			lastMonth: "上月",
			period: "时间维度",
			keys: "API Key",
			noKeys: "暂无可用密钥",
			selectModel: "选择模型",
			noModels: "暂无可用模型",
			topUpBalance: "充值余额",
			cumulativeSpent: "累计消费",
			spent: "消费金额",
			apiRequests: "API 请求",
			tokens: "Tokens",
			updated: "更新",
			refresh: "刷新",
			close: "关闭",
			loading: "加载中…",
			error: "获取失败",
			retry: "重试",
			notConfigured: "未配置 DEEPSEEK_API_KEY",
			notConfiguredHint: "请配置后重试",
			available: "额度可用",
			unavailable: "额度不可用",
			peak: "高峰",
			idle: "空闲",
			peakWindow: "高峰 09:00–12:00 / 14:00–18:00(北京时间),其余为空闲",
			tokenAuto: "自动获取",
			tokenSave: "保存",
			manualInput: "手动输入",
			tokenPlaceholder: "DEEPSEEK_PLATFORM_TOKEN",
			tokenFetched: "已自动获取",
			tokenSaved: "已保存",
			tokenFailed: "获取失败",
			fetching: "获取中…"
		};
		const en = {
			title: "DeepSeek Usage",
			balance: "Balance",
			balanceShort: "Bal",
			spentShort: "Spent",
			requestsShort: "Req",
			tokensShort: "Tok",
			today: "Today",
			yesterday: "Yesterday",
			days7: "7d",
			days30: "30d",
			month: "Month",
			lastMonth: "Last month",
			period: "Period",
			keys: "API Key",
			noKeys: "No keys available",
			selectModel: "Select model",
			noModels: "No models available",
			topUpBalance: "Topped up",
			cumulativeSpent: "Total spent",
			spent: "Spent",
			apiRequests: "Requests",
			tokens: "Tokens",
			updated: "Updated",
			refresh: "Refresh",
			close: "Close",
			loading: "Loading…",
			error: "Failed",
			retry: "Retry",
			notConfigured: "DEEPSEEK_API_KEY not configured",
			notConfiguredHint: "Configure it and retry",
			available: "Available",
			unavailable: "Unavailable",
			peak: "Peak",
			idle: "Idle",
			peakWindow: "Peak 09:00–12:00 / 14:00–18:00 (UTC+8), otherwise idle",
			tokenAuto: "Auto",
			tokenSave: "Save",
			manualInput: "Manual",
			tokenPlaceholder: "DEEPSEEK_PLATFORM_TOKEN",
			tokenFetched: "Auto-fetched",
			tokenSaved: "Saved",
			tokenFailed: "Fetch failed",
			fetching: "Fetching…"
		};

		// ---- registration ----
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-deepseek-balance: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "deepseek-balance",
				order: -100,
				label: () => t("title"),
				locale: NS,
				inject: () => ({ t })
			}, DeepSeekStatus));
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
