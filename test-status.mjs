// Standalone smoke tests for the DeepSeek status logic.
// Runs without the harness: mock ctx, temp DSH_HOME for tracking state.
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectStatus, updateTracking, normalizeBalance, maskKey } from "./lib/status.js";
import { parsePlatformUsage } from "./lib/platform.js";

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
			}
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
// 3) platform usage parser with a synthetic envelope
{
	const amountPayload = {
		code: 0,
		data: {
			biz_code: 0,
			biz_data: [{
				total: [{ model: "deepseek-chat", usage: [
					{ type: "PROMPT_CACHE_HIT_TOKEN", amount: 1000 },
					{ type: "PROMPT_CACHE_MISS_TOKEN", amount: 2000 },
					{ type: "RESPONSE_TOKEN", amount: 500 },
					{ type: "REQUEST", amount: 12 }
				] }],
				days: [{
					date: new Date().toISOString().slice(0, 10),
					data: [{ model: "deepseek-chat", usage: [
						{ type: "PROMPT_CACHE_HIT_TOKEN", amount: "100" },
						{ type: "PROMPT_CACHE_MISS_TOKEN", amount: "200" },
						{ type: "RESPONSE_TOKEN", amount: "50" },
						{ type: "REQUEST", amount: "3" }
					] }]
				}]
			}]
		}
	};
	const costPayload = {
		code: 0,
		data: {
			biz_code: 0,
			biz_data: [{
				currency: "CNY",
				total: [{ model: "deepseek-chat", usage: [{ amount: 0.123456 }, { amount: 0.0001 }] }],
				days: [{
					date: new Date().toISOString().slice(0, 10),
					data: [{ model: "deepseek-chat", usage: [{ amount: 0.05 }] }]
				}]
			}]
		}
	};
	const parsed = parsePlatformUsage(amountPayload, costPayload);
	console.log("=== parsePlatformUsage (synthetic) ===");
	console.log(JSON.stringify(parsed, null, 2));
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
