import envalid from "envalid";

export const env = envalid.cleanEnv(process.env, {
	TOKEN: envalid.str({ desc: "Telegram bot token" }),

	WEBHOOK_URL: envalid.str({
		default: "",
		desc: "Telegram bot webhook url. Leave empty to use long polling",
	}),
	SAVE_TO_PATH: envalid.str({
		docs: "Where to save images to",
		default: "./images/",
	}),
	SAVE_LINK: envalid.url({
		docs: "Link to image",
		default: "https://example.com",
	}),

	USER_ID: envalid.num({
		default: 0,
		desc: "If provided, limits interaction with bot to this user",
	}),
	WARN_OTHER_USERS: envalid.bool({
		default: true,
		desc: "Whenether to warn other users or just ignore their messages. Respected only when USER_ID is provided",
	}),

	E621_PROXY: envalid.url({
		default: "https://e621.net/",
		desc: "If e621 is blocked, uses this url as proxy",
	}),
	E621_CHECK_INTERVAL_HOURS: envalid.num({
		default: 1, // 1 hour
		desc: "Interval to check for e621 availability status in hours. Set 0 to disable",
	}),
});
