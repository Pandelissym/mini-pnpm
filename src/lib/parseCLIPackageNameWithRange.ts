import type { DependencyType, UnResolvedTopLevelPackages } from "../types.js";

export const parseCLIPackageNameWithRanges = (
	entries: string[],
	dependencyType: DependencyType,
): UnResolvedTopLevelPackages => {
	return Object.fromEntries(
		entries.map((entry) => {
			const { name, range } = parseCLIPackageNameWithRange(entry);
			return [name, { range, type: dependencyType }];
		}),
	);
};

const parseCLIPackageNameWithRange = (
	nameWithRange: string,
): { name: string; range: string } => {
	const lastAtIndex = nameWithRange.lastIndexOf("@");
	let name: string;
	let range: string;

	if (lastAtIndex === -1 || lastAtIndex === 0) {
		name = nameWithRange;
		// if no range specifier is given default to latest
		range = "latest";
	} else {
		name = nameWithRange.slice(0, lastAtIndex);
		range = nameWithRange.slice(lastAtIndex + 1);
	}

	return {
		name,
		range,
	};
};
