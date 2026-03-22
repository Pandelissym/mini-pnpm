import { getPackageStoreKey } from "../lib/getPackageStoreKey.js";
import { isValidMiniPnpmDirectory } from "../lib/getProjectRoot.js";
import { addToVirtualStore, createTopLevelSymLink } from "../lib/linker.js";
import { verifyIntegrity } from "../lib/packageIntegrity.js";
import { readPackageJSON } from "../lib/packageJson.js";
import {
	downloadTarball,
	fetchPackageMetadata,
	resolvePackageVersion,
} from "../lib/registry.js";
import { isInStore, storePackage } from "../lib/store.js";
import { parseSemVerRange } from "../lib/versionRange.js";
import type { CommandFunction } from "../types.js";

export const installCommand: CommandFunction = async () => {
	if (!isValidMiniPnpmDirectory()) {
		throw new Error(
			"No package.json found in this directory. Please run the command from the project root.",
		);
	}

	const packageJson = readPackageJSON();
	const entries = {
		...packageJson.dependencies,
		...packageJson.devDependencies,
	};

	for (const [packageName, range] of Object.entries(entries)) {
		const parsedRange = parseSemVerRange(range);
		console.log(`Resolving ${packageName} from range ${range}`);
		const packageMetadata = await fetchPackageMetadata(packageName);
		const resolvedVersion = resolvePackageVersion(packageMetadata, parsedRange);

		if (!resolvedVersion) {
			throw new Error("Unable to resolve version");
		}

		const versionObject = packageMetadata.versions[resolvedVersion];

		if (!versionObject) {
			throw new Error("Unable to resolve version");
		}
		console.log(`Resolved version: ${resolvedVersion}`);

		const packageStoreKey = getPackageStoreKey(packageName);
		if (isInStore(packageStoreKey, resolvedVersion)) {
			console.log("Package already exists in global store!");
		} else {
			const tarballURL = versionObject.dist.tarball;
			const data = await downloadTarball(tarballURL);

			console.log(
				`Downloaded tarball. Size: ${versionObject.dist.unpackedSize}`,
			);

			const isVerified = verifyIntegrity(data, versionObject.dist.integrity);

			if (!isVerified) {
				throw new Error("Package integrity check failed");
			}

			console.log(`Package integrity check: PASS`);

			storePackage(
				packageStoreKey,
				resolvedVersion,
				data,
				versionObject.dist.integrity,
			);
		}

		// add package to virtual store
		addToVirtualStore(packageName, packageStoreKey, resolvedVersion);
		createTopLevelSymLink(packageName, packageStoreKey, resolvedVersion);

		console.log(`  ✓ ${packageName}@${resolvedVersion}`);
	}
};
