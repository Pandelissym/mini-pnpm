import fs from "node:fs";
import path from "node:path";
import { GLOBAL_STORE_PATH } from "../constants.js";
import { getDirSize } from "../lib/getDirSize.js";
import type { CommandFunction } from "../types.js";

export const storeCommandHandler: CommandFunction = async (args, flags) => {
	const subcommand = args[0];

	if (!subcommand) {
		throw new Error("Specify subcommand");
	}

	if (subcommand === "status") {
		return storeStatusCommand();
	}
};

const storeStatusCommand = () => {
	if (!fs.existsSync(GLOBAL_STORE_PATH)) {
		console.log("Store is empty");
		return;
	}
	let totalSize = 0;
	const entries = fs.readdirSync(GLOBAL_STORE_PATH);

	for (const entry of entries) {
		const entryPath = path.join(GLOBAL_STORE_PATH, entry);
		const size = getDirSize(entryPath);
		totalSize += size;

		console.log(`${entry}   ${formatBytes(size)}`);
	}

	console.log();
	console.log(`Total store size: ${formatBytes(totalSize)}`);
};

const formatBytes = (bytes: number): string => {
	if (bytes < 1000) {
		return `${bytes} B`;
	}

	if (bytes < 1_000_000) {
		return `${(bytes / 1_000).toFixed(1)} KB`;
	}

	if (bytes < 10 ** 9) {
		return `${(bytes / 10 ** 6).toFixed(1)} MB`;
	}

	return `${(bytes / 10 ** 9).toFixed(1)} GB`;
};
