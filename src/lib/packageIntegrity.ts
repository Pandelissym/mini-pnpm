import crypto from "node:crypto";

export const verifyIntegrity = (data: Buffer, integrity: string) => {
	const [algorithm, expectedHash] = integrity.split("-");

	if (!algorithm || !expectedHash) {
		throw new Error("Could not verify integrity of package");
	}
	const hash = crypto.createHash(algorithm).update(data).digest("base64");

	return hash === expectedHash;
};
