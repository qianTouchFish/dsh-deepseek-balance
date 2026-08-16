window.__ModuleLoader__.load({
	id: "deepseek-api-status",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		// ---- reference card palette (dark) ----
		const C = {
			bg: "#0b0c0f",
			card: "#18191d",
			card2: "#1f2025",
			border: "rgba(255,255,255,0.08)",
			fg: "#f4f4f5",
			muted: "#9ca3af",
			mutedBg: "#27282e",
			primary: "#3b82f6",
			warn: "#f59e0b",
			ok: "#22c55e",
			bad: "#ef4444",
			font: '"Inter","PingFang SC","Microsoft YaHei",system-ui,-apple-system,BlinkMacSystemFont,sans-serif'
		};
		const LOW_BALANCE_THRESHOLD = 10;

		// ---- polling hook ----
		function useStatus(intervalMs) {
			const [state, setState] = react.useState({ status: "loading" });
			const [version, setVersion] = react.useState(0);
			react.useEffect(() => {
				let current = true;
				let timer = null;
				const load = () => {
					fetch("/api/deepseek-status", { cache: "no-store" })
						.then((response) => response.json())
						.then((data) => { if (current) setState({ status: "ready", data }); })
						.catch((error) => { if (current) setState({ status: "error", message: String(error) }); });
				};
				load();
				if (intervalMs > 0) timer = window.setInterval(load, intervalMs);
				return () => { current = false; if (timer !== null) window.clearInterval(timer); };
			}, [version, intervalMs]);
			return { state, refresh: () => setVersion((value) => value + 1) };
		}

		// ---- formatting ----
		const fmtMoney = (value) =>
			typeof value === "number" && Number.isFinite(value) ? `¥${value.toFixed(2)}` : "—";
		const fmtInt = (value) =>
			typeof value === "number" && Number.isFinite(value) ? Math.round(value).toLocaleString() : "—";
		const fmtKey = (key) => key ?? "—";
		const formatTime = (iso) => {
			try { return new Date(iso).toLocaleTimeString(); } catch { return String(iso ?? ""); }
		};

		// ---- period keys ----
		const PERIODS = ["today", "month", "days30"];

		// ---- sidebar strip (always visible, above Settings) ----
		function StatusStrip({ wide, t, state, onClick }) {
			const data = state.status === "ready" ? state.data : null;
			const balance = data?.balance ?? null;
			const usage = data?.usage ?? null;
			const low = balance !== null && balance.infos.some((info) => info.total < LOW_BALANCE_THRESHOLD);
			const total = balance !== null && balance.infos.length > 0 ? balance.infos[0].total : null;
			const spent30 = usage?.days30?.cost ?? null;
			const color = low ? C.warn : C.primary;

			if (!wide) {
				return react_jsx_runtime.jsx("button", {
					type: "button",
					"aria-label": t("title"),
					title: t("title"),
					onClick,
					style: { display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}`, background: C.card, borderRadius: 10, padding: "4px 8px", cursor: "pointer", color, fontFamily: C.font, fontWeight: 700, fontSize: 12 },
					children: fmtMoney(total)
				});
			}
			return react_jsx_runtime.jsx("button", {
				type: "button",
				"aria-label": t("title"),
				title: t("title"),
				onClick,
				style: {
					flex: "1 1 auto",
					minWidth: 0,
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 6,
					border: `1px solid ${C.border}`,
					background: C.card,
					borderRadius: 10,
					padding: "4px 8px",
					cursor: "pointer",
					fontFamily: C.font,
					color: C.fg,
					overflow: "hidden"
				},
				children: [
					react_jsx_runtime.jsxs("span", {
						style: { display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" },
						children: [
							react_jsx_runtime.jsx("span", { style: { color: C.muted, fontSize: 10 }, children: t("balance") }),
							react_jsx_runtime.jsx("span", { style: { color, fontWeight: 700, fontSize: 12 }, children: fmtMoney(total) })
						]
					}),
					react_jsx_runtime.jsxs("span", {
						style: { display: "inline-flex", alignItems: "baseline", gap: 3, whiteSpace: "nowrap", color: C.muted, fontSize: 9 },
						children: [
							react_jsx_runtime.jsx("span", { children: t("days30") }),
							react_jsx_runtime.jsx("span", { style: { color: C.fg, fontWeight: 600 }, children: fmtMoney(spent30) })
						]
					})
				]
			});
		}

		// ---- the reference-style card ----
		function StatusCard({ t, state, refresh, onClose }) {
			const [period, setPeriod] = react.useState("days30");
			const [menuOpen, setMenuOpen] = react.useState(false);
			const data = state.status === "ready" ? state.data : null;
			const balance = data?.balance ?? null;
			const usage = data?.usage ?? null;
			const low = balance !== null && balance.infos.some((info) => info.total < LOW_BALANCE_THRESHOLD);
			const info = balance !== null && balance.infos.length > 0 ? balance.infos[0] : null;
			const periodData = usage ? usage[period] : null;
			const spent = periodData?.cost ?? null;
			const requests = periodData?.requests ?? null;
			const tokens = periodData?.tokens ?? null;
			const chartDays = usage?.days ?? [];
			const maxCost = chartDays.reduce((m, d) => Math.max(m, d.cost ?? 0), 0);
			const numberColor = low ? C.warn : C.primary;

			let body;
			if (state.status === "loading") {
				body = react_jsx_runtime.jsx("p", { style: { margin: 0, padding: "12px 16px", fontSize: 11, color: C.muted }, children: t("loading") });
			} else if (state.status === "error" || (data && !data.ok)) {
				body = react_jsx_runtime.jsxs("div", {
					style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, color: C.bad },
					children: [
						react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 11 }, children: t("error") }),
						data?.error ? react_jsx_runtime.jsx("code", { style: { fontSize: 10, color: C.muted, wordBreak: "break-all" }, children: data.error }) : null
					]
				});
			} else if (!data.key.configured) {
				body = react_jsx_runtime.jsxs("div", {
					style: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, fontSize: 11 },
					children: [
						react_jsx_runtime.jsx("p", { style: { margin: 0, color: C.warn }, children: t("notConfigured") }),
						react_jsx_runtime.jsx("code", { style: { fontSize: 10, color: C.muted }, children: t("notConfiguredHint") })
					]
				});
			} else {
				body = react_jsx_runtime.jsxs("div", {
					children: [
						// filter pills
						react_jsx_runtime.jsxs("div", {
							style: { position: "relative", display: "flex", gap: 6, borderBottom: `1px solid ${C.border}`, padding: "8px 12px" },
							children: [
								react_jsx_runtime.jsxs("button", {
									type: "button",
									onClick: () => setMenuOpen(!menuOpen),
									style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.mutedBg, border: "none", borderRadius: 999, padding: "4px 8px", cursor: "pointer", fontFamily: C.font, color: C.fg, fontSize: 9, minWidth: 0 },
									children: [
										react_jsx_runtime.jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }, children: [
											react_jsx_runtime.jsx("span", { style: { color: C.muted }, children: t("period") }),
											react_jsx_runtime.jsx("span", { style: { width: 1, height: 10, background: C.border } }),
											react_jsx_runtime.jsx("span", { style: { whiteSpace: "nowrap" }, children: t(period) })
										] }),
										react_jsx_runtime.jsx("span", { style: { color: C.muted, fontSize: 9 }, children: "▾" })
									]
								}),
								react_jsx_runtime.jsxs("button", {
									type: "button",
									style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.mutedBg, border: "none", borderRadius: 999, padding: "4px 8px", cursor: "pointer", fontFamily: C.font, color: C.fg, fontSize: 9, minWidth: 0 },
									children: [
										react_jsx_runtime.jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }, children: [
											react_jsx_runtime.jsx("span", { style: { color: C.muted }, children: t("apiKey") }),
											react_jsx_runtime.jsx("span", { style: { width: 1, height: 10, background: C.border } }),
											react_jsx_runtime.jsx("span", { style: { whiteSpace: "nowrap" }, children: fmtKey(data.key.masked) })
										] }),
										react_jsx_runtime.jsx("span", { style: { color: C.muted, fontSize: 9 }, children: "▾" })
									]
								}),
								menuOpen ? react_jsx_runtime.jsx("div", {
									style: { position: "absolute", top: "calc(100% - 4px)", left: 12, zIndex: 10001, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.4)", padding: 4, display: "flex", flexDirection: "column", minWidth: 108 },
									children: PERIODS.map((p) => react_jsx_runtime.jsx("button", {
										type: "button",
										onClick: () => { setPeriod(p); setMenuOpen(false); },
										style: { background: "transparent", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: C.font, fontSize: 10, color: period === p ? C.primary : C.fg, textAlign: "left" },
										children: t(p)
									}, p))
								}) : null
							]
						}),
						// balance overview (2 cols)
						react_jsx_runtime.jsxs("div", {
							style: { display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${C.border}` },
							children: [
								react_jsx_runtime.jsxs("div", { style: { padding: "12px", borderRight: `1px solid ${C.border}` }, children: [
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 10, color: C.muted }, children: t("topUpBalance") }),
									react_jsx_runtime.jsx("p", { style: { margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: numberColor }, children: fmtMoney(info?.toppedUp ?? null) }),
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 9, color: C.muted }, children: info?.currency ?? "—" })
								] }),
								react_jsx_runtime.jsxs("div", { style: { padding: "12px" }, children: [
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 10, color: C.muted }, children: t("cumulativeSpent") }),
									react_jsx_runtime.jsx("p", { style: { margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: numberColor }, children: `≈${fmtMoney(usage?.cumulative ?? null)}` }),
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 9, color: C.muted }, children: info?.currency ?? "—" })
								] })
							]
						}),
						// usage metrics (3 cols)
						react_jsx_runtime.jsxs("div", {
							style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${C.border}` },
							children: [
								react_jsx_runtime.jsxs("div", { style: { padding: "8px", borderRight: `1px solid ${C.border}` }, children: [
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 9, color: C.muted }, children: t("spent") }),
									react_jsx_runtime.jsx("p", { style: { margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: C.primary }, children: fmtMoney(spent) })
								] }),
								react_jsx_runtime.jsxs("div", { style: { padding: "8px", borderRight: `1px solid ${C.border}` }, children: [
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 9, color: C.muted }, children: t("apiRequests") }),
									react_jsx_runtime.jsx("p", { style: { margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: C.primary }, children: fmtInt(requests) })
								] }),
								react_jsx_runtime.jsxs("div", { style: { padding: "8px" }, children: [
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 9, color: C.muted }, children: t("tokens") }),
									react_jsx_runtime.jsx("p", { style: { margin: "2px 0 0", fontSize: 9, fontWeight: 700, lineHeight: "14px", color: C.primary }, children: fmtInt(tokens) })
								] })
							]
						}),
						// mini chart (last 7 days cost)
						react_jsx_runtime.jsx("div", {
							style: { padding: "12px 16px" },
							children: react_jsx_runtime.jsx("div", {
								style: { display: "flex", alignItems: "flex-end", gap: 6, height: 48 },
								children: chartDays.length === 0
									? react_jsx_runtime.jsx("div", { style: { flex: 1, height: 4, borderRadius: 2, background: "rgba(59,130,246,0.25)" } })
									: chartDays.map((day) => {
										const value = day.cost ?? 0;
										const pct = maxCost > 0 ? Math.max(4, Math.round((value / maxCost) * 100)) : 4;
										const opacity = maxCost > 0 ? 0.25 + 0.75 * (value / maxCost) : 0.25;
										return react_jsx_runtime.jsx("div", {
											style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" },
											children: react_jsx_runtime.jsx("div", {
												title: `${day.date} · ${fmtMoney(day.cost)}`,
												style: { width: "100%", borderRadius: "2px 2px 0 0", height: `${pct}%`, background: `rgba(59,130,246,${opacity})` }
											})
										}, day.date);
									})
							})
						})
					]
				});
			}

			return react_jsx_runtime.jsxs(react.Fragment, {
				children: [
					menuOpen ? react_jsx_runtime.jsx("div", {
						onClick: () => setMenuOpen(false),
						style: { position: "fixed", inset: 0, zIndex: 9998 }
					}) : null,
					react_jsx_runtime.jsxs("div", {
						role: "dialog",
						"aria-label": t("title"),
						style: {
							position: "fixed",
							left: 76,
							bottom: 52,
							width: 260,
							maxWidth: "calc(100vw - 96px)",
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 14,
							boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
							color: C.fg,
							fontFamily: C.font,
							fontSize: 13,
							lineHeight: "20px",
							zIndex: 9999
						},
						children: [
							react_jsx_runtime.jsxs("header", {
								style: { display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, padding: "10px 16px" },
								children: [
									react_jsx_runtime.jsx("span", {
										"aria-hidden": "true",
										style: { width: 6, height: 6, borderRadius: "50%", background: balance?.isAvailable ? C.ok : C.bad, flex: "none" }
									}),
									react_jsx_runtime.jsxs("button", {
										type: "button",
										style: { display: "flex", alignItems: "center", gap: 4, background: C.mutedBg, border: "none", borderRadius: 999, padding: "2px 8px", cursor: "pointer", fontFamily: C.font, fontSize: 10, fontWeight: 600, color: C.fg, letterSpacing: "-0.01em", minWidth: 0, maxWidth: 150 },
										children: [
											react_jsx_runtime.jsx("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: fmtKey(data?.key?.masked ?? null) }),
											react_jsx_runtime.jsx("span", { style: { color: C.muted, fontSize: 9 }, children: "▾" })
										]
									}),
									react_jsx_runtime.jsx("span", { style: { flex: 1 } }),
									react_jsx_runtime.jsx("button", {
										type: "button",
										"aria-label": t("close"),
										onClick: onClose,
										style: { border: "none", background: "transparent", cursor: "pointer", color: C.muted, fontSize: 14, lineHeight: 1, padding: 2 },
										children: "×"
									})
								]
							}),
							body,
							react_jsx_runtime.jsxs("div", {
								style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderTop: `1px solid ${C.border}`, background: C.bg },
								children: [
									react_jsx_runtime.jsx("span", { style: { color: C.muted, fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: data ? `${t("updated")} ${formatTime(data.at)}` : "" }),
									react_jsx_runtime.jsx("button", {
										type: "button",
										onClick: refresh,
										style: { border: "none", background: C.mutedBg, color: C.fg, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: C.font, fontSize: 9 },
										children: t("refresh")
									})
								]
							})
						]
					})
				]
			});
		}

		// ---- root component: strip (always visible) + card on click ----
		function DeepSeekStatus({ wide, t }) {
			const { state, refresh } = useStatus(60000);
			const [open, setOpen] = react.useState(false);
			return react_jsx_runtime.jsxs(react.Fragment, {
				children: [
					react_jsx_runtime.jsx(StatusStrip, { wide, t, state, onClick: () => setOpen(true) }),
					open ? react_jsx_runtime.jsxs(react.Fragment, {
						children: [
							react_jsx_runtime.jsx("div", {
								"aria-hidden": "true",
								onClick: () => setOpen(false),
								style: { position: "fixed", inset: 0, background: "rgba(11,12,15,0.45)", zIndex: 9998 }
							}),
							react_jsx_runtime.jsx(StatusCard, { t, state, refresh, onClose: () => setOpen(false) })
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
			days30: "近30天",
			today: "今日",
			month: "本月",
			period: "时间维度",
			apiKey: "API Key",
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
			unavailable: "额度不可用"
		};
		const en = {
			title: "DeepSeek Usage",
			balance: "Balance",
			days30: "30d",
			today: "Today",
			month: "Month",
			period: "Period",
			apiKey: "API Key",
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
			unavailable: "Unavailable"
		};

		// ---- registration ----
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "deepseek-api-status: dictionaries");
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
