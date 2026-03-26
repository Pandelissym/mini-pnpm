import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PACKAGE_JSON_PATH } from "../constants.js";
import type {
	DependencyType,
	ResolvedPackage,
	UnResolvedTopLevelPackages,
} from "../types.js";
import type { Lockfile } from "./lockfile.js";

type PackageJSONProps = {
	version: string;
	name: string;
	dependenciesMap: Record<DependencyType, Record<string, string> | undefined>;
};

export class PackageJSON {
	private version: string;
	private name: string;
	private dependenciesMap: Record<
		DependencyType,
		Record<string, string> | undefined
	>;

	constructor(props: PackageJSONProps) {
		this.version = props.version;
		this.name = props.name;
		this.dependenciesMap = props.dependenciesMap;
	}

	writeToDisk() {
		const data = JSON.stringify(this.toObject(), null, 2);
		const dataWithNewLine = data.endsWith("\n") ? data : `${data}\n`;
		writeFileSync(PACKAGE_JSON_PATH, dataWithNewLine);
	}

	collectDependencyEntries(): UnResolvedTopLevelPackages {
		const mappedDeps = [];
		for (const [depType, deps] of Object.entries(this.dependenciesMap)) {
			if (deps) {
				mappedDeps.push(
					Object.entries(deps).map(([name, range]) => [
						name,
						{ range, type: depType },
					]),
				);
			}
		}

		return Object.fromEntries(mappedDeps.flat());
	}

	updatePackageJSON(
		unresolvedPackagesAdded: UnResolvedTopLevelPackages,
		resolvedPackagesRemoved: ResolvedPackage[],
		lockfile: Lockfile,
	) {
		resolvedPackagesRemoved.forEach((pkg) => {
			const key = pkg.dependencyType;
			if (!key || !this.dependenciesMap[key]) {
				return;
			}
			delete this.dependenciesMap[key];
		});

		Object.entries(unresolvedPackagesAdded).forEach(
			([name, { range, type }]) => {
				const key = type;
				let cleanedRange = range;
				if (range === "latest") {
					cleanedRange = `^${lockfile.getTopLevelPackageVersion(name)}`;
				}

				if (!this.dependenciesMap[key]) {
					this.dependenciesMap[key] = {};
				}
				this.dependenciesMap[key][name] = cleanedRange;
			},
		);
	}

	removeEntriesFromPackageJSON = (packages: string[]): void => {
		for (const [_, deps] of Object.entries(this.dependenciesMap)) {
			if (!deps) {
				continue;
			}
			for (const entry of packages) {
				delete deps[entry];
			}
		}
	};

	toObject() {
		return {
			version: this.version,
			name: this.name,
			...this.dependenciesMap,
		};
	}

	static fromDisk() {
		if (!existsSync(PACKAGE_JSON_PATH)) {
			throw new Error(
				`No package.json found in ${PACKAGE_JSON_PATH} directory.`,
			);
		}

		const file = readFileSync(PACKAGE_JSON_PATH, "utf8");

		// add validation here
		const packageJson = JSON.parse(file);

		return new PackageJSON(packageJson);
	}
}

// /**
//  * Writes a manifest to the PACKAGE_MANIFEST_PATH location.
//  * @param manifest The manifest to write
//  */

// /**
//  * Collects all dependencies entries from a package.json
//  * If a dep appears in both deps and devDeps, deps overwrites it
//  * @param packageJson
//  * @returns
//  */
