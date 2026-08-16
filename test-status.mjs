// Standalone smoke tests for the DeepSeek status logic.
// Runs without the harness: mock ctx, temp DSH_HOME for tracking state.
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectStatus, updateTracking, normalizeBalance, maskKey } from "./lib/status.js";
import { aggregateUsageDays, localDate } from "./lib/platform.js";

const credentialsText = readFileSync("C:/Users/24595/.dsh/.credentials.yaml", "utf8");
const realKey = credentialsText.match(/DEEPSEEK_API_KEY:\s*["']?([^"'\s]+)/)?.[1];

const tempHome = mkdtempSync(join(tmpdir(), "dsh-status-test-"));
process.env.DSH_HOME = tempHome;

function makeCtx(overrides = {}) {
	return {
		get: () => undefined,
		credentials: {
			resolve: async (ref) => {
				if (ref === "DEEPSEEK_API_KEY") return "apiKey" in overrides ? overrides.apiKey : { value: realKey, source: "file" };
				if (ref === "DEEPSEEK_PLATFORM_TOKEN") return overrides.platformToken;
				return undefined;
			},
			describe: async (ref) => ({ configured: ref === "DEEPSEEK_API_KEY" })
		}
	};
}

// 1) configured, no platform token -> estimate usage
{
	const payload = await collectStatus(makeCtx());
	console.log("=== configured (no platform token) ===");
	console.log(JSON.stringify({
		ok: payload.ok,
		keyConfigured: payload.key.configured,
		keyMasked: payload.key.masked,
		balance: payload.balance,
		usageSource: payload.usage?.source,
		usage: payload.usage,
		latencyMs: payload.latencyMs
	}, null, 2));
}

// 2) not-configured key path
{
	const payload = await collectStatus(makeCtx({ apiKey: undefined }));
	console.log("=== not configured ===");
	console.log(JSON.stringify(payload, null, 2));
}
// 3) platform usage aggregation with a synthetic day list
{
	const now = new Date();
	const mkDay = (offset, cost, tokens, requests) => {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
		return { date: localDate(d), cost, tokens, requests };
	};
	const days = [];
	for (let i = 0; i < 35; i++) {
		days.push(mkDay(i, 0.01 * (i + 1), 1000 * (i + 1), i + 1));
	}
	const aggregated = aggregateUsageDays(days, now);
	console.log("=== aggregateUsageDays (synthetic 35 days) ===");
	console.log(JSON.stringify({
		today: aggregated.today,
		yesterday: aggregated.yesterday,
		days7: aggregated.days7,
		days30: aggregated.days30,
		month: aggregated.month,
		lastMonth: aggregated.lastMonth,
		chartDays: aggregated.days.length,
		chartLast: aggregated.days[aggregated.days.length - 1]
	}, null, 2));
}

// 4) balance-delta tracking: baseline, spend, top-up handling
{
	const ctx = makeCtx();
	console.log("=== updateTracking sequence ===");
	const a = updateTracking(ctx, 100);   // first sighting: baseline 100
	const b = updateTracking(ctx, 97.5);  // spent 2.5
	const c = updateTracking(ctx, 120);   // top-up +22.5 -> baseline effectively 122.5
	const d = updateTracking(ctx, 118);   // spent 4.5 since top-up
	console.log(JSON.stringify({ a, b, c, d }, null, 2));
}

// 5) maskKey / normalizeBalance
{
	console.log("=== maskKey / normalizeBalance ===");
	console.log(maskKey("sk-abcdefgh12345678"), JSON.stringify(normalizeBalance({ is_available: true, balance_infos: [{ currency: "CNY", total_balance: "0.78", granted_balance: "0", topped_up_balance: "0.78" }] })));
}

rmSync(tempHome, { recursive: true, force: true });
