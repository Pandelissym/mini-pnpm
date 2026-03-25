import {
	addToVirtualStore,
	createTopLevelSymLink,
	linkSubDependencies,
} from "./linker.js";
import { logger } from "./logger.js";
import { verifyIntegrity } from "./packageIntegrity.js";
import { getPackageStoreKey } from "./packageKey.js";
import { createProgressBar } from "./progress.js";
import { downloadTarball } from "./registry.js";
import { type ResolutionGraph, resolveDeps } from "./resolver.js";
import { isInStore, storePackage } from "./store.js";

export const installPackages = async (
	deps: Record<string, string>,
): Promise<ResolutionGraph> => {
	// resolve deps
	const depGraph = await resolveDeps(deps);
	logger.debug("Created dependency graph.");

	// store deps
	const totalPackages = Object.keys(depGraph).length;
	if (totalPackages === 0) {
		logger.info("No packages to install!");
		return depGraph;
	}

	const progressBar = createProgressBar(
		totalPackages,
		"Downloading",
		logger.isDebugEnabled(),
	);

	for (const [pkgKey, resolvedPackage] of Object.entries(depGraph)) {
		const {
			name: pkgName,
			version,
			tarballUrl,
			size,
			integrity,
		} = resolvedPackage;
		const pkgStoreKey = getPackageStoreKey(pkgName, version);
		logger.debug(`Trying to store package ${pkgKey}`);
		if (isInStore(pkgStoreKey)) {
			logger.debug("Package already exists in global store!");
		} else {
			const data = await downloadTarball(tarballUrl);

			logger.debug(`Downloaded tarball. Size: ${size}`);

			const isVerified = verifyIntegrity(data, integrity);

			if (!isVerified) {
				throw new Error("Package integrity check failed");
			}

			logger.debug(`Package integrity check: PASS`);

			storePackage(pkgStoreKey, data);
		}

		// add package to virtual store
		addToVirtualStore(pkgName, pkgStoreKey);

		if (resolvedPackage.isTopLevelDep) {
			createTopLevelSymLink(pkgName, pkgStoreKey);
		}
		progressBar.tick();
	}

	linkSubDependencies(depGraph);

	return depGraph;
};
