import fs from "node:fs";
import path from "node:path";

import chalk from "chalk";
import { Context, Telegraf } from "telegraf";
import { callbackQuery, message } from "telegraf/filters";
import format from "telegraf/format";
import { button } from "telegraf/markup";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { getSavePath, save } from "./save.js";
import { getAgent } from "./fetch.js";

class MyContext extends Context {
	error(text) {
		if (this.chat?.type === "private") {
			logger.warn("Username:", this.chat.username, "message:", this.message?.text ?? this.message, "reply:", text);
			this.reply(text);
		}
	}
}

export const bot = new Telegraf(env.TOKEN, { contextType: MyContext, telegram: { agent: getAgent() } });

bot.catch((err) => {
	const code = err.response?.error_code;
	if (code === 429) {
		logger.warn("Telegram rate limited (retry after", err.response?.parameters?.retry_after ?? 5, "s)");
	} else {
		logger.error("Error:", err.description || err.message);
	}
});

async function telegramWithRetry(fn, retries = 3) {
	for (let i = 0; i < retries; i++) {
		try {
			return await fn();
		} catch (err) {
			if (err.response?.error_code === 429 && i < retries - 1) {
				const delay = (err.response.parameters?.retry_after || 5) * 1000;
				logger.warn("Telegram 429, waiting", delay, "ms (retry", i + 1, "/", retries - 1, ")");
				await new Promise(r => setTimeout(r, delay));
			} else {
				throw err;
			}
		}
	}
}

bot.on(message("text"), async (ctx) => {
	if (ctx.chat.type !== "private") return ctx.leaveChat();

	if (env.USER_ID !== 0 && ctx.chat.id !== env.USER_ID) {
		if (env.WARN_OTHER_USERS) ctx.error("This bot is not for you, sorry.");
		return;
	}

	if (ctx.message.text === "/start") {
		logger.success("New user!", ctx.chat.username ?? `${ctx.chat.first_name} ${ctx.chat.last_name ?? "<no lastname>"}, id=${ctx.chat.id}`);
		return ctx.reply("Rawr~ Forward me a message with static.e621.net link!");
	}

	const entities = ctx.message.entities?.filter((e) => e.type === "text_link");
	if (!entities?.length) {
		return ctx.error("No links in message found, ensure you forwarded the right message");
	}

	const link = entities.find(
		(e) => e.type === "text_link" && e.url.includes("static") && !e.url.includes("/data/sample/")
	);

	if (!link) {
		return ctx.error(`Unable to find link with 'static' in url! Links total count: ${entities.length}`);
	}

	logger.info("Link:", link.url);
	const msg = await telegramWithRetry(() => ctx.reply("Saving..."));
	const { filename, filepath } = getSavePath(link.url);

	try {
		await save(link.url, filepath);
		logger.info("Saved as", filename);
		await telegramWithRetry(() => ctx.telegram.editMessageText(
			ctx.chat.id,
			msg.message_id,
			undefined,
			format.fmt`Saved as ${format.link(format.bold(filename), `${env.SAVE_LINK}${filename}`)}!`,
			{
				reply_markup: { inline_keyboard: [[button.callback("Delete", `d:${filename}`)]] },
				link_preview_options: { is_disabled: true },
			}
		));
	} catch (e) {
		logger.error("Unable to save", filename, "-", e.message);
		await telegramWithRetry(() => ctx.telegram.editMessageText(
			ctx.chat.id,
			msg.message_id,
			undefined,
			format.fmt`${format.bold("Unable to save")} ${format.link(filename, link.url)}: ${format.code(String(e))}`,
			{ link_preview_options: { is_disabled: true } }
		));
	}
});

bot.on(callbackQuery("data"), async (ctx) => {
	const data = ctx.callbackQuery.data;
	if (data.startsWith("d:")) {
		const filename = data.split(":")[1];
		if (!filename) return ctx.answerCbQuery("No filename to delete", { show_alert: true });

		const filepath = path.join(env.SAVE_TO_PATH, filename);
		logger.info("Deleting", filename);
		await fs.promises.rm(filepath);
		await ctx.answerCbQuery("Deleted!");
		await ctx.editMessageText("Deleted!");
	} else {
		logger.warn("Invalid callbackQuery data:", data);
		ctx.answerCbQuery(`Invalid data: ${data}`);
	}
});

const { username } = await bot.telegram.getMe();
logger.info(`Bot token is for @${chalk.bold(username)}`);

if (env.WEBHOOK_URL) {
	bot.createWebhook({ domain: env.WEBHOOK_URL });
	logger.success(`Bot started using webhook: ${env.WEBHOOK_URL}`);
} else {
	bot.launch();
	logger.success("Bot started in long polling mode!");
}

process.on("unhandledRejection", (e) => logger.error("Unhandled rejection:", e.message));
process.on("uncaughtException", (e) => logger.error("Unhandled exception:", e.message));

import("./status.js");
