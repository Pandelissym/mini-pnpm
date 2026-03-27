import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type {
	Bin,
	DependencyType,
	MergedBin,
	ResolvedPackage,
	UnResolvedTopLevelPackages,
} from "../types.js";
import type { Lockfile } from "./lockfile.js";

type PackageJSONProps = {
	version: string;
	name: string;
	dependenciesMap: Record<DependencyType, Record<string, string> | undefined>;
	bin: MergedBin;
};

type StoredPackageJSON = {
	version: string;
	name: string;
	bin?: Bin;
} & Record<DependencyType, Record<string, string> | undefined>;

export class PackageJSON {
	private version: string;
	private name: string;
	private dependenciesMap: Record<
		DependencyType,
		Record<string, string> | undefined
	>;
	private bin: MergedBin;

	constructor(props: PackageJSONProps) {
		this.version = props.version;
		this.name = props.name;
		this.dependenciesMap = props.dependenciesMap;
		this.bin = props.bin;
	}

	writeToDisk(path: string) {
		const data = JSON.stringify(this.mapToObject(), null, 2);
		const dataWithNewLine = data.endsWith("\n") ? data : `${data}\n`;
		writeFileSync(path, dataWithNewLine);
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
			delete this.dependenciesMap[key][pkg.name];
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

	mapToObject(): StoredPackageJSON {
		const bin = this.bin
			? Object.keys(this.bin).length === 1
				? this.bin[this.name]
				: this.bin
			: undefined;
		return {
			version: this.version,
			name: this.name,
			bin,
			...this.dependenciesMap,
		};
	}

	static fromDisk(path: string) {
		if (!existsSync(path)) {
			throw new Error(`No package.json found in ${path} directory.`);
		}

		const file = readFileSync(path, "utf8");

		// add validation here
		const packageJson = JSON.parse(file) as StoredPackageJSON;
		const dependenciesMap = {
			dependencies: packageJson.dependencies,
			devDependencies: packageJson.devDependencies,
		};

		const bin =
			typeof packageJson.bin === "string"
				? { [packageJson.name]: packageJson.bin }
				: packageJson.bin;

		return new PackageJSON({
			name: packageJson.name,
			version: packageJson.version,
			dependenciesMap,
			bin,
		});
	}
}
