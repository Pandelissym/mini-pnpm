import { getPackageStoreKey } from "../lib/getPackageStoreKey.js";
import { isValidMiniPnpmDirectory } from "../lib/getProjectRoot.js";
import { addToVirtualStore, createTopLevelSymLink } from "../lib/linker.js";
import { verifyIntegrity } from "../lib/packageIntegrity.js";
import { readPackageJSON, writePackageJSON } from "../lib/packageJson.js";
import {
	downloadTarball,
	fetchPackageMetadata,
	resolvePackageVersion,
} from "../lib/registry.js";
import { isInStore, storePackage } from "../lib/store.js";
import { parseSemVerRange, versionRangeToString } from "../lib/versionRange.js";
import type { CommandFunction, VersionRange } from "../types.js";

export const addCommand: CommandFunction = async (args, flags) => {
	const packageToAdd = args[0];
	if (!packageToAdd) {
		throw new Error("A package to be added must be specified");
	}

	if (!isValidMiniPnpmDirectory()) {
		throw new Error(
			"No package.json found in this directory. Please run the command from the project root.",
		);
	}

	const isDevDep = flags["save-dev"];

	let packageName: string;
	let range: VersionRange;

	const lastAtIndex = packageToAdd.lastIndexOf("@");
	if (lastAtIndex === -1 || lastAtIndex === 0) {
		packageName = packageToAdd;
		range = {
			operator: "^",
			tag: "latest",
		};
	} else {
		packageName = packageToAdd.slice(0, lastAtIndex);
		range = parseSemVerRange(packageToAdd.slice(lastAtIndex + 1));
	}

	const packageMetadata = await fetchPackageMetadata(packageName);
	const resolvedVersion = resolvePackageVersion(packageMetadata, range);

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

		console.log(`Downloaded tarball. Size: ${versionObject.dist.unpackedSize}`);

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

	// update package json
	const packageJson = readPackageJSON();
	if (isDevDep) {
		if (!packageJson.devDependencies) {
			packageJson.devDependencies = {};
		}
		packageJson.devDependencies[packageName] = versionRangeToString(
			range,
			resolvedVersion,
		);
	} else {
		if (!packageJson.dependencies) {
			packageJson.dependencies = {};
		}
		packageJson.dependencies[packageName] = versionRangeToString(
			range,
			resolvedVersion,
		);
	}
	writePackageJSON(packageJson);

	// add package to virtual store
	addToVirtualStore(packageName, packageStoreKey, resolvedVersion);
	createTopLevelSymLink(packageName, packageStoreKey, resolvedVersion);

	console.log(`  ✓ ${packageName}@${resolvedVersion}`);
};
