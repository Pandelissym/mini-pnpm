import https from "node:https";
import semver from "semver";
import { REGISTRY_URL } from "../constants.js";
import type {
	PackageMetadataCache,
	RegistryPackageMetadata,
} from "../types.js";

export const fetchPackageMetadata = async (
	name: string,
	manifestCache?: PackageMetadataCache,
): Promise<RegistryPackageMetadata> => {
	const cachedManifest = manifestCache?.name;
	if (cachedManifest) {
		return cachedManifest;
	}

	const url = `${REGISTRY_URL}${name}`;
	const response = await fetch(url, {
		headers: {
			Accept:
				"application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
		},
	});

	if (response.status === 404) {
		throw new Error(`Package ${name} not found`);
	}
	const data = await response.json();
	return data;
};

export const resolvePackageVersion = (
	packageMetadata: RegistryPackageMetadata,
	range: string,
): string | undefined => {
	const distTagVersion =
		packageMetadata["dist-tags"][
			range as keyof RegistryPackageMetadata["dist-tags"]
		];
	if (distTagVersion) {
		return distTagVersion;
	}

	const availableVersions = Object.keys(packageMetadata.versions).filter(
		(version) => semver.valid(version),
	);

	const resolved = semver.maxSatisfying(availableVersions, range);
	if (!resolved) {
		return undefined;
	}

	return packageMetadata.versions[resolved]?.version;
};

export const downloadTarball = async (url: string): Promise<Buffer> => {
	return new Promise((resolve, reject) =>
		https
			.get(url, (res) => {
				if (res.statusCode === 302 && res.headers.location) {
					return downloadTarball(res.headers.location)
						.then(resolve)
						.catch(reject);
				}

				const chunks: Buffer[] = [];
				res.on("data", (chunk) => {
					chunks.push(chunk);
				});

				res.on("end", () => resolve(Buffer.concat(chunks)));

				res.on("error", reject);
			})
			.on("error", reject),
	);
};
