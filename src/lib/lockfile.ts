import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { satisfies } from "semver";
import { LOCKFILE_VERSION, PROJECT_ROOT } from "../constants.js";
import type {
	DependencyType,
	LockfileEntry,
	LockfileTopLevelMismatches,
	ResolutionGraph,
	ResolvedPackage,
	ResolvedTopLevelPackages,
	StoredLockfile,
	UnResolvedTopLevelPackages,
} from "../types.js";
import { logger } from "./logger.js";
import { splitStringByLastAt } from "./packageKey.js";

export class Lockfile {
	private static lockfilePath: string = path.join(
		PROJECT_ROOT,
		"mini-pnpm-lock.yaml",
	);

	private lockfileVersion: number;
	private packages: Record<string, LockfileEntry>;
	private topLevelPackages: ResolvedTopLevelPackages;

	constructor(
		packages: Record<string, LockfileEntry>,
		topLevelPackages: ResolvedTopLevelPackages,
		version: number = LOCKFILE_VERSION,
	) {
		this.packages = packages;
		this.topLevelPackages = topLevelPackages;
		this.lockfileVersion = version;
	}

	static fromGraph(graph: ResolutionGraph): Lockfile {
		const packages: Record<string, LockfileEntry> = {};
		const topLevelDeps: ResolvedTopLevelPackages = {};

		for (const [pkgKey, pkg] of Object.entries(graph)) {
			packages[pkgKey] = {
				version: pkg.version,
				integrity: pkg.integrity,
				resolved: pkg.tarballUrl,
				dependencies: pkg.dependencies,
				bin: pkg.bin,
			};

			if (pkg.dependencyType) {
				topLevelDeps[pkg.name] = {
					version: pkg.version,
					type: pkg.dependencyType,
				};
			}
		}

		return new Lockfile(packages, topLevelDeps);
	}

	static fromDisk(): Lockfile | undefined {
		try {
			logger.debug(`Reading lockfile from disk at ${Lockfile.lockfilePath}`);
			const lockfile = yaml.load(
				fs.readFileSync(Lockfile.lockfilePath, "utf8"),
			) as StoredLockfile;

			const parsedDependencies = Object.entries(lockfile.dependencies).map(
				([name, version]) => [name, { version, type: "dependencies" }],
			);
			const parsedDevDependencies = Object.entries(
				lockfile.devDependencies,
			).map(([name, version]) => [name, { version, type: "devDependencies" }]);
			const topLevelPackages: ResolvedTopLevelPackages = Object.fromEntries([
				...parsedDependencies,
				...parsedDevDependencies,
			]);

			return new Lockfile(
				lockfile.packages,
				topLevelPackages,
				lockfile.lockfileVersion,
			);
		} catch {
			logger.debug(`No lockfile found at ${Lockfile.lockfilePath}`);
			return undefined;
		}
	}

	writeToDisk() {
		fs.writeFileSync(
			Lockfile.lockfilePath,
			yaml.dump(this.toStoredLockfile(), { sortKeys: true }),
		);
	}

	findMismatches(
		deps: UnResolvedTopLevelPackages,
	): LockfileTopLevelMismatches | null {
		const toRemove = [];
		const toAdd = [];
		const toFixVersion = [];

		for (const [name, { range, type }] of Object.entries(deps)) {
			const lockfileEntry = this.topLevelPackages[name];
			if (!lockfileEntry) {
				toAdd.push({ name, range, dependencyType: type });
			} else if (lockfileEntry.type !== type) {
				toRemove.push({
					name,
					version: lockfileEntry.version,
					dependencyType: lockfileEntry.type,
				});
				toAdd.push({ name, range, dependencyType: type });
			} else if (!satisfies(lockfileEntry.version, range)) {
				toFixVersion.push({
					name,
					version: lockfileEntry.version,
					range,
					dependencyType: type,
				});
			}
		}

		for (const [name, { version, type }] of Object.entries(
			this.topLevelPackages,
		)) {
			if (!deps[name]) {
				toRemove.push({ name, version, dependencyType: type });
			}
		}
		if (
			toRemove.length === 0 &&
			toAdd.length === 0 &&
			toFixVersion.length === 0
		) {
			return null;
		}

		return {
			toRemove,
			toAdd,
			toFixVersion,
		};
	}

	getDependencyType(name: string, version: string): DependencyType | undefined {
		if (this.topLevelPackages[name]?.version === version) {
			return this.topLevelPackages[name].type;
		}
		return undefined;
	}

	getTopLevelPackageVersion(name: string): string | undefined {
		return this.topLevelPackages[name]?.version;
	}

	toResolutionGraph(): ResolutionGraph {
		const graph: ResolutionGraph = {};

		for (const [key, entry] of Object.entries(this.packages)) {
			const [name] = splitStringByLastAt(key);
			const graphEntry: ResolvedPackage = {
				name,
				version: entry.version,
				tarballUrl: entry.resolved,
				integrity: entry.integrity,
				dependencies: entry.dependencies ?? {},
				dependencyType: this.getDependencyType(name, entry.version),
				bin: entry.bin,
			};

			graph[key] = graphEntry;
		}

		return graph;
	}

	private toStoredLockfile(): StoredLockfile {
		const dependencies = Object.fromEntries(
			Object.entries(this.topLevelPackages)
				.filter(([_, { type }]) => type === "dependencies")
				.map(([name, { version }]) => [name, version]),
		);
		const devDependencies = Object.fromEntries(
			Object.entries(this.topLevelPackages)
				.filter(([_, { type }]) => type === "devDependencies")
				.map(([name, { version }]) => [name, version]),
		);
		return {
			dependencies,
			devDependencies,
			lockfileVersion: this.lockfileVersion,
			packages: this.packages,
		};
	}
}
