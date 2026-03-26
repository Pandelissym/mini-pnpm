import fs from "node:fs";
import path from "node:path";

/**
 * Gets the size of a dir (files and subdirs)
 *
 * NOTE: Can be improved by using the async api
 * @param dir
 * @returns Size of dir files and all subdirs
 */
export const getDirSize = (dir: string): number => {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	let size = 0;

	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			size += getDirSize(entryPath);
		} else {
			size += fs.statSync(entryPath).size;
		}
	}

	return size;
};
