import { getInstalledPackages } from "../lib/getInstalledPackages.js";
import { logger } from "../lib/logger.js";
import {
	collectDependencyEntries,
	readPackageJSON,
	removeEntriesFromPackageJSON,
	writePackageJSON,
} from "../lib/packageJson.js";
import { removePackage } from "../lib/removePackage.js";
import { resolveDeps } from "../lib/resolver.js";
import type { CommandFunction } from "../types.js";

export const removeCommand: CommandFunction = async (args, _) => {
	const packagesToRemove = args.map((pkg) => pkg.trim());

	if (!packagesToRemove.length) {
		throw new Error("A package to be removed must be specified");
	}

	const packageJSON = readPackageJSON();
	removeEntriesFromPackageJSON(packageJSON, packagesToRemove);

	const updatedDeps = collectDependencyEntries(packageJSON);
	const depGraph = await resolveDeps(updatedDeps);

	const installedPackages = getInstalledPackages();
	const neededPackages = new Set(Object.keys(depGraph));
	for (const pkgKey of installedPackages) {
		if (!neededPackages.has(pkgKey)) {
			removePackage(pkgKey);
			logger.info(`Removed package ${pkgKey}`);
		}
	}

	writePackageJSON(packageJSON);
};
