import { socksDispatcher } from "fetch-socks";
import { Dispatcher, fetch } from "undici";
import { env } from "./env.js";
import { logger } from "./logger.js";

/** @type {Dispatcher | undefined} */
let agent = undefined;
if (env.E621_PROXY !== "https://e621.net/") {
	const { hostname, port } = new URL(env.E621_PROXY);
	logger.info(`Using proxy at hostname=${hostname}, port=${port}`);
	agent = socksDispatcher({ type: 5, host: hostname, port: parseInt(port) });
}

/**
 * @param {string} url
 */
export function httpGet(url) {
	return fetch(url, {
		dispatcher: agent,
		signal: AbortSignal.timeout(15000),
	});
}
