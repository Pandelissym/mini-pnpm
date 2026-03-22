import minimist from "minimist";
import { commands } from "./commands/commands.js";
import { printHelp } from "./lib/help.js";
import { printVersion } from "./lib/version.js";
import type { CliArgs } from "./types.js";

const cli = async () => {
	const options: minimist.Opts = {
		alias: {
			D: "save-dev",
			v: "version",
		},
		boolean: ["version", "save-dev"],
	};

	const { _: args, ...flags } = minimist(
		process.argv.slice(2),
		options,
	) as CliArgs;

	if (flags.version) {
		printVersion();
		process.exit(0);
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
