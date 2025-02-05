import { LeafyLogger } from "leafy-utils";

export const logger = new LeafyLogger({ prefix: "bot" });
if (process.env.DOCKER) {
	logger.write.formatDate = () => "";
} else {
	logger.write.formatDate = () => new Date().toLocaleString("ru");
}
