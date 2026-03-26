import type {
	ResolutionGraphDiff,
	UnResolvedTopLevelPackages,
} from "../types.js";
import {
	addToVirtualStore,
	createTopLevelSymLink,
	linkSubDependencies,
	removeFromVirtualStore,
	removeTopLevelSymLink,
} from "./linker.js";
import { Lockfile } from "./lockfile.js";
import { logger } from "./logger.js";
import { verifyIntegrity } from "./packageIntegrity.js";
import { getPackageStoreKey } from "./packageKey.js";
import { createProgressBar } from "./progress.js";
import { downloadTarball } from "./registry.js";
import { resolvePackages } from "./resolver.js";
import { isInStore, storePackage } from "./store.js";

export const installPackages = async (
	pkgs: UnResolvedTopLevelPackages,
): Promise<ResolutionGraphDiff> => {
	const lockfile = Lockfile.fromDisk();

	const resolutionGraphDiff = await resolvePackages(pkgs, lockfile);
	const { graph, added, removed } = resolutionGraphDiff;

	for (const pkgToRemove of removed) {
		const { pkg, removalType } = pkgToRemove;
		const key = getPackageStoreKey(pkg.name, pkg.version);
		if (pkg.dependencyType) {
			removeTopLevelSymLink(key);
		}

		if (removalType === "full") {
			removeFromVirtualStore(key);
			delete graph[key];
		}
	}

	const progressBar = createProgressBar(
		added.length,
		"Downloading",
		logger.isDebugEnabled(),
	);

	for (const resolvedPackage of added) {
		const { name: pkgName, version, tarballUrl, integrity } = resolvedPackage;

		const pkgKey = `${pkgName}@${version}`;
		const pkgStoreKey = getPackageStoreKey(pkgName, version);

		logger.debug(`Trying to store package ${pkgKey}`);
		if (isInStore(pkgStoreKey)) {
			logger.debug("Package already exists in global store!");
		} else {
			const data = await downloadTarball(tarballUrl);

			logger.debug(`Downloaded tarball.`);

			const isVerified = verifyIntegrity(data, integrity);

			if (!isVerified) {
				throw new Error("Package integrity check failed");
			}

			logger.debug(`Package integrity check: PASS`);

			storePackage(pkgStoreKey, data);
		}

		// add package to virtual store
		addToVirtualStore(pkgName, pkgStoreKey);

		if (resolvedPackage.dependencyType) {
			createTopLevelSymLink(pkgName, pkgStoreKey);
		}
		progressBar.tick();
	}

	linkSubDependencies(graph);

	// const newLockfile = Lockfile.fromGraph(graph);
	// newLockfile.writeToDisk();

	const depRemoves = removed
		.filter(({ pkg }) => pkg.dependencyType === "dependencies")
		.map(({ pkg }) => `  - ${pkg.name}@${pkg.version}`)
		.join("\n");
	const depAdds = added
		.filter((pkg) => pkg.dependencyType === "dependencies")
		.map((pkg) => `  + ${pkg.name}@${pkg.version}`)
		.join("\n");
	const devDepRemoves = removed
		.filter(({ pkg }) => pkg.dependencyType === "devDependencies")
		.map(({ pkg }) => `  - ${pkg.name}@${pkg.version}`)
		.join("\n");
	const devDepAdds = added
		.filter((pkg) => pkg.dependencyType === "devDependencies")
		.map((pkg) => `  + ${pkg.name}@${pkg.version}`)
		.join("\n");

	if (depRemoves || depAdds) {
		console.log();
		console.log("dependencies");
		console.log(
			`${depRemoves}${depRemoves.length && depAdds.length ? "\n" : ""}${depAdds}`,
		);
		console.log();
	}
	if (devDepAdds || devDepRemoves) {
		console.log("devDependencies");
		console.log(
			`${devDepRemoves}${devDepRemoves.length && devDepAdds.length ? "\n" : ""}${devDepAdds}`,
		);
	}

	return resolutionGraphDiff;
};
