// DeepSeek platform dashboard usage — unofficial private endpoints.
// Same data the platform console shows; requires the platform session token
// (DEEPSEEK_PLATFORM_TOKEN — localStorage `userToken` of platform.deepseek.com).
//
// Response envelopes:
//   { code: 0, data: { biz_code: 0, biz_data: [ { currency?, total: [ { model,
//     usage: [ { type, amount } ] } ], days: [ { date: "YYYY-MM-DD", data: [
//     { model, usage: [ { type, amount } ] } ] } ] } ] } }
// Usage item types: PROMPT_CACHE_HIT_TOKEN | PROMPT_CACHE_MISS_TOKEN |
// RESPONSE_TOKEN | REQUEST (amount = request count).
// get_user_summary: { code: 0, data: { biz_code: 0, biz_data: {
//   normal_wallets, bonus_wallets, total_costs: [ { currency, amount } ] } } }
export const PLATFORM_USAGE_URL = "https://platform.deepseek.com/api/v0/usage";
const PLATFORM_SUMMARY_URL = "https://platform.deepseek.com/api/v0/users/get_user_summary";
const TIMEOUT_MS = 15000;

const TOKEN_TYPES = new Set(["PROMPT_CACHE_HIT_TOKEN", "PROMPT_CACHE_MISS_TOKEN", "RESPONSE_TOKEN"]);
const REQUEST_TYPE = "REQUEST";

/** Local calendar day as YYYY-MM-DD (dashboard rows are keyed by date). */
export function localDate(d = new Date()) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function toFinite(value) {
	if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		return Number.isFinite(n) ? n : NaN;
	}
	return NaN;
}

function round2(value) {
	return Math.round(value * 100) / 100;
}

function platformHeaders(token) {
	return {
		authorization: `Bearer ${token}`,
		accept: "application/json",
		"x-app-version": "1.0.0",
		origin: "https://platform.deepseek.com",
		referer: "https://platform.deepseek.com/usage"
	};
}

/** Validate the envelope and return biz_data[0]; throws on auth/API errors. */
function bizData(payload, label) {
	if (payload === null || typeof payload !== "object") throw new Error(`DeepSeek 平台${label}接口返回了无效数据`);
	const code = payload.code ?? payload.data?.biz_code;
	if (code === 40002 || code === 40003) {
		throw new Error("DEEPSEEK_PLATFORM_TOKEN 已过期：请重新登录 platform.deepseek.com 并更新 userToken");
	}
	if (payload.code !== 0 || payload.data?.biz_code !== 0) {
		throw new Error(`DeepSeek 平台${label}接口错误 (code ${String(code ?? "unknown")})`);
	}
	const raw = payload.data?.biz_data;
	const biz = Array.isArray(raw) ? raw[0] : raw;
	if (biz === void 0 || biz === null) return null;
	return biz;
}

/** Sum usage items of one model entry: tokens, requests. */
function aggregateUsage(usageItems) {
	let tokens = 0;
	let requests = 0;
	for (const item of usageItems ?? []) {
		if (item === null || typeof item !== "object") continue;
		const value = toFinite(item.amount);
		if (!Number.isFinite(value)) continue;
		const type = typeof item.type === "string" ? item.type.toUpperCase() : "";
		if (type === REQUEST_TYPE) requests += Math.round(value);
		else if (TOKEN_TYPES.has(type)) tokens += Math.round(value);
	}
	return { tokens, requests };
}

/** Sum cost items of one model entry (the cost endpoint's `amount` field IS the cost). */
function aggregateCost(usageItems) {
	let cost = 0;
	for (const item of usageItems ?? []) {
		if (item === null || typeof item !== "object") continue;
		const value = toFinite(item.amount);
		if (Number.isFinite(value)) cost += value;
	}
	return cost;
}

