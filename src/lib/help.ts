import { logger } from "./logger.js";

const helpMessage = `
mini-pnpm - a tiny package manager

Usage:

Flags:
`;

export const printHelp = () => {
	logger.info(helpMessage);
};
