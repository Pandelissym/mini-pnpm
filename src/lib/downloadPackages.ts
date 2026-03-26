import type { ResolvedPackage } from "../types.js";
import { logger } from "./logger.js";
import { verifyIntegrity } from "./packageIntegrity.js";
import { getPackageStoreKey } from "./packageKey.js";
import { createProgressBar } from "./progress.js";
import { downloadTarball } from "./registry.js";
import type { GlobalStore } from "./store.js";

export const downloadPackages = async (
	packages: ResolvedPackage[],
	store: GlobalStore,
) => {
	if (packages.length === 0) {
		return;
	}
	const progressBar = createProgressBar(
		packages.length,
		"Downloading",
		logger.isDebugEnabled(),
	);

	for (const resolvedPackage of packages) {
		const { name: pkgName, version, tarballUrl, integrity } = resolvedPackage;

		const pkgKey = `${pkgName}@${version}`;
		const pkgStoreKey = getPackageStoreKey(pkgName, version);

		logger.debug(`Trying to store package ${pkgKey}`);
		if (store.isInStore(pkgStoreKey)) {
			logger.debug("Package already exists in global store!");
		} else {
			const data = await downloadTarball(tarballUrl);

			logger.debug(`Downloaded tarball.`);

			const isVerified = verifyIntegrity(data, integrity);

			if (!isVerified) {
				throw new Error("Package integrity check failed");
			}

			logger.debug(`Package integrity check: PASS`);

			store.addToStore(pkgStoreKey, data);
		}

		progressBar.tick();
	}
};
