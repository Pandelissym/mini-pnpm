import { readPackageJSON, writePackageJSON } from "../lib/packageJson.js";
import type { CommandFunction } from "../types.js";

export const removeCommand: CommandFunction = async (args, _) => {
	const packageToRemove = args[0];

	if (!packageToRemove) {
		throw new Error("A package to be removed must be specified");
	}

	// update package json
	const manifest = readPackageJSON();
	if (manifest.dependencies) {
		delete manifest.dependencies[packageToRemove];
	}

	if (manifest.devDependencies) {
		delete manifest.devDependencies[packageToRemove];
	}
	writePackageJSON(manifest);
};
