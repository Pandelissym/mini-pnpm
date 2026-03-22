import fs from "node:fs";
import path from "node:path";

export const isValidMiniPnpmDirectory = () => {
	const currentDir = process.cwd();

	const packageJSONPath = path.join(currentDir, "package.json");

	return fs.existsSync(packageJSONPath);
};
