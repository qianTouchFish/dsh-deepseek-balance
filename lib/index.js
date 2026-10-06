// DeepSeek API status — host half.
// Registers plain HTTP routes on the webserver service:
//   GET  /api/deepseek-status          status payload (balance, usage, models, keys)
//   POST /api/deepseek-token           save {action:"save", token} or auto-fetch
//                                      {action:"auto"} DEEPSEEK_PLATFORM_TOKEN
import { collectStatus, maskKey, PLATFORM_TOKEN_REF } from "./status.js";
import { autoFetchPlatformToken } from "./token.js";

export const name = "dsh-deepseek-balance";
export const inject = ["webServer", "credentials", "llm"];

const ROUTE_PATH = "/api/deepseek-status";
const TOKEN_ROUTE_PATH = "/api/deepseek-token";
const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store"
};

function sendJson(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, JSON_HEADERS);
	res.end(body);
}

export function apply(ctx) {
	ctx.effect(
		() => ctx.webServer.register({
			kind: "exact",
			path: ROUTE_PATH,
			handler: async (req, res) => {
				let payload;
				let status = 200;
				try {
					const keyRef = new URL(req.url ?? "/", "http://x").searchParams.get("key") ?? void 0;
					payload = await collectStatus(ctx, keyRef);
				} catch (error) {
					status = 502;
					payload = {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					};
				}
				sendJson(res, status, payload);
			}
		}),
		"dsh-deepseek-balance: status route"
	);

	ctx.effect(
		() => ctx.webServer.register({
			kind: "exact",
			path: TOKEN_ROUTE_PATH,
			handler: async (req, res) => {
				try {
					const chunks = [];
					for await (const chunk of req) chunks.push(chunk);
					const raw = Buffer.concat(chunks).toString("utf8");
					let body = {};
					try { body = raw ? JSON.parse(raw) : {}; } catch { }
					if (body.action === "auto") {
						const token = await autoFetchPlatformToken();
						if (!token) {
							sendJson(res, 200, { ok: false, found: false, error: "未能在浏览器配置中找到 userToken(请确认已登录 platform.deepseek.com 的 Chrome/Edge/Chromium,且未使用隐身模式)" });
							return;
						}
						await ctx.credentials.set(PLATFORM_TOKEN_REF, token);
						sendJson(res, 200, { ok: true, found: true, masked: maskKey(token) });
						return;
					}
					if (body.action === "save" && typeof body.token === "string" && body.token.trim().length > 0) {
						const token = body.token.trim();
						await ctx.credentials.set(PLATFORM_TOKEN_REF, token);
						sendJson(res, 200, { ok: true, masked: maskKey(token) });
						return;
					}
					sendJson(res, 400, { ok: false, error: "bad request" });
				} catch (error) {
					sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
		}),
		"dsh-deepseek-balance: token route"
	);
}

export { collectStatus, maskKey, normalizeBalance, updateTracking } from "./status.js";
