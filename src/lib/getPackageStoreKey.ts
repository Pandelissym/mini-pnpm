export const getPackageStoreKey = (name: string, version: string): string => {
	return `${name.replace(/\//g, "+")}@${version}`;
};
