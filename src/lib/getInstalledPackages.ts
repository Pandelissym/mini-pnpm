import fs from "node:fs";
import path from "node:path";
import { pnpmVirtualStoreKeyToPackageKey } from "./packageKey.js";

export const getInstalledPackages = (): string[] => {
	const virtualStoreDir = path.join(process.cwd(), "node_modules", ".pnpm");

	if (!fs.existsSync(virtualStoreDir)) {
		return [];
	}
	const packages = fs
		.readdirSync(virtualStoreDir)
		.map((key) => pnpmVirtualStoreKeyToPackageKey(key));

	return packages;
};
