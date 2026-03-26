import { installPackages } from "../lib/installPackages.js";
import { PackageJSON } from "../lib/packageJSON.js";

import type { CommandFunction } from "../types.js";

export const installCommand: CommandFunction = async () => {
	await handleInstall();
};

const handleInstall = async (): Promise<void> => {
	const packageJSON = PackageJSON.fromDisk();
	const packages = packageJSON.collectDependencyEntries();

	await installPackages(packages);
};
