import fs from "node:fs";
import path from "node:path";
import { GLOBAL_STORE_PATH } from "../../constants.js";
import { getDirSize } from "../../lib/getDirSize.js";
import { logger } from "../../lib/logger.js";
import { formatBytes } from "../../lib/util/formatBytes.js";

export const storeStatusCommand = (): void => {
	if (!fs.existsSync(GLOBAL_STORE_PATH)) {
		logger.info("Store is empty");
		return;
	}
	let totalSize = 0;
	const entries = fs.readdirSync(GLOBAL_STORE_PATH);

	for (const entry of entries) {
		const entryPath = path.join(GLOBAL_STORE_PATH, entry);
		const size = getDirSize(entryPath);
		totalSize += size;

		logger.info(`${entry}   ${formatBytes(size)}`);
	}

	logger.info(`Total store size: ${formatBytes(totalSize)}`);
};
