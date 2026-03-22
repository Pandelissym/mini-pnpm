import type { Operator, SemVerRange, VersionRange } from "../types.js";

const VERSION_REGEX =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const parseSemVerRange = (range: string): SemVerRange => {
	let operator: Operator;
	if (range[0] === "^") {
		operator = "^";
	} else if (range[0] === "~") {
		operator = "~";
	} else {
		operator = "exact";
	}
	const rawSemver = operator === "exact" ? range : range.slice(1);
	const matches = rawSemver.match(VERSION_REGEX);
	if (!matches) {
		throw new Error("Invalid SemVer specifier");
	}
	const major = matches[1];
	const minor = matches[2];
	const patch = matches[3];

	if (!major || !minor || !patch) {
		throw new Error("Invalid SemVer specifier");
	}

	return {
		operator,
		major: parseInt(major, 10),
		minor: parseInt(minor, 10),
		patch: parseInt(patch, 10),
	};
};

export const versionRangeToString = (
	range: VersionRange,
	resolvedVersion: string,
): string => {
	if ("tag" in range) {
		return `${range.operator}${resolvedVersion}`;
	}

	const baseVersion = `${range.major}.${range.minor}.${range.patch}`;
	if (range.operator === "exact") {
		return baseVersion;
	}

	return `${range.operator}${baseVersion}`;
};
