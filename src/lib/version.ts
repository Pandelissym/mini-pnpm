import pjson from "../../package.json" with { type: "json" };
import { logger } from "./logger.js";

export const printVersion = () => {
	logger.info(pjson.version);
};
