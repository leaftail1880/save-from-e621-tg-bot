import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";
import { httpGet } from "./fetch.js";
import { logger } from "./logger.js";

if (!fs.existsSync(env.SAVE_TO_PATH)) {
  await fs.promises.mkdir(env.SAVE_TO_PATH, { recursive: true });
} else {
  const stat = await fs.promises.stat(env.SAVE_TO_PATH);
  if (!stat.isDirectory()) {
    logger.error(
      `SAVE_TO_PATH env value ${env.SAVE_TO_PATH} is not a directory!`,
    );
    process.exit(1);
  }
}

logger.info("Will save images to", env.SAVE_TO_PATH);

/**
 * Downloads an image from the given link and saves it to the specified filepath.
 * Throws if the file already exists or the HTTP response is not successful.
 *
 * @param {string} link - The URL of the image to download
 * @param {string} filepath - The local path to save the image to
 * @returns {Promise<void>}
 */
export async function save(link, filepath) {
  if (fs.existsSync(filepath)) throw new Error("File already exists!");
  const res = await httpGet(link);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(filepath, buffer);
}

/**
 * Extracts the filename from an e621 URL and constructs the local save path.
 *
 * @param {string} link - The e621 image URL
 * @returns {{ filepath: string, filename: string }}
 */
export function getSavePath(link) {
  const filename = new URL(link).pathname
    .replace("/data/", "")
    .replace("/", "")
    .replaceAll("/", "-")
    .substring(5);
  const filepath = path.join(env.SAVE_TO_PATH, filename);
  return { filepath, filename };
}
