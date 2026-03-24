import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { GLOBAL_STORE_PATH } from "../constants.js";

/**
 * The name, linkname, magic, uname, and gname are null-terminated character strings.
 * All other fields are zero-filled octal numbers in ASCII
 */

export const extractTarball = (data: Buffer, destDir: string) => {
	const gunzipped = zlib.gunzipSync(data);

	let offset = 0;

	while (offset < gunzipped.length - 512 * 2) {
		const header = gunzipped.subarray(offset, offset + 512);
		const fileName = header
			.subarray(0, 100)
			.toString("utf8")
			.replace(/\0*$/, "");

		// Two consecutive empty headers signal the end of the archive
		if (!fileName) {
			break;
		}
		const size = parseInt(header.subarray(124, 124 + 12).toString("utf8"), 8);

		const type = header.subarray(156, 156 + 1).toString("utf8");

		const filePath = path.join(destDir, fileName.replace(/^package\//, ""));

		// skip entire header
		offset += 512;
		if (type === "0" || type === "") {
			// file
			fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, gunzipped.subarray(offset, offset + size), {});
		} else if (type === "5") {
			// dir
			fs.mkdirSync(filePath, { recursive: true });
		} else {
			throw new Error(
				`Parsing tarball error: Encountered object of type ${type} which the parser does not support currently.`,
			);
		}
		offset += Math.ceil(size / 512) * 512;
	}
};

export const storePackage = (pkgStoreKey: string, data: Buffer): void => {
	const destDir = `${GLOBAL_STORE_PATH}/${pkgStoreKey}`;

	if (fs.existsSync(destDir)) {
		return;
	}

	const tempDir = `${GLOBAL_STORE_PATH}/.temp-${pkgStoreKey}`;
	fs.mkdirSync(tempDir, { recursive: true });

	extractTarball(data, tempDir);

	fs.renameSync(tempDir, destDir);
};

export const isInStore = (name: string): boolean => {
	const packageDir = `${GLOBAL_STORE_PATH}/${name}`;

	return fs.existsSync(packageDir);
};
