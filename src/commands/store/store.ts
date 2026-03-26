import type { CommandFunction } from "../../types.js";
import { storeStatusCommand } from "./storeStatus.js";

const subCommands = {
	status: storeStatusCommand,
} as const;

type StoreCommandArgs = {
	subcommand: keyof typeof subCommands;
};

export const storeCommandHandler: CommandFunction = async (args, _flags) => {
	const { subcommand } = parseStoreCommandArgs(args);

	subCommands[subcommand]();
};

const parseStoreCommandArgs = (args: string[]): StoreCommandArgs => {
	const subcommand = args[0];

	if (!subcommand) {
		throw new Error("No subcommand specified");
	}
	if (subcommand !== "status") {
		throw new Error("Invalid subcommand");
	}

	return { subcommand };
};
