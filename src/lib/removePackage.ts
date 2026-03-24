import { removeFromVirtualStore, removeTopLevelSymLink } from "./linker.js";

export const removePackage = (pkgKey: string): void => {
	removeTopLevelSymLink(pkgKey);
	removeFromVirtualStore(pkgKey);
};
