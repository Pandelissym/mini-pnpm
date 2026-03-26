import { satisfies } from "semver";
import type {
	DependencyType,
	LockfileTopLevelMismatches,
	PackageRemovalType,
	ResolutionGraph,
	ResolutionGraphDiff,
	ResolvedPackage,
	UnResolvedTopLevelPackages,
} from "../types.js";
import { checkNodeModulesState } from "./linker.js";
import type { Lockfile } from "./lockfile.js";
import { logger } from "./logger.js";
import { packageMetadataCache } from "./packageMetadataCache.js";
import { createProgressIndicator } from "./progress.js";
import { fetchPackageMetadata, resolvePackageVersion } from "./registry.js";

export const updateResolutionGraph = async (
	graph: ResolutionGraph,
	mismatches: LockfileTopLevelMismatches,
): Promise<ResolutionGraphDiff> => {
	logger.debug(`${JSON.stringify(mismatches)}`);

	const toRemove = [...mismatches.toRemove, ...mismatches.toFixVersion];
	const packagesRemoved: {
		pkg: ResolvedPackage;
		removalType: PackageRemovalType;
	}[] = [];

	const allPackagesToRemove = new Set(
		toRemove
			.map(({ name, version }) => `${name}@${version}`)
			.flatMap((pkgKey) => [pkgKey, ...getAllSubDependencies(pkgKey, graph)]),
	);

	const packagesNeeded = new Set(
		Object.entries(graph)
			.filter(([pkgKey, _]) => !allPackagesToRemove.has(pkgKey))
			.flatMap(([pkgKey, pkg]) => [
				pkgKey,
				...Object.entries(pkg.dependencies).map(
					([name, version]) => `${name}@${version}`,
				),
			]),
	);

	for (const pkgKeyToRemove of allPackagesToRemove) {
		if (!graph[pkgKeyToRemove]) {
			continue;
		}
		if (!packagesNeeded.has(pkgKeyToRemove)) {
			packagesRemoved.push({ pkg: graph[pkgKeyToRemove], removalType: "full" });
			delete graph[pkgKeyToRemove];
		} else if (graph[pkgKeyToRemove].dependencyType) {
			packagesRemoved.push({
				pkg: graph[pkgKeyToRemove],
				removalType: "only-top-level",
			});
		}
	}

	const toAdd: UnResolvedTopLevelPackages = Object.fromEntries(
		[...mismatches.toFixVersion, ...mismatches.toAdd].map((entry) => [
			entry.name,
			{ range: entry.range, type: entry.dependencyType },
		]),
	);

	const packagesAdded = await addToResolutionGraph(toAdd, graph);

	return { graph, added: packagesAdded, removed: packagesRemoved };
};

const addToResolutionGraph = async (
	toAdd: UnResolvedTopLevelPackages,
	graph: ResolutionGraph,
): Promise<ResolvedPackage[]> => {
	const pkgKeysAdded = new Set<string>();
	const progressIndicator = createProgressIndicator(
		"Resolved",
		logger.isDebugEnabled(),
	);

	const queue: Array<{
		name: string;
		range: string;
		dependencyType: DependencyType | undefined;
	}> = Object.entries(toAdd).map(([name, { range, type }]) => ({
		name,
		range,
		dependencyType: type,
	}));

	const queueEntries = new Set<string>(
		queue.map((entry) => `${entry.name}@${entry.range}`),
	);

	const rawDependenciesMap: Record<string, Record<string, string>> = {};

	while (queue.length) {
		// biome-ignore lint/style/noNonNullAssertion: since we know queue is not empty we force
		const { name, range, dependencyType } = queue.shift()!;
		queueEntries.delete(`${name}@${range}`);

		// resolve this package
		logger.debug(`Resolving package ${name} with range ${range}`);
		const packageMetadata = await fetchPackageMetadata(name);
		packageMetadataCache[name] = packageMetadata;

		const resolvedVersion = resolvePackageVersion(packageMetadata, range);

		if (!resolvedVersion) {
			throw new Error("Unable to resolve version");
		}

		const packageVersionObject = packageMetadata.versions[resolvedVersion];

		if (!packageVersionObject) {
			throw new Error("Unable to resolve version");
		}

		logger.debug(`Resolved to version ${resolvedVersion}`);

		// add to graph
		const key = `${name}@${resolvedVersion}`;
		graph[key] = {
			name,
			version: resolvedVersion,
			tarballUrl: packageVersionObject.dist.tarball,
			integrity: packageVersionObject.dist.integrity,
			dependencyType,
			dependencies: {}, // we don't know exact versions yet so we when we have resolved those
		};
		pkgKeysAdded.add(key);
		rawDependenciesMap[key] = packageVersionObject.dependencies ?? {};

		// add all subdeps to queue
		const subDeps = packageVersionObject.dependencies || {};
		for (const [depName, depRange] of Object.entries(subDeps)) {
			// package already resolved so we can skip
			if (findResolvedVersionFromGraph(graph, depName, depRange)) {
				continue;
			}

			if (!queueEntries.has(`${depName}@${depRange}`)) {
				queue.push({
					name: depName,
					range: depRange,
					dependencyType: undefined,
				});
				queueEntries.add(`${depName}@${depRange}`);
			}
		}
		progressIndicator.tick();

		logger.debug("");
	}
	progressIndicator.end();

	// TODO: engines check?

	// go over graph and set the correct dependency versions in each resolved object
	for (const [resolvedPackageKey, resolvedPackage] of Object.entries(graph)) {
		const rawSubDeps = rawDependenciesMap[resolvedPackageKey];

		if (!rawSubDeps || !Object.keys(rawSubDeps).length) {
			continue;
		}

		for (const [depName, depVersionRange] of Object.entries(rawSubDeps)) {
			const resolvedVersion = findResolvedVersionFromGraph(
				graph,
				depName,
				depVersionRange,
			);
			if (resolvedVersion) {
				resolvedPackage.dependencies[depName] = resolvedVersion;
			} else {
				console.debug(
					`Dependency ${depName} with range ${depVersionRange} of ${resolvedPackage.name} could not be resolved as it couldn't be found in the resolution graph`,
					{ graph },
				);
				throw new Error(
					`Dependency ${depName} of ${resolvedPackage.name} could not be resolved`,
				);
			}
		}
	}

	const packagesAdded = Object.entries(graph)
		.filter(([key, _]) => pkgKeysAdded.has(key))
		.map(([_, pkg]) => pkg);

	return packagesAdded;
};

