type ProgressBar = {
	tick: () => void;
};

const BAR_SIZE = 30;

export const createProgressBar = (
	total: number,
	label: string,
	silent: boolean,
): ProgressBar => {
	let current = 0;

	const draw = () => {
		if (silent) {
			return;
		}
		const progress = Math.floor((current / total) * BAR_SIZE);
		const bar = "￭".repeat(progress) + "･".repeat(BAR_SIZE - progress);

		process.stdout.write(`\r\x1b[K  ${label} [${bar}] ${current}/${total}`);
		if (current === total) {
			console.log();
		}
	};

	return {
		tick: () => {
			current++;
			draw();
		},
	};
};

export const createProgressIndicator = (label: string, silent: boolean) => {
	let current = 0;

	const draw = () => {
		if (silent) {
			return;
		}
		process.stdout.write(`\r\x1b[K  ${label}  ${current}`);
	};

	return {
		tick: () => {
			current++;
			draw();
		},
		end: () => {
			console.log();
		},
	};
};
