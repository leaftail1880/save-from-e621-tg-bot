import { fetch, ProxyAgent } from "undici";
import { env } from "./env.js";

const agent =
	env.E621_PROXY !== "https://e621.net/"
		? new ProxyAgent(env.E621_PROXY)
		: undefined;

/**
 * @param {string} url
 */
export function httpGet(url) {
	return fetch(url, {
		dispatcher: agent,
		signal: AbortSignal.timeout(3000),
	});
}
