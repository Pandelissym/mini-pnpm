import { describe, expect, it } from "vitest";
import {
	parseSemVerString,
	parseVersionRange,
	satisfies,
} from "../../src/lib/versionRange.js";
import type { SemVer, VersionRange } from "../../src/types.js";

describe("parseSemVerString", () => {
	it("should parse semver with prerelease", () => {
		const semver = "5.0.0-beta.19";
		const result = parseSemVerString(semver);

		expect(result).toEqual({
			major: 5,
			minor: 0,
			patch: 0,
			preReleaseVersion: "beta.19",
		} as SemVer);
	});
});

describe("parseVersionRange", () => {
	it("should ignore multiple semver parts and parse first one", () => {
		const range = "^5.0.0-beta.19 || 5.0.0";
		const result = parseVersionRange(range);

		expect(result).toEqual({
			operator: "^",
			major: 5,
			minor: 0,
			patch: 0,
			preReleaseVersion: "beta.19",
		} as VersionRange);
	});
	it("should parse semver with only major part", () => {
		const range = "1";
		const result = parseVersionRange(range);

		expect(result).toEqual({
			operator: "exact",
			major: 1,
			minor: 0,
			patch: 0,
		} as VersionRange);
	});
});

describe("satisfies", () => {
	it("should ignore multiple semver parts and parse first one", () => {
		const range = "1.0.0";
		const version = "1.0.0";
		const result = satisfies(range, version);

		expect(result).toBe(true);
	});
});
satisfies;
