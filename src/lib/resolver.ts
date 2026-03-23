import { satisfies } from "semver";
import type { PackageMetadataCache } from "../types.js";
import { logger } from "./logger.js";
import { fetchPackageMetadata, resolvePackageVersion } from "./registry.js";

export type ResolutionGraph = Record<string, ResolvedPackage>;
export type ResolvedPackage = {
	name: string;
	version: string;
	tarballUrl: string;
	integrity: string;
	size: number;
	isTopLevelDep: boolean | undefined;
	requestedRange: string;
	rawDependencies: Record<string, string>; // name -> version range (like package.json)
	dependencies: Record<string, string>; // name -> exact version
};

export type RootDependencies = Record<string, string>; // name -> version range

export const resolveDeps = async (
	deps: RootDependencies,
): Promise<ResolutionGraph> => {
	const graph: ResolutionGraph = {};
	const packageMetadataCache: PackageMetadataCache = {};

	const queue: Array<{ name: string; range: string; isTopLevelDep?: boolean }> =
		Object.entries(deps).map(([name, range]) => ({
			name,
			range,
			isTopLevelDep: true,
		}));

	const queueEntries = new Set<string>(
		queue.map((entry) => `${entry.name}@${entry.range}`),
	);

	while (queue.length) {
		// biome-ignore lint/style/noNonNullAssertion: since we know queue is not empty we force
		const { name, range, isTopLevelDep } = queue.shift()!;
		queueEntries.delete(`${name}@${range}`);

		// resolve this package
		logger.debug(`Resolving package ${name} with range ${range}`);
		const packageMetadata = await fetchPackageMetadata(
			name,
			packageMetadataCache,
		);
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

		let requestedRange = range;
		if (range === "latest") {
			requestedRange = `^${resolvedVersion}`;
		}
		// add to graph
		const key = `${name}@${resolvedVersion}`;
		graph[key] = {
			name,
			version: resolvedVersion,
			isTopLevelDep,
			requestedRange,
			tarballUrl: packageVersionObject.dist.tarball,
			size: parseInt(packageVersionObject.dist.unpackedSize, 10),
			integrity: packageVersionObject.dist.integrity,
			rawDependencies: packageVersionObject.dependencies ?? {},
			dependencies: {}, // we don't know exact versions yet so we when we have resolved those
		};

		// add all subdeps to queue
		const deps = packageVersionObject.dependencies || {};
		for (const [depName, depRange] of Object.entries(deps)) {
			// package already resolved so we can skip
			if (findResolvedVersionFromGraph(graph, depName, depRange)) {
				continue;
			}

			if (!queueEntries.has(`${depName}@${depRange}`)) {
				queue.push({
					name: depName,
					range: depRange,
				});
				queueEntries.add(`${depName}@${depRange}`);
			}
		}

		logger.debug("");
	}

	// TODO: engines check?

	console.log("setting deps versions in graph");
	// go over graph and set the correct dependency versions in each resolved object
	for (const resolvedPackage of Object.values(graph)) {
		const deps = resolvedPackage.rawDependencies;

		if (!Object.keys(deps).length) {
			continue;
		}

		for (const [depName, depVersionRange] of Object.entries(deps)) {
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
	return graph;
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
