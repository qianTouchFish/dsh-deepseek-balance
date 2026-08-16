// DeepSeek API status — host half.
// Registers a plain HTTP route on the webserver service. The route reads the
// DeepSeek API key (and optional platform session token) from the credentials
// service and returns a compact JSON status payload: balance per currency,
// availability, cumulative/today consumption estimates (balance-delta
// tracking), official platform usage (today/month cost, tokens, request
// counts) when DEEPSEEK_PLATFORM_TOKEN is configured, and key config.
import { collectStatus } from "./status.js";

export const name = "deepseek-api-status";
export const inject = ["webServer", "credentials", "llm"];

const ROUTE_PATH = "/api/deepseek-status";
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};

export function apply(ctx) {
	ctx.effect(
		() => ctx.webServer.register({
			kind: "exact",
			path: ROUTE_PATH,
			handler: async (_req, res) => {
				let payload;
				let status = 200;
				try {
					payload = await collectStatus(ctx);
				} catch (error) {
					status = 502;
					payload = {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					};
				}
				const body = JSON.stringify(payload);
				res.writeHead(status, JSON_HEADERS);
				res.end(body);
			}
		}),
		"deepseek-api-status: status route"
	);
}

export { collectStatus, maskKey, normalizeBalance, updateTracking } from "./status.js";