const getAllSubDependencies = (
	pkgKey: string,
	graph: ResolutionGraph,
): string[] => {
	const subDeps = new Set<string>();
	const queue = [pkgKey];
	const seen = new Set<string>();
	while (queue.length) {
		const depKey = queue.shift();
		if (!depKey) {
			break;
		}
		seen.add(depKey);

		subDeps.add(depKey);
		if (graph[depKey]?.dependencies) {
			for (const [dep, depVersion] of Object.entries(
				graph[depKey].dependencies,
			)) {
				const subDepKey = `${dep}@${depVersion}`;
				if (!queue.includes(subDepKey) && !seen.has(subDepKey)) {
					queue.push(subDepKey);
				}
			}
		}
	}

	return Array.from(subDeps);
};

export const resolveFreshDeps = async (
	deps: UnResolvedTopLevelPackages,
): Promise<ResolutionGraphDiff> => {
	const graph: ResolutionGraph = {};
	const packagesAdded = await addToResolutionGraph(deps, graph);
	return { graph, added: packagesAdded, removed: [] };
};

export const resolvePackages = async (
	deps: UnResolvedTopLevelPackages,
	lockfile?: Lockfile,
): Promise<ResolutionGraphDiff> => {
	let resolutionGraphDiff: ResolutionGraphDiff;
	if (lockfile) {
		await resolveDistTags(deps);
		logger.debug(`After resolving dist tags: ${JSON.stringify(deps)}`);
		const mismatches = lockfile.findMismatches(deps);

		logger.debug(`Lockfile found: Mismatches: ${JSON.stringify(mismatches)}`);

		if (!mismatches) {
			logger.info(`Lockfile is up to date!`);
			resolutionGraphDiff = {
				graph: lockfile.toResolutionGraph(),
				added: [],
				removed: [],
			};
		} else {
			resolutionGraphDiff = await updateResolutionGraph(
				lockfile.toResolutionGraph(),
				mismatches,
			);
		}
		const missingFromNodeModules = checkNodeModulesState(
			resolutionGraphDiff.graph,
		);
		// do this because checkNodeModulesState might will not register a dep that
		//  already exists but we are moving it from one dep array to another
		resolutionGraphDiff.added = Array.from(
			new Set([...missingFromNodeModules, ...resolutionGraphDiff.added]),
		);
	} else {
		logger.debug(`No lockfile found: Resolving fresh deps.`);

		resolutionGraphDiff = await resolveFreshDeps(deps);
	}

	return resolutionGraphDiff;
};

export const findResolvedVersionFromGraph = (
	graph: ResolutionGraph,
	name: string,
	range: string,
): string | null => {
	for (const pkg of Object.values(graph)) {
		if (pkg.name === name && satisfies(pkg.version, range)) {
			return pkg.version;
		}
	}
	return null;
};

export const resolveDistTags = async (deps: UnResolvedTopLevelPackages) => {
	for (const name of Object.keys(deps)) {
		// biome-ignore lint/style/noNonNullAssertion: looping over keys
		const dep = deps[name]!;
		if (dep.range === "latest") {
			const packageMetadata = await fetchPackageMetadata(name);
			packageMetadataCache[name] = packageMetadata;
			const resolvedVersion = resolvePackageVersion(packageMetadata, dep.range);
			if (!resolvedVersion) {
				throw new Error(`Unable to resolve version ${dep.range} of ${name}`);
			}
			dep.range = resolvedVersion;
		}
	}
};
