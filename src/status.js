import chalk from "chalk";
import { bold } from "telegraf/format";
import { bot } from "./index.js";
import { env } from "./env.js";
import { httpGet } from "./fetch.js";
import { logger } from "./logger.js";

if (env.E621_CHECK_INTERVAL_HOURS !== 0) {
	/** @type {boolean | undefined} */
	let lastIsAvailable = undefined;

	checkSiteStatus(); // perform initial check

	// I don't trust set interval with large coooldown, it may not run
	let lastUpdateTime = Date.now();
	const cooldown = env.E621_CHECK_INTERVAL_HOURS * 1000 * 60 * 60;
	setInterval(() => {
		if (Date.now() - lastUpdateTime > cooldown) {
			lastUpdateTime = Date.now();
			checkSiteStatus();
		}
	}, 60 * 1000);

	async function checkSiteStatus() {
		let available = false;
		let error;
		try {
			const response = await (
				await httpGet("https://static1.e621.net/")
			).text();

			available =
				response ===
				"<html>\r\n" +
					"<head><title>404 Not Found</title></head>\r\n" +
					"<body>\r\n" +
					"<center><h1>404 Not Found</h1></center>\r\n" +
					"<hr><center>nginx</center>\r\n" +
					"</body>\r\n" +
					"</html>\r\n";
		} catch (e) {
			error = e;
		}

		if (available !== lastIsAvailable) {
			lastIsAvailable = available;

			logger[available ? "success" : "warn"](
				"e621 is",
				available ? chalk.greenBright("available!") : chalk.red("unavailable!")
			);
			if (error) {
				logger.error(
					error instanceof TypeError && error.cause ? error.cause : error
				);
			}

			if (env.USER_ID) {
				bot.telegram.sendMessage(
					env.USER_ID,
					`e621 is ${bold(available ? "available" : "unavailable!")}`
				);
			}
		}
	}
}
