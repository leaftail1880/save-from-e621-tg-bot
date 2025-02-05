import { Context, Telegraf } from "telegraf";
import { env } from "./env.js";
import { logger } from "./logger.js";

class MyContext extends Context {
	error(message = "") {
		if (this.chat?.type === "private") {
			const text =
				this.message && "text" in this.message
					? this.message.text
					: this.message;

			logger.warn(
				"Username:",
				this.chat.username,
				"message:",
				text,
				"reply:",
				message
			);

			this.reply(message);
		}
	}
}
export const bot = new Telegraf(env.TOKEN, { contextType: MyContext });
