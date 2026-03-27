import type { Lockfile } from "./lib/lockfile.js";

export type ResolvedTopLevelPackages = Record<
	string,
	{ version: string; type: DependencyType }
>;
export type UnResolvedTopLevelPackages = Record<
	string,
	{ range: string; type: DependencyType }
>;

export const DEPENDENCY_TYPES = {
	DEPENDENCIES: "dependencies",
	DEV_DEPENDENCIES: "devDependencies",
} as const;
export type DependencyType =
	(typeof DEPENDENCY_TYPES)[keyof typeof DEPENDENCY_TYPES];

export type ResolutionGraph = Record<string, ResolvedPackage>;
export type ResolvedPackage = {
	name: string;
	version: string;
	tarballUrl: string;
	integrity: string;
	dependencyType: DependencyType | undefined;
	dependencies: Record<string, string>; // name -> exact version
	bin: MergedBin;
};

export type ResolutionGraphDiff = {
	graph: ResolutionGraph;
	removed: { pkg: ResolvedPackage; removalType: PackageRemovalType }[];
	added: ResolvedPackage[];
};

export type PackageResolver = (
	packages: UnResolvedTopLevelPackages,
	lockfile?: Lockfile,
) => Promise<ResolutionGraphDiff>;

export type StoredLockfile = {
	lockfileVersion: number;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	packages: Record<string, LockfileEntry>;
};

export type LockfileEntry = {
	version: string;
	resolved: string;
	integrity: string;
	dependencies?: Record<string, string>;
	bin: MergedBin;
};

export type MergedBin = Record<string, string> | undefined;
export type Bin = MergedBin | string;

export type LockfileTopLevelMismatches = {
	toRemove: {
		name: string;
		version: string;
		dependencyType: DependencyType | undefined;
	}[];
	toAdd: {
		name: string;
		range: string;
		dependencyType: DependencyType;
	}[];
	toFixVersion: {
		name: string;
		version: string;
		range: string;
		dependencyType: DependencyType;
	}[];
};

export type PackageRemovalType = "full" | "only-top-level";
export type CliFlags = {
	"save-dev": boolean;
	version: boolean;
	"log-level": string;
	D: boolean;
	v: boolean;
};

export type CliArgs = CliFlags & {
	_: string[];
};

export type CommandFunction = (
	args: string[],
	flags: CliFlags,
) => Promise<void>;

export type RegistryPackageMetadata = {
	name: string;
	versions: Record<string, RegistryVersionObject>;
	"dist-tags": Record<string, string> & {
		latest: string;
	};
};

type RegistryVersionObject = {
	name: string;
	version: string;
	dist: RegistryDistObject;
	dependencies?: Record<string, string>;
	bin?: Bin;
};

type RegistryDistObject = {
	shasum: string;
	tarball: string;
	fileCount: number;
	integrity: string;
	unpackedSize: number;
};

export type PackageMetadataCache = Record<string, RegistryPackageMetadata>;
