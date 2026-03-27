import { PACKAGE_JSON_PATH } from "../constants.js";
import { Lockfile } from "../lib/lockfile.js";
import { PackageJSON } from "../lib/packageJSON.js";
import { parseCLIPackageNameWithRanges } from "../lib/parseCLIPackageNameWithRange.js";
import { resolveAndInstallWorkflow } from "../lib/resolveAndInstallWorkflow.js";
import type { CliFlags, CommandFunction, DependencyType } from "../types.js";

type ParsedAddCommandArgs = {
	packagesToAdd: string[];
};

type ParsedAddCommandFlags = {
	dependencyType: DependencyType;
};

export const addCommand: CommandFunction = async (args, flags) => {
	const { packagesToAdd } = parseAddCommandArgs(args);
	const { dependencyType } = parseAddCommandFlags(flags);

	await handleAdd(packagesToAdd, dependencyType);
};

const handleAdd = async (
	packagesToAdd: string[],
	dependencyType: DependencyType,
): Promise<void> => {
	const packageJSON = PackageJSON.fromDisk(PACKAGE_JSON_PATH);
	const packages = packageJSON.collectDependencyEntries();

	const parsedPackagesToAdd = parseCLIPackageNameWithRanges(
		packagesToAdd,
		dependencyType,
	);

	const combinedPackagesToAdd = {
		...packages,
		...parsedPackagesToAdd,
	};

	const lockfile = Lockfile.fromDisk();
	const resolutionGraphDiff = await resolveAndInstallWorkflow(
		combinedPackagesToAdd,
		lockfile,
	);

	const updatedLockfile = Lockfile.fromGraph(resolutionGraphDiff.graph);
	updatedLockfile.writeToDisk();

	packageJSON.updatePackageJSON(
		parsedPackagesToAdd,
		resolutionGraphDiff.removed.map(({ pkg }) => pkg),
		updatedLockfile,
	);
	packageJSON.writeToDisk(PACKAGE_JSON_PATH);
};

const parseAddCommandArgs = (args: string[]): ParsedAddCommandArgs => {
	if (!args.length) {
		throw new Error("A package to be added must be specified");
	}
	const cleanedPackages = args.map((pkg) => pkg.trim());

	return { packagesToAdd: cleanedPackages };
};

const parseAddCommandFlags = (flags: CliFlags): ParsedAddCommandFlags => {
	const dependencyType: DependencyType = flags["save-dev"]
		? "devDependencies"
		: "dependencies";

	return { dependencyType };
};
