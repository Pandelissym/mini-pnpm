import { getPackageStoreKey } from "./getPackageStoreKey.js";
import {
	addToVirtualStore,
	createTopLevelSymLink,
	linkSubDependencies,
} from "./linker.js";
import { logger } from "./logger.js";
import { verifyIntegrity } from "./packageIntegrity.js";
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
	for (const resolvedPackage of Object.values(depGraph)) {
		const {
			name: pkgName,
			version,
			tarballUrl,
			size,
			integrity,
		} = resolvedPackage;

		const packageStoreKey = getPackageStoreKey(pkgName, version);
		logger.debug(`Trying to store package ${packageStoreKey}`);
		if (isInStore(packageStoreKey)) {
			logger.debug("Package already exists in global store!");
		} else {
			const data = await downloadTarball(tarballUrl);

			logger.debug(`Downloaded tarball. Size: ${size}`);

			const isVerified = verifyIntegrity(data, integrity);

			if (!isVerified) {
				throw new Error("Package integrity check failed");
			}

			logger.debug(`Package integrity check: PASS`);

			storePackage(packageStoreKey, data, integrity);
		}

		// add package to virtual store
		addToVirtualStore(pkgName, packageStoreKey);

		if (resolvedPackage.isTopLevelDep) {
			createTopLevelSymLink(pkgName, packageStoreKey, version);
		}
	}

	linkSubDependencies(depGraph);

	return depGraph;
};
