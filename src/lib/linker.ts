import fs from "node:fs";
import path from "node:path";
import { GLOBAL_STORE_PATH, PROJECT_ROOT } from "../constants.js";
import type {
	MergedBin,
	ResolutionGraph,
	ResolutionGraphDiff,
	ResolvedPackage,
} from "../types.js";
import { logger } from "./logger.js";
import {
	getPackageStoreKey,
	pkgKeyToPnpmVirtualStoreKey,
	splitStringByLastAt,
} from "./packageKey.js";

export const addToVirtualStore = (pkgKey: string): void => {
	logger.debug(`${pkgKey}`);
	const [name, version] = splitStringByLastAt(pkgKey);
	const pkgStoreKey = getPackageStoreKey(name, version);
	logger.debug(`${name}`);
	logger.debug(`${version}`);

	const virtualStoreDir = path.join(
		PROJECT_ROOT,
		"node_modules",
		".pnpm",
		`${pkgStoreKey}`,
		`node_modules`,
		name,
	);
	logger.debug(`${virtualStoreDir}`);

	if (fs.existsSync(virtualStoreDir)) {
		return;
	}

	const sourceDir = path.join(GLOBAL_STORE_PATH, `${pkgStoreKey}`);
	logger.debug(`${sourceDir}`);

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

export const createTopLevelSymLink = (pkgKey: string): void => {
	const [name, version] = splitStringByLastAt(pkgKey);
	const pkgStoreKey = getPackageStoreKey(name, version);

	const topLevelDir = path.join(PROJECT_ROOT, "node_modules", name);
	const amountOfLevelsUp: string[] = new Array(
		(name.match("/") || []).length,
	).fill("..");
	const target = path.join(
		...amountOfLevelsUp,
		".pnpm",
		pkgStoreKey,
		`node_modules`,
		name,
	);

	createSymLink(target, topLevelDir);
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

export const linkSubDependencies = (packages: ResolvedPackage[]): void => {
	for (const pkg of packages) {
		const pkgStoreKey = getPackageStoreKey(pkg.name, pkg.version);
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
			createSymLink(target, source);
		}
	}
};

export const checkNodeModulesState = (graph: ResolutionGraph) => {
	const toAdd = [];
	for (const [key, pkg] of Object.entries(graph)) {
		console.log(JSON.stringify(pkg));
		if (!virtualStoreHardLinkExists(key)) {
			toAdd.push(pkg);
			continue;
		}

		if (pkg.dependencyType) {
			if (!topLevelSymLinkExists(key)) {
				toAdd.push(pkg);
			} else if (pkg.bin && !binSymLinkExists(key, pkg.bin)) {
				toAdd.push(pkg);
			}
		}
	}

	return toAdd;
};

export const deletePackages = (
	pkgsToRemove: ResolutionGraphDiff["removed"],
) => {
	for (const pkgToRemove of pkgsToRemove) {
		const { pkg, removalType } = pkgToRemove;
		const key = getPackageStoreKey(pkg.name, pkg.version);
		if (pkg.dependencyType) {
			removeTopLevelSymLink(key);
		}

		if (removalType === "full") {
			removeFromVirtualStore(key);
		}
	}
};

export const linkPackages = (packages: ResolvedPackage[]): void => {
	for (const pkg of packages) {
		const { name, version, dependencyType } = pkg;
		addToVirtualStore(`${name}@${version}`);

		if (dependencyType) {
			const key = `${name}@${version}`;
			createTopLevelSymLink(key);
			if (pkg.bin) {
				linkBinaries(key, pkg.bin);
			}
		}
	}

	linkSubDependencies(packages);
};

const linkBinaries = (pkgKey: string, bin: MergedBin): void => {
	if (!bin) {
		return;
	}

	const pkgDir = getPackageDir(pkgKey);

	const binDir = path.join(PROJECT_ROOT, "node_modules", ".bin");
	fs.mkdirSync(binDir, { recursive: true });

	for (const [name, executablePath] of Object.entries(bin)) {
		const target = path.join(pkgDir, executablePath);
		const source = path.join(binDir, name);
		createSymLink(target, source);
		logger.debug(`Created symlink from ${source} to ${target}`);
	}
};

const getPackageDir = (pkgKey: string): string => {
	const [name, version] = splitStringByLastAt(pkgKey);
	const pkgStoreKey = getPackageStoreKey(name, version);
	return path.join(
		PROJECT_ROOT,
		"node_modules",
		".pnpm",
		pkgStoreKey,
		"node_modules",
		name,
	);
};

const binSymLinkExists = (pkgKey: string, bin: MergedBin): boolean => {
	if (!bin) {
		return false;
	}
	const pkgDir = getPackageDir(pkgKey);

	const binDir = path.join(PROJECT_ROOT, "node_modules", ".bin");
	for (const [name, executablePath] of Object.entries(bin)) {
		const target = path.join(pkgDir, executablePath);
		const source = path.join(binDir, name);
		const exists = symLinkExists(source) && fs.readlinkSync(source) === target;
		if (!exists) {
			return false;
		}
	}
	return true;
};

const createSymLink = (target: string, source: string): void => {
	if (symLinkExists(source)) {
		if (fs.readlinkSync(source) === target) {
			return;
		}
		fs.unlinkSync(source);
	} else {
		fs.mkdirSync(path.dirname(source), { recursive: true });
	}

	fs.symlinkSync(target, source, "dir");
};
