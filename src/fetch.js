import { socksDispatcher } from "fetch-socks";
import { Dispatcher, fetch } from "undici";
import { env } from "./env.js";

/** @type {Dispatcher | undefined} */
let agent = undefined;
if (env.E621_PROXY !== "https://e621.net/") {
	const { host, port } = new URL(env.E621_PROXY);
	agent = socksDispatcher({ type: 5, host, port: parseInt(port) });
}

/**
 * @param {string} url
 */
export function httpGet(url) {
	return fetch(url, {
		dispatcher: agent,
		signal: AbortSignal.timeout(3000),
	});
}
