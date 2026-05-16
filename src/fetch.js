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

const MAX_RETRIES = 5;

/**
 * @param {string} url
 * @param {number} attempt
 * @returns {Promise<Response>}
 */
async function httpGetWithRetry(url, attempt = 1) {
	try {
		const res = await fetch(url, {
			signal: AbortSignal.timeout(15000),
		});

		if (res.status === 429) {
			const retryAfter = parseInt(res.headers.get("retry-after") || "5") * 1000;
			const delay = Math.min(retryAfter, 30000);
			logger.info(`Got 429 from e621, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
			await new Promise(r => setTimeout(r, delay));
			if (attempt >= MAX_RETRIES) {
				throw new Error(`e621 returned 429 after ${MAX_RETRIES} retries`);
			}
			return httpGetWithRetry(url, attempt + 1);
		}

		return res;
	} catch (err) {
		if (err.name === "TimeoutError" || err.code === "ETIMEDOUT" || err.type === "system") {
			if (attempt >= MAX_RETRIES) throw err;
			const delay = attempt * 2000;
			logger.info(`Request timed out, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
			await new Promise(r => setTimeout(r, delay));
			return httpGetWithRetry(url, attempt + 1);
		}
		throw err;
	}
}

/**
 * @param {string} url
 */
export function httpGet(url) {
	return httpGetWithRetry(url);
}
