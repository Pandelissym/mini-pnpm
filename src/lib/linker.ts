import fs from "node:fs";
import path from "node:path";
import { GLOBAL_STORE_PATH, PROJECT_ROOT } from "../constants.js";
import type { ResolutionGraph } from "../types.js";
import { logger } from "./logger.js";
import {
	getPackageStoreKey,
	pkgKeyToPnpmVirtualStoreKey,
	splitStringByLastAt,
} from "./packageKey.js";

export const addToVirtualStore = (
	name: string,
	packageStoreKey: string,
): void => {
	const virtualStoreDir = path.join(
		PROJECT_ROOT,
		"node_modules",
		".pnpm",
		`${packageStoreKey}`,
		`node_modules`,
		name,
	);

	if (fs.existsSync(virtualStoreDir)) {
		return;
	}

	const sourceDir = path.join(GLOBAL_STORE_PATH, `${packageStoreKey}`);

	hardLinkDir(sourceDir, virtualStoreDir);
};

export const removeFromVirtualStore = (pkgKey: string): void => {
	const pkgVirtualStoreDir = path.join(
		PROJECT_ROOT,
		"node_modules",
		".pnpm",
		pkgKeyToPnpmVirtualStoreKey(pkgKey),
	);

	if (!fs.existsSync(pkgVirtualStoreDir)) {
		logger.debug(
			`Hard link for ${pkgKey} at ${pkgVirtualStoreDir} does not exist. Skipping.`,
		);
		return;
	}

	fs.rmSync(pkgVirtualStoreDir, { recursive: true });
	logger.debug(`Removed ${pkgKey} from virtual store at ${pkgVirtualStoreDir}`);
};

export const virtualStoreHardLinkExists = (pkgKey: string): boolean => {
	const pkgVirtualStoreDir = path.join(
		PROJECT_ROOT,
		"node_modules",
		".pnpm",
		pkgKeyToPnpmVirtualStoreKey(pkgKey),
	);

	return fs.existsSync(pkgVirtualStoreDir);
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
): void => {
	const topLevelDir = path.join(PROJECT_ROOT, "node_modules", name);
	const amountOfLevelsUp: string[] = new Array(
		(name.match("/") || []).length,
	).fill("..");
	const target = path.join(
		...amountOfLevelsUp,
		".pnpm",
		packageStoreKey,
		`node_modules`,
		name,
	);

	if (symLinkExists(topLevelDir)) {
		if (fs.readlinkSync(topLevelDir) === target) {
			return;
		}
		fs.unlinkSync(topLevelDir);
	} else {
		fs.mkdirSync(path.dirname(topLevelDir), { recursive: true });
	}

	fs.symlinkSync(target, topLevelDir, "dir");
};

export const removeTopLevelSymLink = (pkgKey: string): void => {
	const [name, _] = splitStringByLastAt(pkgKey);
	const topLevelSymLinkPath = path.join(PROJECT_ROOT, "node_modules", name);

	if (!symLinkExists(topLevelSymLinkPath)) {
		logger.debug(
			`Symlink for ${name} at ${topLevelSymLinkPath} does not exist. Skipping.`,
		);
		return;
	}
	logger.debug(`Removing ${topLevelSymLinkPath} for key ${pkgKey}`);
	fs.unlinkSync(topLevelSymLinkPath);
};

export const topLevelSymLinkExists = (pkgKey: string): boolean => {
	const [name, _] = splitStringByLastAt(pkgKey);
	const topLevelSymLinkPath = path.join(PROJECT_ROOT, "node_modules", name);
	return symLinkExists(topLevelSymLinkPath);
};

const symLinkExists = (linkPath: string): boolean => {
	try {
		fs.lstatSync(linkPath);
		return true;
	} catch {
		return false;
	}
};

export const linkSubDependencies = (graph: ResolutionGraph): void => {
	for (const [pkgKey, pkg] of Object.entries(graph)) {
		const pkgStoreKey = pkgKeyToPnpmVirtualStoreKey(pkgKey);
		for (const [depName, depVersion] of Object.entries(pkg.dependencies)) {
			const depPkgStoreKey = getPackageStoreKey(depName, depVersion);

			const source = path.join(
				PROJECT_ROOT,
				"node_modules",
				".pnpm",
				pkgStoreKey,
				`node_modules`,
				depName,
			);
			const target = path.join(
				"..",
				"..",
				depPkgStoreKey,
				`node_modules`,
				depName,
			);
			if (symLinkExists(source)) {
				if (fs.readlinkSync(source) === target) {
					continue;
				}
				fs.unlinkSync(source);
			} else {
				fs.mkdirSync(path.dirname(source), { recursive: true });
			}

			fs.symlinkSync(target, source, "dir");
		}
	}
};

export const checkNodeModulesState = (graph: ResolutionGraph) => {
	const toAdd = [];
	for (const [key, pkg] of Object.entries(graph)) {
		if (!virtualStoreHardLinkExists(key)) {
			toAdd.push(pkg);
			continue;
		}

		if (pkg.dependencyType) {
			if (!topLevelSymLinkExists(key)) {
				toAdd.push(pkg);
			}
		}
	}

	return toAdd;
};
