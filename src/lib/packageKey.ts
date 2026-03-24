/**
 * Converts .pnpm style keys to graph style keys
 * .pnpm keys are name@version where any / in the name are changed to +
 * graph keys are the name of the package (without the / to + replacement) and @version
 * @param key
 */
export const pnpmVirtualStoreKeyToPackageKey = (key: string): string => {
	const [name, version] = splitStringByLastAt(key);
	const originalName = name.replace("+", "/");
	return `${originalName}@${version}`;
};

export const pkgKeyToPnpmVirtualStoreKey = (key: string): string => {
	const [name, version] = splitStringByLastAt(key);
	return getPackageStoreKey(name, version);
};

export const getPackageStoreKey = (name: string, version: string): string => {
	return `${name.replace(/\//g, "+")}@${version}`;
};

export const splitStringByLastAt = (key: string): [string, string] => {
	const lastAtIndex = key.lastIndexOf("@");
	const first = key.slice(0, lastAtIndex);
	const second = key.slice(lastAtIndex + 1);
	return [first, second];
};
