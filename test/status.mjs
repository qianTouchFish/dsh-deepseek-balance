// Standalone smoke tests for the DeepSeek status logic.
// Runs without the harness: mock ctx, temp DSH_HOME for tracking state.
// Real-credential cases (balance / platform summary) are skipped when the
// credentials file is missing, so the suite stays portable across machines.
import { readFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { collectStatus, updateTracking, normalizeBalance, maskKey } from "../lib/status.js";
import { aggregateUsageDays, localDate, fetchCumulativeConsumption } from "../lib/platform.js";

// Resolve the real credentials file: $DSH_HOME/.credentials.yaml, else ~/.dsh/.credentials.yaml.
const credentialsPath = (process.env.DSH_HOME ? join(process.env.DSH_HOME, ".credentials.yaml") : "")
	|| join(homedir(), ".dsh", ".credentials.yaml");
let realKey = undefined;
let platformToken = undefined;
if (existsSync(credentialsPath)) {
	const text = readFileSync(credentialsPath, "utf8");
	realKey = text.match(/DEEPSEEK_API_KEY:\s*["']?([^"'\s]+)/)?.[1];
	platformToken = text.match(/DEEPSEEK_PLATFORM_TOKEN:\s*[^a-zA-Z]?([^\s]+)/)?.[1];
} else {
	console.log(`[skip] 未找到凭据文件 ${credentialsPath}，真实 key 相关用例跳过`);
}

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

// 1) configured, no platform token -> estimate usage (needs a real key)
if (realKey) {
	try {
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
	} catch (error) {
		console.log("[warn] case 1 真实余额查询失败(不影响本地逻辑验证):", error.message);
	}
} else {
	console.log("[skip] case 1: 需要真实 DEEPSEEK_API_KEY");
}

// 2) not-configured key path
{
	const payload = await collectStatus(makeCtx({ apiKey: undefined }));
	console.log("=== not configured ===");
	console.log(JSON.stringify(payload, null, 2));
}

// 3) platform usage aggregation with a synthetic day list (per-model rows)
{
	const now = new Date();
	const days = [];
	for (let i = 0; i < 35; i++) {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
		days.push({
			date: localDate(d),
			models: [
				{ model: "deepseek-v4-flash", cost: 0.01 * (i + 1), tokens: 1000 * (i + 1), requests: i + 1 },
				{ model: "deepseek-v4-pro", cost: 0.005 * (i + 1), tokens: 500 * (i + 1), requests: 0 }
			]
		});
	}
	const aggregated = aggregateUsageDays(days, now);
	const flash = aggregated.models.find((m) => m.model === "deepseek-v4-flash");
	const pro = aggregated.models.find((m) => m.model === "deepseek-v4-pro");
	console.log("=== aggregateUsageDays (synthetic per-model 35 days) ===");
	console.log(JSON.stringify({
		account: {
			today: aggregated.today,
			yesterday: aggregated.yesterday,
			days7: aggregated.days7,
			days30: aggregated.days30,
			month: aggregated.month,
			lastMonth: aggregated.lastMonth
		},
		flash: { today: flash.today, month: flash.month, chartDays: flash.days.length },
		pro: { today: pro.today, month: pro.month },
		modelCount: aggregated.models.length
	}, null, 2));
}

// 3b) official cumulative consumption (real token, platform get_user_summary)
if (platformToken) {
	try {
		const cumulative = await fetchCumulativeConsumption(platformToken);
		console.log("=== fetchCumulativeConsumption (real) ===");
		console.log(JSON.stringify({ cumulative }, null, 2));
	} catch (error) {
		console.log("[warn] case 3b 官方累计消费查询失败(可能令牌过期,不影响本地逻辑验证):", error.message);
	}
} else {
	console.log("[skip] case 3b: 需要真实 DEEPSEEK_PLATFORM_TOKEN");
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
