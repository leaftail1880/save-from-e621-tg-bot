import { socksDispatcher } from "fetch-socks";
import { SocksProxyAgent } from "socks-proxy-agent";
import { fetch } from "undici";
import { env } from "./env.js";
import { logger } from "./logger.js";

/** @type {{ dispatcher: import('undici').Dispatcher, agent: SocksProxyAgent } | undefined} */
let proxy = undefined;
if (env.E621_PROXY !== "https://e621.net/") {
	const { hostname, port } = new URL(env.E621_PROXY);
	logger.info(`Using SOCKS5 proxy at hostname=${hostname}, port=${port}`);
	proxy = {
		dispatcher: socksDispatcher({ type: 5, host: hostname, port: parseInt(port) }),
		agent: new SocksProxyAgent(env.E621_PROXY),
	};
	// Set global dispatcher for undici (used by httpGet)
	global[Symbol.for("undici.globalDispatcher.1")] = proxy.dispatcher;
}

export function getAgent() {
  return proxy?.agent;
}

/**
 * @param {string} url
 */
export function httpGet(url) {
	return fetch(url, {
		signal: AbortSignal.timeout(15000),
	});
}
