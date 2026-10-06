// Render smoke test for the client bundle: loads the real bundle, stubs React
// state so every branch (sidebar strip, card, menus, metrics, chart, token row)
// renders through react-dom/server, and fails on any exception or missing
// element. Requires react + react-dom (devDependencies): `npm run test:render`.
const fs = require("fs");
const path = require("path");
const React = require("react");
const jsxRuntime = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");

const BUNDLE = path.join(__dirname, "..", "lib", "client.js");

global.window = {
	__ModuleLoader__: { load(spec) { global.__spec = spec; } },
	setInterval: () => 0,
	clearInterval: () => {},
	setTimeout: () => 0,
	clearTimeout: () => {},
};

const days = [];
for (let i = 6; i >= 0; i--) {
	days.push({ date: `2026-10-0${i + 1}`, cost: 0.1 * (7 - i), tokens: 1000 * (7 - i), requests: 4 * (7 - i) });
}
const slice = { cost: 1.23, tokens: 12300, requests: 50 };
const PAYLOAD = {
	ok: true,
	at: new Date().toISOString(),
	apiBase: "https://api.deepseek.com",
	key: { configured: true, ref: "DEEPSEEK_API_KEY", masked: "sk-abcde*****1234", source: "file", platform: { configured: true, source: "file" } },
	balance: { isAvailable: true, infos: [{ currency: "CNY", total: 0.64, granted: 0, toppedUp: 0.64 }] },
	usage: {
		source: "platform",
		currency: "CNY",
		error: null,
		today: { cost: 0.12, tokens: 1200, requests: 8 },
		yesterday: { cost: 0.3, tokens: 3000, requests: 12 },
		days7: slice,
		days30: slice,
		month: slice,
		lastMonth: slice,
		days,
		cumulativeOfficial: 26.94,
		cumulative: 5.25,
		models: [{
			model: "deepseek-v4-pro",
			today: { cost: 0.1, tokens: 1000, requests: 3 },
			yesterday: null,
			days7: slice,
			days30: slice,
			month: slice,
			lastMonth: null,
			days,
		}],
	},
	models: [],
	keys: [{ ref: "DEEPSEEK_API_KEY", masked: "sk-abcde*****1234" }],
	latencyMs: 210,
};

const realUseState = React.useState;
const ReactStub = Object.assign({}, React, {
	// render the ready payload instead of the initial loading state,
	// and treat every false flag (card open, menus, hover) as true
	useState(init) {
		if (init !== null && typeof init === "object" && init.status === "loading") return [{ status: "ready", data: PAYLOAD }, () => {}];
		if (init === false) return [true, () => {}];
		return realUseState(init);
	},
	useEffect() {},
	useRef(value) { return { current: value }; },
});

const requireStub = (id) => {
	if (id === "react/jsx-runtime") return jsxRuntime;
	if (id === "react") return ReactStub;
	throw new Error("unexpected require: " + id);
};

new Function("require", fs.readFileSync(BUNDLE, "utf8"))(requireStub);
if (!global.__spec) throw new Error("bundle did not register through __ModuleLoader__");
const out = global.__spec.factory(requireStub);

const registrations = [];
out.apply({
	effect: (fn) => fn(),
	locale: { register: () => {}, bind: () => (key) => key },
	slots: {
		inject: (name, factory) => registrations.push(factory()),
		register: (options, component) => ({ options, component }),
	},
});
if (registrations.length !== 1) throw new Error("expected one slot registration, got " + registrations.length);
const Component = registrations[0].component;

const t = (key) => key;
const html = renderToStaticMarkup(React.createElement(Component, { wide: true, t }));
console.log("rendered html length:", html.length);
const checks = [
	["strip metrics", html.includes("balanceShort") && html.includes("tokensShort")],
	["peak badge", html.includes("peak") || html.includes("idle")],
	["model chip", html.includes("deepseek-v4-pro")],
	["period menu", html.includes("days30") && html.includes("lastMonth")],
	["key menu", html.includes("DEEPSEEK_API_KEY")],
	["metrics", html.includes("topUpBalance") && html.includes("cumulativeSpent") && html.includes("apiRequests")],
	["chart bars", (html.match(/border-radius:3px 3px 0 0/g) || []).length >= 5],
	["token row", (html.includes("tokenAuto") || html.includes("fetching")) && html.includes("refresh") && html.includes("manualInput")],
	["theme tokens", html.includes("--dsw-alias-button-floating-fill") && html.includes("--dsw-alias-label-tertiary") && html.includes("--dsw-alias-link")],
	["color-mix tint", html.includes("color-mix(in srgb, var(--dsw-alias-link)")],
];
let failed = 0;
for (const [name, ok] of checks) {
	if (!ok) failed++;
	console.log((ok ? "  OK   " : "  FAIL ") + name);
}
if (failed > 0) throw new Error(failed + " render checks failed");
console.log("render smoke OK");
