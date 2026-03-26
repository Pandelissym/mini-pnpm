export const formatBytes = (bytes: number): string => {
	if (bytes < 1000) {
		return `${bytes} B`;
	}

	if (bytes < 1_000_000) {
		return `${(bytes / 1_000).toFixed(1)} KB`;
	}

	if (bytes < 10 ** 9) {
		return `${(bytes / 10 ** 6).toFixed(1)} MB`;
	}

	return `${(bytes / 10 ** 9).toFixed(1)} GB`;
};