async function fetchMonth(token, year, month) {
	const fetchJson = async (url) => {
		const response = await fetch(url, { headers: platformHeaders(token), signal: AbortSignal.timeout(TIMEOUT_MS) });
		if (!response.ok) throw new Error(`DeepSeek 平台用量接口返回 HTTP ${response.status}`);
		return response.json();
	};
	const [amount, cost] = await Promise.all([
		fetchJson(`${PLATFORM_USAGE_URL}/amount?month=${month}&year=${year}`),
		fetchJson(`${PLATFORM_USAGE_URL}/cost?month=${month}&year=${year}`)
	]);
	const amountBiz = bizData(amount, "用量");
	const costBiz = bizData(cost, "费用");
	if (amountBiz === null || costBiz === null) throw new Error("DeepSeek 平台用量接口未返回数据");
	const days = [];
	for (const day of amountBiz.days ?? []) {
		if (day === null || typeof day !== "object" || typeof day.date !== "string") continue;
		const costDay = (costBiz.days ?? []).find((d) => d?.date === day.date);
		const modelMap = new Map();
		for (const modelEntry of day.data ?? []) {
			if (modelEntry === null || typeof modelEntry !== "object") continue;
			const model = typeof modelEntry.model === "string" && modelEntry.model.length > 0 ? modelEntry.model : "unknown";
			const agg = aggregateUsage(modelEntry.usage);
			const costEntry = (costDay?.data ?? []).find((c) => c?.model === model);
			const cost = round2(aggregateCost(costEntry?.usage));
			const row = modelMap.get(model) ?? { model, cost: 0, tokens: 0, requests: 0 };
			row.cost += cost;
			row.tokens += agg.tokens;
			row.requests += agg.requests;
			modelMap.set(model, row);
		}
		days.push({ date: day.date, models: [...modelMap.values()] });
	}
	return { days, currency: typeof costBiz.currency === "string" ? costBiz.currency : "CNY" };
}

function sumDayModels(models) {
	let cost = 0;
	let tokens = 0;
	let requests = 0;
	for (const m of models ?? []) {
		cost += Number.isFinite(m.cost) ? m.cost : 0;
		tokens += m.tokens ?? 0;
		requests += m.requests ?? 0;
	}
	return { cost: round2(cost), tokens, requests };
}

function sumRows(rows) {
	let cost = 0;
	let tokens = 0;
	let requests = 0;
	for (const r of rows) {
		cost += Number.isFinite(r.cost) ? r.cost : 0;
		tokens += r.tokens ?? 0;
		requests += r.requests ?? 0;
	}
	return { cost: round2(cost), tokens, requests };
}

function pickRow(rows, date) {
	const found = rows.find((r) => r.date === date);
	return found ? { cost: found.cost, tokens: found.tokens, requests: found.requests } : null;
}

