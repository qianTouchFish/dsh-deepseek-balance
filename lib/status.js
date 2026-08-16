// DeepSeek API status — status collection logic (no harness imports besides
// the credentials seam, so it is unit-testable standalone).
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { fetchPlatformUsage } from "./platform.js";

export const API_BASE = "https://api.deepseek.com";
export const KEY_REF = "DEEPSEEK_API_KEY";
export const PLATFORM_TOKEN_REF = "DEEPSEEK_PLATFORM_TOKEN";
const REQUEST_TIMEOUT_MS = 20000;
const STATE_FILENAME = "deepseek-api-status.json";

/**
 * Collect the DeepSeek API status payload: balance (real-time), cumulative and
 * today's consumption (balance-delta estimates persisted across restarts), and
 * official platform usage (tokens / requests / cost) when the platform session
 * token is configured.
 * @param ctx - harness context exposing `credentials.resolve(ref)` and an
 * optional `dshHomePath('storages')` helper.
 * @returns the JSON-safe status payload.
 */
export async function collectStatus(ctx, keyRef) {
	const started = Date.now();
	const ref = keyRef ?? KEY_REF;
	const credential = await ctx.credentials.resolve(ref);
	const apiKey = credential?.value;
	const keySource = credential?.source ?? null;
	if (!apiKey) {
		return {
			ok: true,
			at: new Date().toISOString(),
			apiBase: API_BASE,
			key: { configured: false, ref, masked: null, source: null, platform: null },
			balance: null,
			usage: null,
			models: [],
			keys: await collectKeys(ctx),
			latencyMs: Date.now() - started
		};
	}

	const response = await fetch(`${API_BASE}/user/balance`, {
		headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
	});
	if (!response.ok) {
		const detail = (await response.text()).slice(0, 300);
		throw new Error(`DeepSeek API HTTP ${response.status}: ${detail}`);
	}
	const data = await response.json();
	const balance = normalizeBalance(data);
	const total = balance.infos.length > 0 ? balance.infos[0].total : NaN;

	const platformCred = await ctx.credentials.resolve(PLATFORM_TOKEN_REF);
	const tracking = Number.isFinite(total) ? updateTracking(ctx, total) : null;

	let usage = null;
	if (platformCred?.value) {
		try {
			usage = await fetchPlatformUsage(platformCred.value);
		} catch (error) {
			usage = {
				source: "platform-error",
				error: error instanceof Error ? error.message : String(error),
				currency: null,
				today: null,
				yesterday: null,
				days7: null,
				days30: null,
				month: null,
				lastMonth: null,
				days: []
			};
		}
	}
	if (usage === null || usage.source === "platform-error") {
		usage = {
			source: "estimate",
			error: null,
			currency: balance.infos[0]?.currency ?? "CNY",
			today: tracking === null ? null : { cost: tracking.today, tokens: null, requests: null },
			yesterday: null,
			days7: null,
			days30: null,
			month: null,
			lastMonth: null,
			days: []
		};
	}
	if (tracking !== null) {
		usage = { ...usage, cumulative: tracking.cumulative, cumulativeSource: "estimate" };
	} else {
		usage = { ...usage, cumulative: null, cumulativeSource: null };
	}

	let models = [];
	try {
		models = await collectModels(ctx);
	} catch { }
	let keys = [];
	try {
		keys = await collectKeys(ctx);
	} catch { }

	return {
		ok: true,
		at: new Date().toISOString(),
		apiBase: API_BASE,
		key: {
			configured: true,
			ref,
			masked: maskKey(apiKey),
			source: keySource,
			platform: {
				configured: Boolean(platformCred?.value),
				source: platformCred?.source ?? null
			}
		},
		balance,
		usage,
		models,
		keys,
		latencyMs: Date.now() - started
	};
}

/** Mask a key for display: first 8 + ***** + last 4 (e.g. sk-4c55e*****7f83). */
export function maskKey(key) {
	if (typeof key !== "string" || key.length === 0) return "";
	if (key.length <= 12) return `${key.slice(0, 4)}*****${key.slice(-4)}`;
	return `${key.slice(0, 8)}*****${key.slice(-4)}`;
}

/** Candidate credential refs that may hold a DeepSeek API key. */
const API_KEY_CANDIDATES = [
	"DEEPSEEK_API_KEY",
	"DEEPSEEK_API_KEY_2",
	"DEEPSEEK_API_KEY_3",
	"DEEPSEEK_API_KEY_4",
	"DEEPSEEK_API_KEY_5",
	"DEEPSEEK_KEY"
];

