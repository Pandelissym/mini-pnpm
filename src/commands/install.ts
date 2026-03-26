import { isValidMiniPnpmDirectory } from "../lib/getProjectRoot.js";
import { installPackages } from "../lib/installPackages.js";
import {
	collectDependencyEntries,
	readPackageJSON,
} from "../lib/packageJson.js";
import type { CommandFunction } from "../types.js";

export const installCommand: CommandFunction = async () => {
	if (!isValidMiniPnpmDirectory()) {
		throw new Error(
			"No package.json found in this directory. Please run the command from the project root.",
		);
	}

	const packageJson = readPackageJSON();
	const packages = collectDependencyEntries(packageJson);
	await installPackages(packages);
};
