import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { DepMap, PackageJSON } from "../types.js";

const PACKAGE_JSON_PATH = "./package.json";

/**
 * Reads a package manifest in the current directory and returns a js object representation of it
 * If there is no package manifest in the current dir it throws an error
 */
export const readPackageJSON = (): PackageJSON => {
	if (!existsSync(PACKAGE_JSON_PATH)) {
		throw new Error("No package.json found in current directory.");
	}

	const file = readFileSync(PACKAGE_JSON_PATH, "utf8");

	const packageJson = JSON.parse(file);
	return packageJson as PackageJSON;
};

/**
 * Writes a manifest to the PACKAGE_MANIFEST_PATH location.
 * @param manifest The manifest to write
 */
export const writePackageJSON = (packageJson: PackageJSON): void => {
	const data = JSON.stringify(packageJson, null, 2);
	writeFileSync(PACKAGE_JSON_PATH, data);
};

export const removeEntriesFromPackageJSON = (
	packageJSON: PackageJSON,
	entries: string[],
): void => {
	const depMaps = [packageJSON.dependencies, packageJSON.devDependencies];

	for (const depMap of depMaps) {
		if (!depMap) {
			continue;
		}

		for (const entry of entries) {
			delete depMap[entry];
		}
	}
};

/**
 * Collects all dependencies entries from a package.json
 * If a dep appears in both deps and devDeps, deps overwrites it
 * @param packageJson
 * @returns
 */
export const collectDependencyEntries = (packageJson: PackageJSON): DepMap => {
	return {
		...packageJson.devDependencies,
		...packageJson.dependencies,
	};
};
