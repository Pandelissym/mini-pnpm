const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GRAY = "\x1b[90m";

const LOG_LEVELS = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

function createLogger(level: LogLevel = "info") {
	let configuredLevel = level;

	const shouldLog = (level: LogLevel): boolean => {
		return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
	};

	return {
		setLogLevel: (level: LogLevel) => {
			configuredLevel = level;
		},
		info: (msg: string): void => {
			if (shouldLog("info")) {
				console.log(`${GREEN}info${RESET}  ${msg}`);
			}
		},
		warn: (msg: string): void => {
			if (shouldLog("warn")) {
				console.log(`${YELLOW}warn${RESET}  ${msg}`);
			}
		},
		error: (msg: string): void => {
			if (shouldLog("error")) {
				console.error(`${RED}error${RESET}  ${msg}`);
			}
		},
		debug: (msg: string): void => {
			if (shouldLog("debug")) {
				console.log(`${GRAY}debug${RESET}  ${msg}`);
			}
		},
	};
}

export const logger = createLogger();
