import { socksDispatcher } from "fetch-socks";
import { SocksProxyAgent } from "socks-proxy-agent";
import { Dispatcher, fetch } from "undici";
import { env } from "./env.js";
import { logger } from "./logger.js";

/** @type {{ dispatcher: Dispatcher, agent: SocksProxyAgent } | undefined} */
let proxy = undefined;
if (env.E621_PROXY !== "https://e621.net/") {
  const { hostname, port } = new URL(env.E621_PROXY);
  logger.info(`Using SOCKS5 proxy at hostname=${hostname}, port=${port}`);
  proxy = {
    dispatcher: socksDispatcher({
      type: 5,
      host: hostname,
      port: parseInt(port),
    }),
    agent: new SocksProxyAgent(env.E621_PROXY),
  };
}

/**
 * @returns {SocksProxyAgent | undefined}
 */
export function getAgent() {
  return proxy?.agent;
}

/**
 * @returns {Dispatcher | undefined}
 */
export function getDispatcher() {
  return proxy?.dispatcher;
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
      dispatcher: proxy?.dispatcher,
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "5") * 1000;
      const delay = Math.min(retryAfter, 30000);
      logger.info(
        `Got 429 from e621, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, delay));
      if (attempt >= MAX_RETRIES) {
        throw new Error(`e621 returned 429 after ${MAX_RETRIES} retries`);
      }
      return httpGetWithRetry(url, attempt + 1);
    }

    return res;
  } catch (err) {
    const isRetryable =
      err.name === "TimeoutError" ||
      err.name === "AbortError" ||
      err.code === "ETIMEDOUT" ||
      err.code === "UND_ERR_SOCKET" ||
      err.code === "ERR_SOCKET_TIMEOUT" ||
      err.cause?.name === "TimeoutError" ||
      err.type === "system";

    if (isRetryable) {
      if (attempt >= MAX_RETRIES) throw err;
      const delay = attempt * 2000;
      logger.info(
        `Request failed (${err.name || err.code || err.type}), retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, delay));
      return httpGetWithRetry(url, attempt + 1);
    }

    logger.warn(
      `Non-retryable error: ${err.name || err.code} - ${err.message}`,
    );
    throw err;
  }
}

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
export function httpGet(url) {
  return httpGetWithRetry(url);
}
