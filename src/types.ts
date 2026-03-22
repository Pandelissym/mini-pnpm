export type PackageJSON = {
	version: string;
	name: string;
	devDependencies?: Record<string, string>;
	dependencies?: Record<string, string>;
};

export type CliFlags = {
	"save-dev": boolean;
	version: "boolean";
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
};

type RegistryDistObject = {
	shasum: string;
	tarball: string;
	fileCount: number;
	integrity: string;
	unpackedSize: string;
};

export type VersionRange = TagRange | SemVerRange;

export type Operator = "^" | "~" | "exact";

interface BaseRange {
	operator?: Operator;
}

export interface TagRange extends BaseRange {
	tag: "latest";
}

export interface SemVerRange extends BaseRange {
	major: number;
	minor: number;
	patch: number;
}
