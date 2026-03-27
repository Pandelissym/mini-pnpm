import { PACKAGE_JSON_PATH } from "../constants.js";
import { Lockfile } from "../lib/lockfile.js";
import { PackageJSON } from "../lib/packageJSON.js";
import { resolveAndInstallWorkflow } from "../lib/resolveAndInstallWorkflow.js";

import type { CommandFunction } from "../types.js";

export const installCommand: CommandFunction = async () => {
	await handleInstall();
};

const handleInstall = async (): Promise<void> => {
	const packageJSON = PackageJSON.fromDisk(PACKAGE_JSON_PATH);

	const packages = packageJSON.collectDependencyEntries();

	const lockfile = Lockfile.fromDisk();
	const resolutionGraphDiff = await resolveAndInstallWorkflow(
		packages,
		lockfile,
	);

	const updatedLockfile = Lockfile.fromGraph(resolutionGraphDiff.graph);
	updatedLockfile.writeToDisk();
};
