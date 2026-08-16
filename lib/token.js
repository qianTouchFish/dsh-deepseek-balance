// Auto-extract DEEPSEEK_PLATFORM_TOKEN from the user's browser profiles
// (Chrome / Edge): copy the profile's Local Storage (and cookies), launch a
// headless Chrome via the DevTools Protocol on the platform.deepseek.com
// origin, and read localStorage.getItem('userToken'). Same approach the
// one-off extraction used; runs server-side on request.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BROWSER_CANDIDATES = [
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Microsoft/Edge/Application/msedge.exe"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Copy a file or directory tree; locked files are skipped silently. */
function copyTree(src, dst) {
	if (!existsSync(src)) return;
	if (statSync(src).isFile()) {
		try { copyFileSync(src, dst); } catch { }
		return;
	}
	mkdirSync(dst, { recursive: true });
	for (const name of readdirSync(src)) {
		copyTree(join(src, name), join(dst, name));
	}
}

/** Enumerate (browser, profile dir) pairs for Chrome and Edge. */
function browserProfiles() {
	const roots = [
		join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "User Data"),
		join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Edge", "User Data")
	];
	const profiles = [];
	for (const root of roots) {
		if (!existsSync(root)) continue;
		const names = ["Default"];
		try {
			for (const dir of readdirSync(root)) if (/^Profile \d+$/.test(dir)) names.push(dir);
		} catch { }
		for (const name of names) profiles.push(join(root, name));
	}
	return profiles;
}

/**
 * Drive one headless browser against a copied profile and read the platform
 * token from localStorage. Returns the token or null.
 * @param browser - path to chrome/edge.
 * @param profileDir - copied profile (user-data-dir).
 * @param port - remote debugging port.
 */
async function extractFromProfile(browser, profileDir, port) {
	const chrome = spawn(browser, [
		"--headless=new",
		`--remote-debugging-port=${port}`,
		`--user-data-dir=${profileDir}`,
		"--no-first-run",
		"--disable-gpu",
		"--no-default-browser-check",
		"about:blank"
	], { stdio: "ignore" });
	try {
		let targets = [];
		for (let i = 0; i < 90; i++) {
			try {
				const res = await fetch(`http://127.0.0.1:${port}/json/list`);
				targets = await res.json();
				if (targets.some((t) => t.type === "page")) break;
			} catch { }
			await sleep(500);
		}
		const page = targets.find((t) => t.type === "page");
		if (!page) return null;
		const ws = new WebSocket(page.webSocketDebuggerUrl);
		await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error("cdp ws error")); });
		let id = 0;
		const pending = new Map();
		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
		};
		const send = (method, params = {}) => new Promise((resolve) => {
			const mid = ++id;
			pending.set(mid, resolve);
			ws.send(JSON.stringify({ id: mid, method, params }));
		});
		await send("Page.enable");
		await send("Page.navigate", { url: "https://platform.deepseek.com/usage" });
		for (let i = 0; i < 60; i++) {
			await sleep(1000);
			try {
				const r = await send("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
				if (r?.result?.result?.value === "complete") break;
			} catch { }
		}
		const evaluated = await send("Runtime.evaluate", {
			expression: `(() => {
				const raw = localStorage.getItem('userToken');
				if (!raw) return null;
				try { const o = JSON.parse(raw); return o && typeof o === 'object' ? (o.value ?? raw) : raw; }
				catch { return raw; }
			})()`,
			returnByValue: true
		});
		const token = evaluated?.result?.result?.value ?? null;
		try { ws.close(); } catch { }
		return typeof token === "string" && token.length > 0 ? token : null;
	} finally {
		chrome.kill();
	}
}

/**
 * Try to auto-extract the DeepSeek platform token from the user's browser
 * profiles. Returns the token, or null when not found.
 */
export async function autoFetchPlatformToken() {
	const browser = BROWSER_CANDIDATES.find((p) => existsSync(p));
	if (!browser) return null;
	for (const profile of browserProfiles()) {
		const tmp = mkdtempSync(join(tmpdir(), "dsh-token-"));
		try {
			copyTree(join(profile, "Local Storage", "leveldb"), join(tmp, "Default", "Local Storage", "leveldb"));
			copyTree(join(profile, "Network", "Cookies"), join(tmp, "Default", "Network", "Cookies"));
			copyTree(join(profile, "Cookies"), join(tmp, "Default", "Cookies"));
			const port = 9400 + Math.floor(Math.random() * 400);
			const token = await extractFromProfile(browser, tmp, port);
			if (token) return token;
		} catch { }
		finally {
			try { rmSync(tmp, { recursive: true, force: true }); } catch { }
		}
	}
	return null;
}
