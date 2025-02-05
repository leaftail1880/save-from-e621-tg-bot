import fs from "node:fs";
import path from "path";
import { env } from "./env.js";
import { httpGet } from "./fetch.js";

/**
 * @param {string} link
 * @param {string} filepath
 */
export async function save(link, filepath) {
	const exists = fs.existsSync(filepath);

	if (exists) throw new Error("File already exists!");

	const image = await (await httpGet(link)).blob();
	await fs.promises.writeFile(filepath, image.stream());
}

/**
 * @param {string} link
 */
export function getSavePath(link) {
	const filename = new URL(link).pathname
		.replace("/data/", "")
		.replace("/", "")
		.replaceAll("/", "-");

	const filepath = path.join(env.SAVE_TO_PATH, filename);
	return { filepath, filename };
}
