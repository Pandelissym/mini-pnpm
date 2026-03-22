import https from "node:https";
import { REGISTRY_URL } from "../constants.js";
import type { RegistryPackageMetadata, VersionRange } from "../types.js";
import { parseSemVerRange } from "./versionRange.js";

export const fetchPackageMetadata = async (
	name: string,
): Promise<RegistryPackageMetadata> => {
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
	range: VersionRange,
): string | undefined => {
	const availableVersions = Object.keys(packageMetadata.versions);

	if ("tag" in range) {
		switch (range.tag) {
			case "latest":
				return packageMetadata["dist-tags"].latest;
			default:
				return undefined;
		}
	}
	const semverString = `${range.major}.${range.minor}.${range.patch}`;
	if (range.operator === "exact") {
		return packageMetadata.versions[semverString]?.version;
	}
	const parsedAvailableVersions = availableVersions.map(parseSemVerRange);
	if (range.operator === "^") {
		const matchingMajorVersions = parsedAvailableVersions.filter(
			(v) => v.major === range.major,
		);
		const match = matchingMajorVersions[matchingMajorVersions.length - 1];
		if (match) {
			return `${match.major}.${match.minor}.${match.patch}`;
		}
	}

	if (range.operator === "~") {
		const matchingMajorAndMinorVersions = parsedAvailableVersions.filter(
			(v) => v.major === range.major && v.minor === range.minor,
		);
		const match =
			matchingMajorAndMinorVersions[matchingMajorAndMinorVersions.length - 1];
		if (match) {
			return `${match.major}.${match.minor}.${match.patch}`;
		}
	}

	return undefined;
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
