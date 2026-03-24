import { isValidMiniPnpmDirectory } from "../lib/getProjectRoot.js";
import { installPackages } from "../lib/installPackages.js";
import { logger } from "../lib/logger.js";
import { readPackageJSON, writePackageJSON } from "../lib/packageJson.js";
import type { ResolvedPackage } from "../lib/resolver.js";
import type { CommandFunction, PackageJSON } from "../types.js";

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

	const isDevDep = flags["save-dev"];

	const pkgs = parseCLIPackageNameWithRanges(packagesToAdd);
	const depGraph = await installPackages(pkgs);

	// update package json
	const packageJson = readPackageJSON();

	const topLevelDeps = Object.values(depGraph).filter(
		(pkg) => pkg.isTopLevelDep,
	);

	addPackageJsonEntries(packageJson, topLevelDeps, isDevDep);

	writePackageJSON(packageJson);

	topLevelDeps.forEach((pkg) => {
		logger.info(`  ✓ ${pkg.name} ${pkg.version}`);
	});
};

const parseCLIPackageNameWithRanges = (
	entries: string[],
): Record<string, string> => {
	return Object.fromEntries(
		entries.map((entry) => {
			const { name, range } = parseCLIPackageNameWithRange(entry);
			return [name, range];
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

const addPackageJsonEntries = (
	packageJson: PackageJSON,
	pkgs: ResolvedPackage[],
	isDevDep: boolean,
): void => {
	const key: keyof PackageJSON = isDevDep ? "devDependencies" : "dependencies";

	if (!packageJson[key]) {
		packageJson[key] = {};
	}

	const newEntries = Object.fromEntries(
		pkgs.map((pkg) => [pkg.name, pkg.requestedRange]),
	);
	packageJson[key] = {
		...packageJson[key],
		...newEntries,
	};
};
