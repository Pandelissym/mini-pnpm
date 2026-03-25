import type { IncomingMessage } from "node:http";
import https from "node:https";
import semver from "semver";
import {
	MAX_REDIRECTS,
	REDIRECT_STATUS_CODES,
	REGISTRY_URL,
} from "../constants.js";
import type {
	PackageMetadataCache,
	RegistryPackageMetadata,
} from "../types.js";

export const fetchPackageMetadata = async (
	name: string,
	manifestCache?: PackageMetadataCache,
): Promise<RegistryPackageMetadata> => {
	const cachedManifest = manifestCache?.[name];
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

	if (!response.ok) {
		throw new Error(
			`Error fetching package metadata for ${name}. HTTP ${response.status}`,
		);
	}
	const data = await response.json();
	return data;
};

export const resolvePackageVersion = (
	packageMetadata: RegistryPackageMetadata,
	range: string,
): string | undefined => {
	const distTagVersion = packageMetadata["dist-tags"][range];
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

/**
 * Old version. Uses https.get callback. Not used but left as learning
 * Function got messy and hard to reason about. Converted to promisfied version
 */
export const downloadTarballDeprecated = (
	url: string,
	redirectCount: number = 0,
): Promise<Buffer> => {
	return new Promise((resolve, reject) =>
		https
			.get(url, (res) => {
				const statusCode = res.statusCode ?? 0;
				if (REDIRECT_STATUS_CODES.has(statusCode)) {
					res.resume(); // drain the socket
					if (redirectCount >= MAX_REDIRECTS) {
						reject(new Error(`Too many redirects while downloading ${url}`));
						return;
					}
					if (!res.headers.location) {
						reject(new Error(`Redirect from ${url}  has no Location header`));
						return;
					}
					downloadTarballDeprecated(res.headers.location, redirectCount + 1)
						.then(resolve)
						.catch(reject);
					return;
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

export const downloadTarball = async (
	url: string,
	redirectCount: number = 0,
): Promise<Buffer> => {
	const res = await new Promise<IncomingMessage>((resolve, reject) =>
		https.get(url, resolve).on("error", reject),
	);

	const statusCode = res.statusCode ?? 0;
	if (REDIRECT_STATUS_CODES.has(statusCode)) {
		res.resume(); // drain the socket
		if (redirectCount >= MAX_REDIRECTS) {
			throw new Error(`Too many redirects while downloading ${url}`);
		}
		if (!res.headers.location) {
			throw new Error(`Redirect from ${url}  has no Location header`);
		}
		return downloadTarball(res.headers.location, redirectCount + 1);
	}

	if (statusCode < 200 || statusCode >= 300) {
		res.resume();
		throw new Error(
			`Failed to download tarball from ${url}: HTTP ${statusCode}`,
		);
	}

	return new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		res.on("data", (chunk) => {
			chunks.push(chunk);
		});

		res.on("end", () => resolve(Buffer.concat(chunks)));
		res.on("error", reject);
	});
};
