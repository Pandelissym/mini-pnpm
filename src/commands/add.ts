import { isValidMiniPnpmDirectory } from "../lib/getProjectRoot.js";
import { installPackages } from "../lib/installPackages.js";
import { Lockfile } from "../lib/lockfile.js";
import {
	collectDependencyEntries,
	readPackageJSON,
	writePackageJSON,
} from "../lib/packageJson.js";
import type {
	CommandFunction,
	DependencyType,
	PackageJSON,
	ResolvedPackage,
	UnResolvedTopLevelPackages,
} from "../types.js";

export const addCommand: CommandFunction = async (args, flags) => {
	const packagesToAdd = args;
	if (!packagesToAdd.length) {
		throw new Error("A package to be added must be specified");
	}

	if (!isValidMiniPnpmDirectory()) {
		throw new Error(
			"No package.json found in this directory. Please run the command from the project root.",
		);
	}

	const dependencyType: DependencyType = flags["save-dev"]
		? "devDependency"
		: "dependency";
	const packageJson = readPackageJSON();
	const packages = collectDependencyEntries(packageJson);

	const pkgsToAdd = parseCLIPackageNameWithRanges(
		packagesToAdd,
		dependencyType,
	);

	const resolutionGraphDiff = await installPackages({
		...packages,
		...pkgsToAdd,
	});

	const updatedLockfile = Lockfile.fromGraph(resolutionGraphDiff.graph);

	updatedLockfile.writeToDisk();

	updatePackageJSON(
		packageJson,
		pkgsToAdd,
		updatedLockfile,
		resolutionGraphDiff.removed.map(({ pkg }) => pkg),
	);

	writePackageJSON(packageJson);
};

const parseCLIPackageNameWithRanges = (
	entries: string[],
	dependencyType: DependencyType,
): UnResolvedTopLevelPackages => {
	return Object.fromEntries(
		entries.map((entry) => {
			const { name, range } = parseCLIPackageNameWithRange(entry);
			return [name, { range, type: dependencyType }];
		}),
	);
};

const parseCLIPackageNameWithRange = (
	nameWithRange: string,
): { name: string; range: string } => {
	const lastAtIndex = nameWithRange.lastIndexOf("@");
	let name: string;
	let range: string;

	if (lastAtIndex === -1 || lastAtIndex === 0) {
		name = nameWithRange;
		// if no range specifier is given default to latest
		range = "latest";
	} else {
		name = nameWithRange.slice(0, lastAtIndex);
		range = nameWithRange.slice(lastAtIndex + 1);
	}

	return {
		name,
		range,
	};
};

const updatePackageJSON = (
	packageJson: PackageJSON,
	unresolvedPackages: UnResolvedTopLevelPackages,
	lockfile: Lockfile,
	resolvedPackagesRemoved: ResolvedPackage[],
): void => {
	resolvedPackagesRemoved.forEach((pkg) => {
		if (pkg.dependencyType === "dependency" && packageJson.dependencies) {
			delete packageJson.dependencies[pkg.name];
		} else if (
			pkg.dependencyType === "devDependency" &&
			packageJson.devDependencies
		) {
			delete packageJson.devDependencies[pkg.name];
		}
	});

	for (const [name, { range, type }] of Object.entries(unresolvedPackages)) {
		const key = type === "dependency" ? "dependencies" : "devDependencies";
		let cleanedRange = range;
		if (range === "latest") {
			cleanedRange = `^${lockfile.getTopLevelPackageVersion(name)}`;
		}
		if (!packageJson[key]) {
			packageJson[key] = {};
		}
		packageJson[key][name] = cleanedRange;
	}
};
