window.__ModuleLoader__.load({
	id: "deepseek-api-status",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		// ---- polling hook (auto-refresh every intervalMs, manual refresh) ----
		function useStatus(intervalMs) {
			const [state, setState] = react.useState({ status: "loading" });
			const [version, setVersion] = react.useState(0);
			react.useEffect(() => {
				let current = true;
				let timer = null;
				const load = () => {
					fetch("/api/deepseek-status", { cache: "no-store" })
						.then((response) => response.json())
						.then((data) => {
							if (current) setState({ status: "ready", data });
						})
						.catch((error) => {
							if (current) setState({ status: "error", message: String(error) });
						});
				};
				load();
				if (intervalMs > 0) timer = window.setInterval(load, intervalMs);
				return () => {
					current = false;
					if (timer !== null) window.clearInterval(timer);
				};
			}, [version, intervalMs]);
			return { state, refresh: () => setVersion((value) => value + 1) };
		}

		// ---- formatting ----
		const fmtMoney = (value) =>
			typeof value === "number" && Number.isFinite(value)
				? value >= 0.005 ? `¥${value.toFixed(2)}` : `¥${value.toFixed(3)}`
				: "—";
		const fmtTokens = (value) => {
			if (typeof value !== "number" || !Number.isFinite(value)) return "—";
			if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
			if (value >= 1e4) return `${(value / 1e3).toFixed(1)}k`;
			return String(value);
		};
		const fmtCount = (value) =>
			typeof value === "number" && Number.isFinite(value) ? String(value) : "—";
		const formatTime = (iso) => {
			try { return new Date(iso).toLocaleString(); } catch { return String(iso ?? ""); }
		};

		const LOW_BALANCE_THRESHOLD = 10;

		// ---- shared row component ----
		function StatusRow({ label, value, color }) {
			return react_jsx_runtime.jsxs("div", {
				style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
				children: [
					react_jsx_runtime.jsx("span", { style: { color: "var(--dsw-alias-label-tertiary)" }, children: label }),
					react_jsx_runtime.jsx("span", {
						style: { color: color ?? "var(--dsw-alias-label-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" },
						children: value
					})
				]
			});
		}

		// ---- the one component: inline strip (always visible) + detail card ----
		function DeepSeekStatus({ wide, t }) {
			const { state, refresh } = useStatus(60000);
			const [open, setOpen] = react.useState(false);

			const data = state.status === "ready" ? state.data : null;
			const balance = data?.balance ?? null;
			const usage = data?.usage ?? null;
			const low = balance !== null && balance.infos.some((info) => info.total < LOW_BALANCE_THRESHOLD);
			const balanceLine = balance !== null && balance.infos.length > 0
				? `${fmtMoney(balance.infos[0].total)} ${balance.infos[0].currency}`
				: "—";
			const todayCost = usage?.today?.cost ?? null;
			const cumulative = usage?.cumulative ?? null;
			const tokens = usage?.today?.tokens ?? null;
			const requests = usage?.today?.requests ?? null;
			const isEstimate = usage?.source === "estimate";

			const stripStyle = {
				flex: "1 1 auto",
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				gap: 2,
				border: "none",
				background: "transparent",
				cursor: "pointer",
				color: "var(--dsw-alias-label-primary)",
				padding: "4px 6px",
				borderRadius: 8,
				textAlign: "left",
				fontFamily: "inherit",
				overflow: "hidden"
			};

			const strip = react_jsx_runtime.jsxs("button", {
				type: "button",
				"aria-label": t("title"),
				title: t("title"),
				onClick: () => setOpen(!open),
				style: wide ? stripStyle : {
					display: "inline-flex",
					alignItems: "center",
					border: "none",
					background: "transparent",
					cursor: "pointer",
					color: low ? "var(--dsw-alias-state-warning-primary, #c98a00)" : "var(--dsw-alias-label-secondary)",
					padding: "4px 6px",
					borderRadius: 6,
					fontFamily: "inherit"
				},
				children: wide ? [
					react_jsx_runtime.jsxs("span", {
						style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", fontSize: 12, lineHeight: "18px" },
						children: [
							react_jsx_runtime.jsxs("span", {
								style: { fontWeight: 700, color: low ? "var(--dsw-alias-state-warning-primary, #c98a00)" : "var(--dsw-alias-label-primary)", whiteSpace: "nowrap" },
								children: [`${t("balance")} ${balanceLine}`]
							}),
							react_jsx_runtime.jsx("span", {
								style: { color: "var(--dsw-alias-label-secondary)", whiteSpace: "nowrap" },
								children: `${t("today")} ${isEstimate ? "≈" : ""}${fmtMoney(todayCost)}`
							})
						]
					}),
					react_jsx_runtime.jsxs("span", {
						style: { display: "flex", gap: 8, alignItems: "baseline", fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary)", whiteSpace: "nowrap", overflow: "hidden" },
						children: [
							react_jsx_runtime.jsx("span", { children: `${t("cumulative")} ${fmtMoney(cumulative)}` }),
							react_jsx_runtime.jsx("span", { children: `${fmtTokens(tokens)} tok` }),
							react_jsx_runtime.jsx("span", { children: `${fmtCount(requests)} ${t("requests")}` })
						]
					})
				] : [
					react_jsx_runtime.jsx("span", { "aria-hidden": "true", style: { fontWeight: 700, fontSize: 14, lineHeight: "16px" }, children: "¥" })
				]
			});

			if (!open) return strip;

			let body;
			if (state.status === "loading") {
				body = react_jsx_runtime.jsx("p", { style: { margin: 0, color: "var(--dsw-alias-label-tertiary)" }, children: t("loading") });
			} else if (state.status === "error") {
				body = react_jsx_runtime.jsxs("div", {
					style: { display: "flex", alignItems: "center", gap: 10, color: "var(--dsw-alias-state-error-primary)" },
					children: [
						react_jsx_runtime.jsx("p", { style: { margin: 0, flex: 1 }, children: t("error") }),
						react_jsx_runtime.jsx("button", {
							type: "button",
							onClick: refresh,
							style: { border: "1px solid var(--dsw-alias-border-l2)", color: "var(--dsw-alias-label-primary)", background: "transparent", borderRadius: 6, padding: "4px 10px", cursor: "pointer", font: "inherit" },
							children: t("retry")
						})
					]
				});
			} else if (!data.ok) {
				body = react_jsx_runtime.jsxs("div", {
					style: { display: "flex", flexDirection: "column", gap: 8, color: "var(--dsw-alias-state-error-primary)" },
					children: [
						react_jsx_runtime.jsx("p", { style: { margin: 0 }, children: t("error") }),
						react_jsx_runtime.jsx("code", { style: { fontSize: 12, wordBreak: "break-all" }, children: data.error ?? "" })
					]
				});
			} else if (!data.key.configured) {
				body = react_jsx_runtime.jsxs("div", {
					style: { display: "flex", flexDirection: "column", gap: 6 },
					children: [
						react_jsx_runtime.jsx("p", { style: { margin: 0, color: "var(--dsw-alias-state-warning-primary, #c98a00)" }, children: t("notConfigured") }),
						react_jsx_runtime.jsx("code", { style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)" }, children: t("notConfiguredHint") })
					]
				});
			} else {
				const items = [];
				items.push(react_jsx_runtime.jsxs("div", {
					style: { display: "flex", alignItems: "center", gap: 8 },
					children: [
						react_jsx_runtime.jsx("span", {
							"aria-hidden": "true",
							style: { width: 8, height: 8, borderRadius: "50%", background: balance?.isAvailable ? "#2e9e5b" : "var(--dsw-alias-state-error-primary)", flex: "none" }
						}),
						react_jsx_runtime.jsx("span", { style: { fontWeight: 600 }, children: balance?.isAvailable ? t("available") : t("unavailable") })
					]
				}));
				for (const info of balance?.infos ?? []) {
					items.push(react_jsx_runtime.jsxs("div", {
						style: { border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 },
						children: [
							react_jsx_runtime.jsx("div", {
								style: { display: "flex", alignItems: "baseline", justifyContent: "space-between" },
								children: [
									react_jsx_runtime.jsx("span", {
										style: { fontWeight: 700, fontSize: 20, color: info.total < LOW_BALANCE_THRESHOLD ? "var(--dsw-alias-state-warning-primary, #c98a00)" : "var(--dsw-alias-label-primary)" },
										children: `${fmtMoney(info.total)} ${info.currency}`
									}),
									react_jsx_runtime.jsx("span", { style: { color: "var(--dsw-alias-label-tertiary)", fontSize: 12 }, children: t("total") })
								]
							}),
							react_jsx_runtime.jsx(StatusRow, { label: t("granted"), value: `${fmtMoney(info.granted)} ${info.currency}` }),
							react_jsx_runtime.jsx(StatusRow, { label: t("toppedUp"), value: `${fmtMoney(info.toppedUp)} ${info.currency}` })
						]
					}, info.currency));
				}
				const badge = isEstimate ? ` (${t("estimate")})` : "";
				items.push(react_jsx_runtime.jsx(StatusRow, { label: `${t("todayConsumed")}${badge}`, value: `${isEstimate ? "≈" : ""}${fmtMoney(todayCost)}` }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: `${t("monthConsumed")}${badge}`, value: `${fmtMoney(usage?.month?.cost ?? null)}` }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: `${t("cumulativeConsumed")} (${t("estimate")})`, value: `≈${fmtMoney(cumulative)}` }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: t("todayTokens"), value: fmtTokens(tokens) }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: t("monthTokens"), value: fmtTokens(usage?.month?.tokens ?? null) }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: t("todayRequests"), value: fmtCount(requests) }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: t("monthRequests"), value: fmtCount(usage?.month?.requests ?? null) }));
				if (usage?.source !== "platform") {
					items.push(react_jsx_runtime.jsxs("div", {
						style: { border: "1px dashed var(--dsw-alias-border-l2)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--dsw-alias-label-tertiary)", display: "flex", flexDirection: "column", gap: 4 },
						children: [
							react_jsx_runtime.jsx("span", { children: t("platformHint") }),
							react_jsx_runtime.jsx("code", { style: { wordBreak: "break-all" }, children: t("platformHintDetail") })
						]
					}));
				}
				if (usage?.source === "platform-error") {
					items.push(react_jsx_runtime.jsx("div", {
						style: { color: "var(--dsw-alias-state-error-primary)", fontSize: 12 },
						children: usage?.error ?? ""
					}));
				}
				items.push(react_jsx_runtime.jsx(StatusRow, { label: t("keyMasked"), value: data.key.masked ?? "-" }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: t("keySource"), value: data.key.source === "file" ? t("sourceFile") : data.key.source === "env" ? t("sourceEnv") : "-" }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: t("latency"), value: `${data.latencyMs} ms` }));
				items.push(react_jsx_runtime.jsx(StatusRow, { label: t("updated"), value: formatTime(data.at) }));
				items.push(react_jsx_runtime.jsxs("div", {
					style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
					children: [
						react_jsx_runtime.jsx("span", { style: { color: "var(--dsw-alias-label-tertiary)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: data.apiBase ?? "" }),
						react_jsx_runtime.jsx("button", {
							type: "button",
							onClick: refresh,
							style: { border: "1px solid var(--dsw-alias-border-l2)", color: "var(--dsw-alias-label-primary)", background: "transparent", borderRadius: 6, padding: "4px 10px", cursor: "pointer", font: "inherit", flex: "none" },
							children: t("refresh")
						})
					]
				}));
				body = react_jsx_runtime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: items });
			}

			const card = react_jsx_runtime.jsxs("div", {
				role: "dialog",
				"aria-label": t("title"),
				style: {
					position: "fixed",
					left: 76,
					bottom: 52,
					width: 360,
					maxWidth: "calc(100vw - 96px)",
					background: "var(--dsw-alias-bg-layer-3)",
					border: "1px solid var(--dsw-alias-border-l1)",
					borderRadius: 12,
					boxShadow: "var(--dsw-shadow-lv1)",
					color: "var(--dsw-alias-label-primary)",
					fontSize: 13,
					lineHeight: "20px",
					fontFamily: "inherit",
					zIndex: 9999,
					overflow: "hidden"
				},
				children: [
					react_jsx_runtime.jsxs("div", {
						style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderBottom: "1px solid var(--dsw-alias-border-l2)" },
						children: [
							react_jsx_runtime.jsx("strong", { style: { fontWeight: 700 }, children: t("title") }),
							react_jsx_runtime.jsx("button", {
								type: "button",
								"aria-label": t("close"),
								onClick: () => setOpen(false),
								style: { border: "none", background: "transparent", cursor: "pointer", color: "var(--dsw-alias-label-secondary)", fontSize: 16, lineHeight: 1, padding: 2 },
								children: "×"
							})
						]
					}),
					react_jsx_runtime.jsx("div", { style: { padding: "12px", maxHeight: "70vh", overflowY: "auto" }, children: body })
				]
			});

			return react_jsx_runtime.jsxs(react.Fragment, {
				children: [
					strip,
					react_jsx_runtime.jsx("div", {
						"aria-hidden": "true",
						onClick: () => setOpen(false),
						style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 9998 }
					}),
					card
				]
			});
		}

		// ---- locales ----
		const NS = "deepseekApi";
		const zh = {
			title: "DeepSeek API 状态",
			balance: "余额",
			today: "今日",
			cumulative: "累计",
			requests: "次",
			refresh: "刷新",
			close: "关闭",
			loading: "加载中…",
			error: "获取余额失败",
			retry: "重试",
			notConfigured: "未配置 DEEPSEEK_API_KEY",
			notConfiguredHint: "请在 $DSH_HOME/.credentials.yaml 中配置后重试",
			available: "额度可用",
			unavailable: "额度不可用",
			total: "总额",
			granted: "赠送额度",
			toppedUp: "充值余额",
			todayConsumed: "今日消费",
			monthConsumed: "本月消费",
			cumulativeConsumed: "累计消费",
			todayTokens: "今日 Tokens",
			monthTokens: "本月 Tokens",
			todayRequests: "今日请求次数",
			monthRequests: "本月请求次数",
			estimate: "估算",
			platformHint: "配置 DEEPSEEK_PLATFORM_TOKEN 可查看官方 Tokens 与请求次数",
			platformHintDetail: "获取：登录 platform.deepseek.com → DevTools → Console → JSON.parse(localStorage.getItem('userToken')).value → 写入 .credentials.yaml",
			updated: "更新于",
			latency: "请求耗时",
			keyMasked: "密钥",
			keySource: "密钥来源",
			sourceFile: "凭据文件",
			sourceEnv: "环境变量"
		};
		const en = {
			title: "DeepSeek API Status",
			balance: "Balance",
			today: "Today",
			cumulative: "Total",
			requests: "req",
			refresh: "Refresh",
			close: "Close",
			loading: "Loading…",
			error: "Failed to fetch status",
			retry: "Retry",
			notConfigured: "DEEPSEEK_API_KEY not configured",
			notConfiguredHint: "Add it to $DSH_HOME/.credentials.yaml and retry",
			available: "Available",
			unavailable: "Unavailable",
			total: "Total",
			granted: "Granted",
			toppedUp: "Topped up",
			todayConsumed: "Today spent",
			monthConsumed: "This month",
			cumulativeConsumed: "Cumulative spent",
			todayTokens: "Tokens today",
			monthTokens: "Tokens this month",
			todayRequests: "Requests today",
			monthRequests: "Requests this month",
			estimate: "estimate",
			platformHint: "Configure DEEPSEEK_PLATFORM_TOKEN for official tokens & request counts",
			platformHintDetail: "Get it: sign in to platform.deepseek.com → DevTools → Console → JSON.parse(localStorage.getItem('userToken')).value → add to .credentials.yaml",
			updated: "Updated",
			latency: "Latency",
			keyMasked: "Key",
			keySource: "Key source",
			sourceFile: "Credentials file",
			sourceEnv: "Environment"
		};

		// ---- registration ----
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "deepseek-api-status: dictionaries");
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
