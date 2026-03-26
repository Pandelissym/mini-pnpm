import { Lockfile } from "../lib/lockfile.js";
import { PackageJSON } from "../lib/packageJSON.js";
import { resolveAndInstallWorkflow } from "../lib/resolveAndInstallWorkflow.js";
import type { CommandFunction } from "../types.js";

type ParsedRemoveCommandArgs = {
	packagesToRemove: string[];
};

export const removeCommand: CommandFunction = async (args, _) => {
	const { packagesToRemove } = parseRemoveCommandArgs(args);

	await handleRemove(packagesToRemove);
};

const handleRemove = async (packagesToRemove: string[]): Promise<void> => {
	const packageJSON = PackageJSON.fromDisk();
	packageJSON.removeEntriesFromPackageJSON(packagesToRemove);

	const updatedPackages = packageJSON.collectDependencyEntries();

	const lockfile = Lockfile.fromDisk();
	const resolutionGraphDiff = await resolveAndInstallWorkflow(
		updatedPackages,
		lockfile,
	);

	const updatedLockfile = Lockfile.fromGraph(resolutionGraphDiff.graph);
	updatedLockfile.writeToDisk();

	packageJSON.writeToDisk();
};

const parseRemoveCommandArgs = (args: string[]): ParsedRemoveCommandArgs => {
	if (!args.length) {
		throw new Error("A package to be removed must be specified");
	}
	const cleanedPackages = args.map((pkg) => pkg.trim());

	return { packagesToRemove: cleanedPackages };
};
