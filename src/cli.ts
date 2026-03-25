import minimist from "minimist";
import path from "node:path";
import { commands } from "./commands/commands.js";
import { printHelp } from "./lib/help.js";
import { isValidLogLevel, logger } from "./lib/logger.js";
import { printVersion } from "./lib/version.js";
import type { CliArgs } from "./types.js";
import "./constants.js";

const cli = async () => {
	const options: minimist.Opts = {
		alias: {
			D: "save-dev",
			v: "version",
		},
		boolean: ["version", "save-dev"],
		string: ["log-level"],
		default: {
			"log-level": "info",
		},
	};

	const { _: args, ...flags } = minimist(
		process.argv.slice(2),
		options,
	) as CliArgs;

	if (flags.version) {
		printVersion(path.join(process.cwd(), "package.json"));
		process.exit(0);
	}

	const logLevel = flags["log-level"];
	if (logLevel) {
		if (!isValidLogLevel(logLevel)) {
			throw new Error(
				`Argument passed for log-level: ${logLevel} is not a valid option`,
			);
		}
		logger.setLogLevel(logLevel);
	}

	const command = args[0];

	if (!command) {
		printHelp();
		process.exit(1);
	}
	const commandFunction = commands[command];

	if (!commandFunction) {
		console.error("Command doesn't exist.");
		process.exit(1);
	}
	await commandFunction(args.slice(1), flags);
};

cli().catch((error) => {
	if (error instanceof Error) {
		console.error(error.message);
	} else {
		console.error("Unexpected error");
	}
	process.exit(1);
});
