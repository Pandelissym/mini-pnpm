import fs from "node:fs";
import { MY_PACKAGE_JSON_PATH } from "../constants.js";

export const printVersion = (): void => {
	if (!fs.existsSync(MY_PACKAGE_JSON_PATH)) {
		console.debug(`No package.json found to read version from`);
		throw new Error(`Error finding version`);
	}

	const packageJsonContents = fs.readFileSync(MY_PACKAGE_JSON_PATH, "utf8");
	const packageJson = JSON.parse(packageJsonContents);

	if (typeof packageJson.version !== "string") {
		console.debug(`Version field of package.json was not string`);
		throw new Error(`Error finding version`);
	}

	console.log(packageJson.version);
};