/**
 * Enumerate the configured DeepSeek API keys (probed refs) with masked
 * values, for the card's key selector.
 * @param ctx - harness context exposing the credentials service.
 * @returns `[{ ref, masked }]` for every configured candidate.
 */
export async function collectKeys(ctx) {
	const keys = [];
	for (const ref of API_KEY_CANDIDATES) {
		try {
			const described = await ctx.credentials.describe(ref);
			if (described === void 0 || !described.configured) continue;
			const hit = await ctx.credentials.resolve(ref);
			keys.push({ ref, masked: hit?.value ? maskKey(hit.value) : null });
		} catch { }
	}
	return keys;
}

/**
 * Enumerate the harness's available models from the `llm` service:
 * provider groups with their model ids/names (deepseek -> v4-flash/v4-pro,
 * xiaomi -> mimo-*, ...). Failures per provider are skipped.
 * @param ctx - harness context exposing the `llm` service.
 * @returns `[{ provider, name, models: [{ id, name }] }]`.
 */
export async function collectModels(ctx) {
	const llm = typeof ctx.get === "function" ? ctx.get("llm") : void 0;
	if (llm === void 0 || typeof llm.listProviders !== "function" || typeof llm.listModels !== "function") return [];
	const groups = [];
	for (const provider of llm.listProviders()) {
		try {
			const models = await llm.listModels(provider.id);
			if (!Array.isArray(models) || models.length === 0) continue;
			groups.push({
				provider: provider.id,
				name: provider.name ?? provider.id,
				models: models.map((model) => ({ id: model.id, name: model.name ?? model.id }))
			});
		} catch { }
	}
	return groups;
}

/** Normalize the /user/balance response into a compact numeric shape. */
export function normalizeBalance(data) {
	const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
	return {
		isAvailable: Boolean(data?.is_available),
		infos: infos.map((info) => ({
			currency: String(info.currency ?? "?"),
			total: Number(info.total_balance ?? 0),
			granted: Number(info.granted_balance ?? 0),
			toppedUp: Number(info.topped_up_balance ?? 0)
		}))
	};
}

// ---- balance-delta tracking (cumulative / today estimates) ----------------

function localDayKey(d = new Date()) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function statePath(ctx) {
	let storages;
	const homeFn = typeof ctx.get === "function" ? ctx.get("dshHomePath") : void 0;
	if (typeof homeFn === "function") {
		storages = homeFn("storages");
	} else if (process.env.DSH_HOME) {
		storages = join(process.env.DSH_HOME, "storages");
	} else {
		storages = join(homedir(), ".dsh", "storages");
	}
	return join(storages, STATE_FILENAME);
}

function loadState(path) {
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8"));
		if (parsed !== null && typeof parsed === "object") return parsed;
	} catch { }
	return null;
}

function saveState(path, state) {
	try {
		mkdirSync(dirname(path), { recursive: true });
		const tmp = `${path}.tmp`;
		writeFileSync(tmp, JSON.stringify(state), "utf8");
		renameSync(tmp, path);
	} catch { }
}

/**
 * Advance the balance-delta meter with one observed balance and return
 * `{ cumulative, today }` consumption estimates (rounded to cents).
 * Balance increases are treated as top-ups (added to both baselines).
 */
export function updateTracking(ctx, balance) {
	const path = statePath(ctx);
	const dayKey = localDayKey();
	const stored = loadState(path);
	const state = stored !== null && typeof stored === "object"
		? { ...stored }
		: { baseline: balance, topups: 0, last: balance, dayKey, dayOpening: balance, dayTopups: 0, firstSeen: new Date().toISOString() };

	if (state.dayKey !== dayKey) {
		state.dayKey = dayKey;
		state.dayOpening = state.last;
		state.dayTopups = 0;
	}
	if (typeof state.baseline !== "number" || !Number.isFinite(state.baseline)) state.baseline = balance;
	if (typeof state.last === "number" && Number.isFinite(state.last) && balance > state.last) {
		const delta = balance - state.last;
		state.topups = (state.topups ?? 0) + delta;
		state.dayTopups = (state.dayTopups ?? 0) + delta;
	}
	state.last = balance;
	saveState(path, state);

	const cumulative = Math.max(0, state.baseline + (state.topups ?? 0) - balance);
	const today = Math.max(0, (state.dayOpening ?? balance) + (state.dayTopups ?? 0) - balance);
	return {
		cumulative: Math.round(cumulative * 100) / 100,
		today: Math.round(today * 100) / 100
	};
}
