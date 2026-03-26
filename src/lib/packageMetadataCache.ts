import type {
	PackageMetadataCache,
	RegistryPackageMetadata,
} from "../types.js";

const packageMetadataCache: PackageMetadataCache = {};

export const addToPackageMetadataCache = (
	key: string,
	value: RegistryPackageMetadata,
): void => {
	packageMetadataCache[key] = value;
};

export const getPackageMetadataFromCache = (
	key: string,
): RegistryPackageMetadata | undefined => {
	return packageMetadataCache[key];
};
