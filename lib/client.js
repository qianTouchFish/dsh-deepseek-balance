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
		const fmtKey = (key) => key ?? "—";
		const formatTime = (iso) => {
			try { return new Date(iso).toLocaleTimeString(); } catch { return String(iso ?? ""); }
		};

		// ---- period keys ----
		const PERIODS = ["today", "yesterday", "days7", "days30", "month", "lastMonth"];

		// ---- sidebar strip (always visible, above Settings) ----
		function StatusStrip({ wide, t, state, period, onClick }) {
			const data = state.status === "ready" ? state.data : null;
			const balance = data?.balance ?? null;
			const usage = data?.usage ?? null;
			const low = balance !== null && balance.infos.some((info) => info.total < LOW_BALANCE_THRESHOLD);
			const total = balance !== null && balance.infos.length > 0 ? balance.infos[0].total : null;
			const periodData = usage ? usage[period] : null;
			const color = low ? C.warn : C.primary;
			const chipBase = {
				display: "flex",
				flexDirection: "column",
				gap: 1,
				border: `1px solid ${C.border}`,
				background: C.card,
				borderRadius: 10,
				padding: "4px 6px",
				cursor: "pointer",
				fontFamily: C.font,
				color: C.fg,
				width: "100%"
			};

			if (!wide) {
				// collapsed rail: compact 4-metric stack (labels + compact values)
				const line = { fontSize: 8, color: C.muted, lineHeight: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
				return react_jsx_runtime.jsx("button", {
					type: "button",
					"aria-label": t("title"),
					title: `${t("title")} · ${t("balance")} ${fmtMoney(total)} · ${t("spent")} ${fmtMoney(periodData?.cost ?? null)} · ${t("apiRequests")} ${fmtInt(periodData?.requests ?? null)} · ${t("tokens")} ${fmtTokensCompact(periodData?.tokens ?? null)}`,
					onClick,
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 1,
						width: "100%",
						border: `1px solid ${C.border}`,
						background: C.card,
						borderRadius: 8,
						padding: "3px 5px",
						cursor: "pointer",
						fontFamily: C.font,
						color: C.fg,
						textAlign: "left"
					},
					children: [
						react_jsx_runtime.jsx("span", { style: { fontSize: 9, fontWeight: 700, color, lineHeight: "11px", whiteSpace: "nowrap" }, children: `${t("balance")} ${fmtMoney(total)}` }),
						react_jsx_runtime.jsx("span", { style: line, children: `${t("spent")} ${fmtMoney(periodData?.cost ?? null)}` }),
						react_jsx_runtime.jsx("span", { style: line, children: `${t("apiRequests")} ${fmtInt(periodData?.requests ?? null)}` }),
						react_jsx_runtime.jsx("span", { style: line, children: `${t("tokens")} ${fmtTokensCompact(periodData?.tokens ?? null)}` })
					]
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
							react_jsx_runtime.jsx("span", { children: t(period) }),
							react_jsx_runtime.jsx("span", { style: { color: C.fg, fontWeight: 600 }, children: fmtMoney(periodData?.cost ?? null) })
						]
					})
				]
			});
		}

		// ---- platform token row: [手动输入][自动获取] ... [更新时间][刷新] ----
		function TokenRow({ t, refresh, updatedText }) {
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
			const btn = {
				border: "none",
				background: C.mutedBg,
				color: C.fg,
				borderRadius: 6,
				padding: "3px 8px",
				cursor: "pointer",
				fontFamily: C.font,
				fontSize: 9,
				flex: "none"
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
				style: { borderTop: `1px solid ${C.border}`, background: C.bg, padding: "6px 12px", display: "flex", flexDirection: "column", gap: 5 },
				children: [
					react_jsx_runtime.jsxs("div", {
						style: { display: "flex", alignItems: "center", gap: 5 },
						children: [
							react_jsx_runtime.jsx("button", {
								type: "button",
								onClick: () => setManualOpen(!manualOpen),
								disabled: busy,
								style: btn,
								children: t("manualInput")
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								onClick: () => run("auto"),
								disabled: busy,
								style: btn,
								children: busy ? t("fetching") : t("tokenAuto")
							}),
							react_jsx_runtime.jsx("span", { style: { flex: 1 } }),
							react_jsx_runtime.jsx("span", { style: { color: C.muted, fontSize: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: updatedText }),
							react_jsx_runtime.jsx("button", {
								type: "button",
								onClick: refresh,
								style: btn,
								children: t("refresh")
							})
						]
					}),
					manualOpen ? react_jsx_runtime.jsxs("div", {
						style: { display: "flex", alignItems: "center", gap: 5 },
						children: [
							react_jsx_runtime.jsx("input", {
								type: "text",
								value: draft,
								onChange: (event) => setDraft(event.currentTarget.value),
								placeholder: t("tokenPlaceholder"),
								style: { flex: 1, minWidth: 0, background: C.mutedBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 6px", color: C.fg, fontFamily: C.font, fontSize: 9, outline: "none" }
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								onClick: () => run("save", draft),
								disabled: busy || draft.trim().length === 0,
								style: { ...btn, background: C.primary, color: "#fff" },
								children: t("tokenSave")
							})
						]
					}) : null,
					msg ? react_jsx_runtime.jsx("span", { style: { color: C.muted, fontSize: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: msg, children: msg }) : null
				]
			});
		}

		// ---- the reference-style card ----
		function StatusCard({ wide, t, state, refresh, onClose, period, onPeriodChange, keyRef, onSelectKey, currentModel, onModelChange }) {
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
			const numberColor = low ? C.warn : C.primary;
			const cumulativeOfficial = usage?.cumulativeOfficial ?? null;
			const cumulativeText = cumulativeOfficial !== null
				? fmtMoney(cumulativeOfficial)
				: `≈${fmtMoney(usage?.cumulative ?? null)}`;

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
						// filter pills (period + API key)
						react_jsx_runtime.jsxs("div", {
							style: { position: "relative", display: "flex", gap: 6, borderBottom: `1px solid ${C.border}`, padding: "8px 12px" },
							children: [
								react_jsx_runtime.jsxs("button", {
									type: "button",
									onClick: () => { setMenuOpen(!menuOpen); setModelMenu(false); setKeyMenu(false); },
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
									onClick: () => { setKeyMenu(!keyMenu); setMenuOpen(false); setModelMenu(false); },
									style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.mutedBg, border: "none", borderRadius: 999, padding: "4px 8px", cursor: "pointer", fontFamily: C.font, color: C.fg, fontSize: 9, minWidth: 0 },
									children: [
										react_jsx_runtime.jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }, children: [
											react_jsx_runtime.jsx("span", { style: { color: C.muted }, children: t("keys") }),
											react_jsx_runtime.jsx("span", { style: { width: 1, height: 10, background: C.border } }),
											react_jsx_runtime.jsx("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: fmtKey(activeKeyMasked) })
										] }),
										react_jsx_runtime.jsx("span", { style: { color: C.muted, fontSize: 9 }, children: "▾" })
									]
								}),
								menuOpen ? react_jsx_runtime.jsx("div", {
									style: { position: "absolute", top: "calc(100% - 4px)", left: 12, zIndex: 10001, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.4)", padding: 4, display: "flex", flexDirection: "column", minWidth: 108 },
									children: PERIODS.map((p) => react_jsx_runtime.jsx("button", {
										type: "button",
										onClick: () => { onPeriodChange(p); setMenuOpen(false); },
										style: { background: "transparent", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: C.font, fontSize: 10, color: period === p ? C.primary : C.fg, textAlign: "left" },
										children: t(p)
									}, p))
								}) : null,
								keyMenu ? react_jsx_runtime.jsx("div", {
									style: { position: "absolute", top: "calc(100% - 4px)", right: 12, zIndex: 10001, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.4)", padding: 4, display: "flex", flexDirection: "column", minWidth: 170, maxHeight: 200, overflowY: "auto" },
									children: keyList.length === 0
										? react_jsx_runtime.jsx("div", { style: { padding: "6px 8px", color: C.muted, fontSize: 10 }, children: t("noKeys") })
										: keyList.map((k) => react_jsx_runtime.jsx("button", {
											type: "button",
											onClick: () => { onSelectKey(k.ref); setKeyMenu(false); },
											style: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: C.font, fontSize: 10, color: activeKeyRef === k.ref ? C.primary : C.fg, textAlign: "left", whiteSpace: "nowrap" },
											children: [
												react_jsx_runtime.jsx("span", { style: { color: C.muted }, children: k.ref }),
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
								react_jsx_runtime.jsxs("div", { style: { padding: "12px", borderRight: `1px solid ${C.border}` }, children: [
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 10, color: C.muted }, children: t("topUpBalance") }),
									react_jsx_runtime.jsx("p", { style: { margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: numberColor }, children: fmtMoney(info?.toppedUp ?? null) }),
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 9, color: C.muted }, children: info?.currency ?? "—" })
								] }),
								react_jsx_runtime.jsxs("div", { style: { padding: "12px" }, children: [
									react_jsx_runtime.jsx("p", { style: { margin: 0, fontSize: 10, color: C.muted }, children: t("cumulativeSpent") }),
									react_jsx_runtime.jsx("p", { style: { margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: numberColor }, children: cumulativeText }),
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

			return react_jsx_runtime.jsx("div", {
				role: "dialog",
				"aria-label": t("title"),
				style: {
					position: "fixed",
					left: wide ? 76 : 8,
					bottom: wide ? 52 : 100,
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
					menuOpen || modelMenu || keyMenu ? react_jsx_runtime.jsx("div", {
						onClick: () => { setMenuOpen(false); setModelMenu(false); setKeyMenu(false); },
						style: { position: "fixed", inset: 0, zIndex: 1000 }
					}) : null,
							react_jsx_runtime.jsxs("header", {
								style: { position: "relative", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${C.border}`, padding: "10px 16px" },
								children: [
									react_jsx_runtime.jsx("span", {
										"aria-hidden": "true",
										style: { width: 6, height: 6, borderRadius: "50%", background: balance?.isAvailable ? C.ok : C.bad, flex: "none" }
									}),
									react_jsx_runtime.jsxs("button", {
										type: "button",
										onClick: () => { setModelMenu(!modelMenu); setMenuOpen(false); setKeyMenu(false); },
										style: { display: "flex", alignItems: "center", gap: 4, background: C.mutedBg, border: "none", borderRadius: 999, padding: "2px 8px", cursor: "pointer", fontFamily: C.font, fontSize: 10, fontWeight: 600, color: C.fg, letterSpacing: "-0.01em", minWidth: 0, maxWidth: 120 },
										children: [
											react_jsx_runtime.jsx("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: activeModelId ? activeModelId : t("selectModel") }),
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
									}),
									modelMenu ? react_jsx_runtime.jsx("div", {
										style: { position: "absolute", top: "calc(100% + 2px)", left: 16, zIndex: 10001, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.4)", padding: 4, display: "flex", flexDirection: "column", minWidth: 170, maxHeight: 240, overflowY: "auto" },
										children: selectorOptions.length === 0
											? react_jsx_runtime.jsx("div", { style: { padding: "6px 8px", color: C.muted, fontSize: 10 }, children: t("noModels") })
											: selectorOptions.map((opt) => {
												const selected = activeModelId === opt.model;
												return react_jsx_runtime.jsx("button", {
													type: "button",
													onClick: () => { onModelChange(opt.model); setModelMenu(false); },
													style: { background: "transparent", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: C.font, fontSize: 10, color: selected ? C.primary : C.fg, textAlign: "left", whiteSpace: "nowrap" },
													children: opt.name
												}, opt.model);
											})
									}) : null
								]
							}),
							body,
							react_jsx_runtime.jsx(TokenRow, {
								t,
								refresh,
								updatedText: data ? `${t("updated")} ${formatTime(data.at)}` : ""
							})
						]
					});
				}

		// ---- module-level persisted selections (survive card open/close, remounts and page refresh) ----
		const STORAGE_KEY = "deepseek-api-status.persist";
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
		function DeepSeekStatus({ wide, t }) {
			const [period, setPeriodState] = react.useState(persisted.period);
			const [keyRef, setKeyRefState] = react.useState(persisted.keyRef);
			const [currentModel, setCurrentModelState] = react.useState(persisted.model);
			const setPeriod = (value) => { persisted.period = value; savePersisted(); setPeriodState(value); };
			const setKeyRef = (value) => { persisted.keyRef = value; savePersisted(); setKeyRefState(value); };
			const setCurrentModel = (value) => { persisted.model = value; savePersisted(); setCurrentModelState(value); };
			const { state, refresh } = useStatus(60000, keyRef);
			const [open, setOpen] = react.useState(false);
			return react_jsx_runtime.jsxs(react.Fragment, {
				children: [
					react_jsx_runtime.jsx(StatusStrip, { wide, t, state, period, onClick: () => setOpen(true) }),
					open ? react_jsx_runtime.jsxs(react.Fragment, {
						children: [
							react_jsx_runtime.jsx("div", {
								"aria-hidden": "true",
								onClick: () => setOpen(false),
								style: { position: "fixed", inset: 0, background: "rgba(11,12,15,0.45)", zIndex: 9998 }
							}),
							react_jsx_runtime.jsx(StatusCard, {
								wide, t, state, refresh,
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
