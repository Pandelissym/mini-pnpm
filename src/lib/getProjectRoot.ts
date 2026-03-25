import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../constants.js";

export const isValidMiniPnpmDirectory = (): boolean => {
	const currentDir = PROJECT_ROOT;

	const packageJSONPath = path.join(currentDir, "package.json");

	return fs.existsSync(packageJSONPath);
};