function monthKeyOf(year, month) {
	return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Aggregate per-day per-model rows into the period slices the card needs,
 * both at account level and per model.
 * @param days - all available { date, models: [{ model, cost, tokens, requests }] } rows.
 * @param now - reference "now" (injectable for tests).
 * @returns `{ today, yesterday, days7, days30, month, lastMonth, days, models }`
 * where days is the account-level last-7 chart rows and models carries the
 * same period slices per model (plus its own last-7 chart rows).
 */
export function aggregateUsageDays(days, now = new Date()) {
	const todayStr = localDate(now);
	const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
	const yesterdayStr = localDate(yesterday);
	const day7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
	const day7Str = localDate(day7);
	const day30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
	const day30Str = localDate(day30);
	const monthKey = monthKeyOf(now.getFullYear(), now.getMonth() + 1);
	const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthKey = monthKeyOf(prevMonth.getFullYear(), prevMonth.getMonth() + 1);

	const dayRows = days.map((d) => ({ date: d.date, ...sumDayModels(d.models) }));
	const inWindow = (lo, hi) => dayRows.filter((r) => r.date >= lo && r.date <= hi)
		.sort((a, b) => (a.date < b.date ? -1 : 1));

	const account = {
		today: pickRow(dayRows, todayStr),
		yesterday: pickRow(dayRows, yesterdayStr),
		days7: (rows => rows.length > 0 ? sumRows(rows) : null)(inWindow(day7Str, todayStr)),
		days30: (rows => rows.length > 0 ? sumRows(rows) : null)(inWindow(day30Str, todayStr)),
		month: (rows => rows.length > 0 ? sumRows(rows) : null)(dayRows.filter((r) => r.date.startsWith(monthKey) && r.date <= todayStr)),
		lastMonth: (rows => rows.length > 0 ? sumRows(rows) : null)(dayRows.filter((r) => r.date.startsWith(lastMonthKey)))
	};

	const modelRows = new Map();
	for (const d of days) {
		for (const m of d.models ?? []) {
			let rows = modelRows.get(m.model);
			if (rows === void 0) { rows = []; modelRows.set(m.model, rows); }
			rows.push({ date: d.date, cost: m.cost, tokens: m.tokens, requests: m.requests });
		}
	}
	const models = [...modelRows.entries()].map(([model, rows]) => {
		const win = (lo, hi) => rows.filter((r) => r.date >= lo && r.date <= hi)
			.sort((a, b) => (a.date < b.date ? -1 : 1));
		const windowed = win(day30Str, todayStr);
		return {
			model,
			today: pickRow(rows, todayStr),
			yesterday: pickRow(rows, yesterdayStr),
			days7: windowed.slice(-7).length > 0 ? sumRows(win(day7Str, todayStr)) : null,
			days30: windowed.length > 0 ? sumRows(windowed) : null,
			month: (r => r.length > 0 ? sumRows(r) : null)(rows.filter((r) => r.date.startsWith(monthKey) && r.date <= todayStr)),
			lastMonth: (r => r.length > 0 ? sumRows(r) : null)(rows.filter((r) => r.date.startsWith(lastMonthKey))),
			days: windowed.slice(-7).map((r) => ({ date: r.date, cost: r.cost }))
		};
	});

	return {
		...account,
		days: inWindow(day30Str, todayStr).slice(-7).map((r) => ({ date: r.date, cost: r.cost, tokens: r.tokens, requests: r.requests })),
		models
	};
}

/** Fetch the official cumulative consumption from get_user_summary (CNY). */
export async function fetchCumulativeConsumption(token) {
	const response = await fetch(PLATFORM_SUMMARY_URL, {
		headers: platformHeaders(token),
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	if (!response.ok) throw new Error(`DeepSeek 平台汇总接口返回 HTTP ${response.status}`);
	const body = await response.json();
	const code = body?.code ?? body?.data?.biz_code;
	if (code === 40002 || code === 40003) {
		throw new Error("DEEPSEEK_PLATFORM_TOKEN 已过期：请重新登录 platform.deepseek.com 并更新 userToken");
	}
	if (body?.code !== 0 || body?.data?.biz_code !== 0) {
		throw new Error(`DeepSeek 平台汇总接口错误 (code ${String(code ?? "unknown")})`);
	}
	const costs = body?.data?.biz_data?.total_costs;
	if (!Array.isArray(costs)) return null;
	const cny = costs.find((c) => c?.currency === "CNY") ?? costs[0];
	const amount = toFinite(cny?.amount);
	return Number.isFinite(amount) ? round2(amount) : null;
}

/**
 * Fetch the platform usage for the current + previous month, aggregate into
 * account + per-model period slices, and read the official cumulative
 * consumption from the user summary.
 * @param token - platform session token.
 * @returns `{ source: "platform", currency, today, yesterday, days7, days30,
 * month, lastMonth, days, models, cumulativeOfficial }`.
 */
export async function fetchPlatformUsage(token) {
	const now = new Date();
	const current = await fetchMonth(token, now.getFullYear(), now.getMonth() + 1);
	const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const previous = await fetchMonth(token, prev.getFullYear(), prev.getMonth() + 1);
	const dayMap = new Map();
	for (const day of [...current.days, ...previous.days]) dayMap.set(day.date, day);
	const aggregated = aggregateUsageDays([...dayMap.values()], now);
	let cumulativeOfficial = null;
	try {
		cumulativeOfficial = await fetchCumulativeConsumption(token);
	} catch { }
	return {
		source: "platform",
		currency: current.currency,
		...aggregated,
		cumulativeOfficial
	};
}
