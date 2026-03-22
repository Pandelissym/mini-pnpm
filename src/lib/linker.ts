import fs from "node:fs";
import path from "node:path";
import { GLOBAL_STORE_PATH } from "../constants.js";

export const addToVirtualStore = (
	name: string,
	packageStoreKey: string,
	version: string,
) => {
	const virtualStoreDir = path.join(
		process.cwd(),
		"node_modules",
		".pnpm",
		`${packageStoreKey}@${version}`,
		`node_modules`,
		name,
	);

	if (fs.existsSync(virtualStoreDir)) {
		return;
	}

	const sourceDir = path.join(
		GLOBAL_STORE_PATH,
		`${packageStoreKey}@${version}`,
	);

	hardLinkDir(sourceDir, virtualStoreDir);
};

const hardLinkDir = (sourceDir: string, destinationDir: string): void => {
	if (!fs.existsSync(sourceDir)) {
		throw new Error(
			`Source dir: ${sourceDir} not found when trying to create hard link`,
		);
	}

	fs.mkdirSync(destinationDir, { recursive: true });

	for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
		const srcPath = path.join(sourceDir, entry.name);
		const destPath = path.join(destinationDir, entry.name);

		if (entry.isDirectory()) {
			hardLinkDir(srcPath, destPath);
		} else {
			fs.linkSync(srcPath, destPath);
		}
	}
};

export const createTopLevelSymLink = (
	name: string,
	packageStoreKey: string,
	version: string,
) => {
	const topLevelDir = path.join(process.cwd(), "node_modules", name);

	let exists = false;
	try {
		fs.lstatSync(topLevelDir);
		exists = true;
	} catch {}

	if (exists) {
		return;
	}

	
	fs.mkdirSync(path.dirname(topLevelDir), { recursive: true });

	const target = path.join(
		process.cwd(),
		"node_modules",
		".pnpm",
		`${packageStoreKey}@${version}`,
		`node_modules`,
		name,
	);

	fs.symlinkSync(target, topLevelDir, "dir");
};
