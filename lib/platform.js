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
function localDate(d = new Date()) {
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

function dayByDate(biz, date) {
	for (const day of biz?.days ?? []) {
		if (day !== null && typeof day === "object" && day.date === date) return day;
	}
	return void 0;
}

/**
 * Fetch the current month's official usage (tokens, requests) and cost.
 * @param token - platform session token.
 * @returns `{ source: "platform", currency, today, month }` where today/month
 * are `{ cost, tokens, requests }` (any field null when unavailable).
 */
export async function fetchPlatformUsage(token) {
	const now = new Date();
	const month = now.getMonth() + 1;
	const year = now.getFullYear();
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
	return parsePlatformUsage(amount, cost);
}

/** Pure parser (testable without network): amount + cost envelopes -> usage summary. */
export function parsePlatformUsage(amountPayload, costPayload) {
	const amountBiz = bizData(amountPayload, "用量");
	const costBiz = bizData(costPayload, "费用");
	if (amountBiz === null || costBiz === null) throw new Error("DeepSeek 平台用量接口未返回数据");

	const today = localDate();
	const todayAmountDay = dayByDate(amountBiz, today);
	const todayCostDay = dayByDate(costBiz, today);
	const todayTokens = todayAmountDay !== void 0 ? aggregateUsage(todayAmountDay.data).tokens : null;
	const todayRequests = todayAmountDay !== void 0 ? aggregateUsage(todayAmountDay.data).requests : null;
	const todayCost = todayCostDay !== void 0 ? round2(aggregateCost(todayCostDay.data)) : null;

	// Month totals: prefer biz_data.total, fall back to summing all days.
	const amountTotal = aggregateUsage(amountBiz.total);
	const costTotal = aggregateCost(costBiz.total);
	let monthTokens = null;
	let monthRequests = null;
	let monthCost = null;
	if (Array.isArray(amountBiz.total) && amountBiz.total.length > 0) {
		monthTokens = amountTotal.tokens;
		monthRequests = amountTotal.requests;
	} else {
		let tokens = 0;
		let requests = 0;
		for (const day of amountBiz.days ?? []) {
			const agg = aggregateUsage(day?.data);
			tokens += agg.tokens;
			requests += agg.requests;
		}
		monthTokens = tokens;
		monthRequests = requests;
	}
	if (Array.isArray(costBiz.total) && costBiz.total.length > 0) {
		monthCost = round2(costTotal);
	} else {
		let cost = 0;
		for (const day of costBiz.days ?? []) cost += aggregateCost(day?.data);
		monthCost = round2(cost);
	}

	return {
		source: "platform",
		currency: typeof costBiz.currency === "string" ? costBiz.currency : "CNY",
		today: { cost: todayCost, tokens: todayTokens, requests: todayRequests },
		month: { cost: monthCost, tokens: monthTokens, requests: monthRequests }
	};
}
