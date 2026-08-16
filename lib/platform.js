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
export const PLATFORM_USAGE_URL = "https://platform.deepseek.com/api/v0/usage";
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

/** Sum usage items of one day/model list: tokens, requests. */
function aggregateUsage(entries) {
	let tokens = 0;
	let requests = 0;
	for (const modelEntry of entries ?? []) {
		if (modelEntry === null || typeof modelEntry !== "object") continue;
		for (const item of modelEntry.usage ?? []) {
			if (item === null || typeof item !== "object") continue;
			const value = toFinite(item.amount);
			if (!Number.isFinite(value)) continue;
			const type = typeof item.type === "string" ? item.type.toUpperCase() : "";
			if (type === REQUEST_TYPE) requests += Math.round(value);
			else if (TOKEN_TYPES.has(type)) tokens += Math.round(value);
		}
	}
	return { tokens, requests };
}

/** Sum cost items of one day/model list (the cost endpoint's `amount` field IS the cost). */
function aggregateCost(entries) {
	let cost = 0;
	for (const modelEntry of entries ?? []) {
		if (modelEntry === null || typeof modelEntry !== "object") continue;
		for (const item of modelEntry.usage ?? []) {
			if (item === null || typeof item !== "object") continue;
			const value = toFinite(item.amount);
			if (Number.isFinite(value)) cost += value;
		}
	}
	return cost;
}

async function fetchMonth(token, year, month) {
	const headers = {
		authorization: `Bearer ${token}`,
		accept: "application/json",
		"x-app-version": "1.0.0",
		origin: "https://platform.deepseek.com",
		referer: "https://platform.deepseek.com/usage"
	};
	const fetchJson = async (url) => {
		const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
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
		const agg = aggregateUsage(day.data);
		const costDay = (costBiz.days ?? []).find((d) => d?.date === day.date);
		days.push({
			date: day.date,
			cost: round2(aggregateCost(costDay?.data)),
			tokens: agg.tokens,
			requests: agg.requests
		});
	}
	return { days, currency: typeof costBiz.currency === "string" ? costBiz.currency : "CNY" };
}

function sumDays(days) {
	let cost = 0;
	let tokens = 0;
	let requests = 0;
	for (const day of days) {
		cost += Number.isFinite(day.cost) ? day.cost : 0;
		tokens += day.tokens ?? 0;
		requests += day.requests ?? 0;
	}
	return { cost: round2(cost), tokens, requests };
}

/**
 * Aggregate a day list into the period slices the card needs.
 * @param days - all available { date, cost, tokens, requests } rows.
 * @param now - reference "now" (injectable for tests).
 * @returns `{ today, yesterday, days7, days30, month, lastMonth, days }`
 * where days is the last 7 chart rows.
 */
export function aggregateUsageDays(days, now = new Date()) {
	const todayStr = localDate(now);
	const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
	const yesterdayStr = localDate(yesterday);
	const day7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
	const day7Str = localDate(day7);
	const day30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
	const day30Str = localDate(day30);
	const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
	const todayEntry = days.find((d) => d.date === todayStr);
	const yesterdayEntry = days.find((d) => d.date === yesterdayStr);
	const in7 = days.filter((d) => d.date >= day7Str && d.date <= todayStr);
	const in30 = days.filter((d) => d.date >= day30Str && d.date <= todayStr)
		.sort((a, b) => (a.date < b.date ? -1 : 1));
	const monthDays = days.filter((d) => d.date.startsWith(monthKey) && d.date <= todayStr);
	const lastMonthDays = days.filter((d) => d.date.startsWith(lastMonthKey));
	const slice = (day) => ({ cost: day.cost, tokens: day.tokens, requests: day.requests });
	return {
		today: todayEntry ? slice(todayEntry) : null,
		yesterday: yesterdayEntry ? slice(yesterdayEntry) : null,
		days7: in7.length > 0 ? sumDays(in7) : null,
		days30: in30.length > 0 ? sumDays(in30) : null,
		month: monthDays.length > 0 ? sumDays(monthDays) : null,
		lastMonth: lastMonthDays.length > 0 ? sumDays(lastMonthDays) : null,
		days: in30.slice(-7).map((d) => ({ date: d.date, cost: d.cost, tokens: d.tokens, requests: d.requests }))
	};
}

/**
 * Fetch the platform usage for the current month and the previous month and
 * aggregate into today / month / trailing-30-day / chart slices.
 * @param token - platform session token.
 * @returns `{ source: "platform", currency, today, month, days30, days }`.
 */
export async function fetchPlatformUsage(token) {
	const now = new Date();
	const current = await fetchMonth(token, now.getFullYear(), now.getMonth() + 1);
	const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const previous = await fetchMonth(token, prev.getFullYear(), prev.getMonth() + 1);
	const dayMap = new Map();
	for (const day of [...current.days, ...previous.days]) dayMap.set(day.date, day);
	const aggregated = aggregateUsageDays([...dayMap.values()], now);
	return {
		source: "platform",
		currency: current.currency,
		...aggregated
	};
}
