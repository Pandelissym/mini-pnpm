export type PackageJSON = {
	version: string;
	name: string;
	devDependencies?: DepMap;
	dependencies?: DepMap;
};

export type DepMap = Record<string, string>;

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
	"dist-tags": {
		next: string;
		alpha: string;
		beta: string;
		latest: string;
		canary: string;
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
	unpackedSize: string;
};

export type PackageMetadataCache = Record<string, RegistryPackageMetadata>;
