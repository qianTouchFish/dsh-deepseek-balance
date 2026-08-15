// Smoke test for the hand-written client bundle: loads it through a mock
// __ModuleLoader__, runs the factory, invokes apply() with a fake ctx, and
// inspects the slot registrations.
const fs = require("fs");
const path = require("path");

global.window = {
	__ModuleLoader__: {
		load(spec) {
			global.__captured = spec;
		}
	}
};

const code = fs.readFileSync(path.join(__dirname, "lib", "client.js"), "utf8");
const requireStub = (id) => {
	if (id === "react/jsx-runtime") return { jsx: () => ({}), jsxs: () => ({}) };
	if (id === "react") return { useState: (v) => [v, () => {}], useEffect: () => {}, useMemo: (f) => f(), Fragment: Symbol("Fragment") };
	throw new Error("unexpected require: " + id);
};

// 1) bundle loads and exports the plugin face
new Function("require", code)(requireStub);
if (!global.__captured) throw new Error("ModuleLoader.load was not called");
const spec = global.__captured;
const out = spec.factory(requireStub);
console.log("factory exports:", Object.keys(out));
console.log("inject:", JSON.stringify(out.inject));
console.log("apply is function:", typeof out.apply === "function");

// 2) apply() registers the footer-action strip (one registration)
const registrations = [];
const fakeCtx = {
	effect: (fn) => fn(),
	locale: {
		register: (ns, dicts) => {
			global.__dicts = dicts;
		},
		bind: () => (key) => key
	},
	slots: {
		inject: (name, factory) => registrations.push(factory()),
		register: (options, component) => ({ options, component })
	}
};
out.apply(fakeCtx);
console.log("locale dicts:", Object.keys(global.__dicts));
for (const reg of registrations) {
	const o = reg.options;
	console.log(`slot=${o.name} id=${o.id} order=${o.order} label=${typeof o.label === "function" ? o.label() : o.label} component=${typeof reg.component}`);
}
if (registrations.length !== 1) throw new Error("expected exactly one registration, got " + registrations.length);
if (registrations[0].options.name !== "sidebar.footer.action") throw new Error("unexpected slot name");
console.log("bundle smoke OK");
