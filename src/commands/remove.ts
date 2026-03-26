import { installPackages } from "../lib/installPackages.js";
import {
	collectDependencyEntries,
	readPackageJSON,
	removeEntriesFromPackageJSON,
	writePackageJSON,
} from "../lib/packageJson.js";
import type { CommandFunction } from "../types.js";

export const removeCommand: CommandFunction = async (args, _) => {
	const packagesToRemove = args.map((pkg) => pkg.trim());

	if (!packagesToRemove.length) {
		throw new Error("A package to be removed must be specified");
	}

	const packageJSON = readPackageJSON();
	removeEntriesFromPackageJSON(packageJSON, packagesToRemove);

	const updatedDeps = collectDependencyEntries(packageJSON);

	await installPackages(updatedDeps);

	writePackageJSON(packageJSON);
};
