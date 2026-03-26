export type PackageJSON = {
	version: string;
	name: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

export type ResolvedTopLevelPackages = Record<
	string,
	{ version: string; type: DependencyType }
>;
export type UnResolvedTopLevelPackages = Record<
	string,
	{ range: string; type: DependencyType }
>;

export type DependencyType = "dependency" | "devDependency";

export type ResolutionGraph = Record<string, ResolvedPackage>;
export type ResolvedPackage = {
	name: string;
	version: string;
	tarballUrl: string;
	integrity: string;
	dependencyType: DependencyType | undefined;
	dependencies: Record<string, string>; // name -> exact version
};

export type ResolutionGraphDiff = {
	graph: ResolutionGraph;
	removed: { pkg: ResolvedPackage; removalType: PackageRemovalType }[];
	added: ResolvedPackage[];
};

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
};

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
};

type RegistryDistObject = {
	shasum: string;
	tarball: string;
	fileCount: number;
	integrity: string;
	unpackedSize: number;
};

export type PackageMetadataCache = Record<string, RegistryPackageMetadata>;
