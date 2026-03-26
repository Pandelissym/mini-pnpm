import type { CommandFunction } from "../types.js";
import { addCommand } from "./add.js";
import { installCommand } from "./install.js";
import { removeCommand } from "./remove.js";
import { storeCommandHandler } from "./store/store.js";

export const commands: Record<string, CommandFunction> = {
	install: installCommand,
	add: addCommand,
	remove: removeCommand,
	store: storeCommandHandler,
};
