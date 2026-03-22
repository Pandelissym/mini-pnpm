export const getPackageStoreKey = (name: string): string => {
	return name.replace(/\//g, "+");
};
