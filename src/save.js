import fs from "node:fs";
import path from "path";
import { env } from "./env.js";
import { httpGet } from "./fetch.js";
import { logger } from "./logger.js";

if (!fs.existsSync(env.SAVE_TO_PATH)) {
	await fs.promises.mkdir(env.SAVE_TO_PATH, { recursive: true });
} else {
	const stat = await fs.promises.stat(env.SAVE_TO_PATH);
	if (!stat.isDirectory()) {
		logger.error(`SAVE_TO_PATH env value ${env.SAVE_TO_PATH} is not a directory!`);
		process.exit(1);
	}
}

logger.info("Will save images to", env.SAVE_TO_PATH);

export async function save(link, filepath) {
	if (fs.existsSync(filepath)) throw new Error("File already exists!");
	const buffer = Buffer.from(await (await httpGet(link)).arrayBuffer());
	await fs.promises.writeFile(filepath, buffer);
}

export function getSavePath(link) {
	const filename = new URL(link).pathname
		.replace("/data/", "")
		.replace("/", "")
		.replaceAll("/", "-")
		.substring(5);
	const filepath = path.join(env.SAVE_TO_PATH, filename);
	return { filepath, filename };
}
