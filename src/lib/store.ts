import fs from "node:fs";
import { GLOBAL_STORE_PATH } from "../constants.js";
import { logger } from "./logger.js";
import { extractTarball } from "./tarball.js";

export type GlobalStore = {
	isInStore: (key: string) => boolean;
	addToStore: (key: string, data: Buffer) => void;
};

export const addToStore = (pkgStoreKey: string, data: Buffer): void => {
	const destDir = `${GLOBAL_STORE_PATH}/${pkgStoreKey}`;
	logger.debug("IN STORE");
	logger.debug(destDir);
	if (fs.existsSync(destDir)) {
		logger.debug(`${destDir} already exists. Skipping`);
		return;
	}

	const tempDir = `${GLOBAL_STORE_PATH}/.temp-${pkgStoreKey}`;
	logger.debug(`Creating temp dir at ${tempDir}`);
	fs.mkdirSync(tempDir, { recursive: true });

	extractTarball(data, tempDir);

	logger.debug(`Moving ${tempDir} to ${destDir}`);
	fs.renameSync(tempDir, destDir);
};

export const isInStore = (name: string): boolean => {
	const packageDir = `${GLOBAL_STORE_PATH}/${name}`;

	return fs.existsSync(packageDir);
};

export const globalStore: GlobalStore = {
	isInStore,
	addToStore,
};
