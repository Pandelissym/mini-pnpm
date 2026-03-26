import type {
	ResolutionGraphDiff,
	UnResolvedTopLevelPackages,
} from "../types.js";
import { downloadPackages } from "./downloadPackages.js";
import { deletePackages, linkPackages } from "./linker.js";
import type { Lockfile } from "./lockfile.js";
import { reporter } from "./reporter.js";
import { resolvePackages } from "./resolver.js";
import { globalStore } from "./store.js";

export const resolveAndInstallWorkflow = async (
	pkgs: UnResolvedTopLevelPackages,
	lockfile?: Lockfile,
): Promise<ResolutionGraphDiff> => {
	const resolutionGraphDiff = await resolvePackages(pkgs, lockfile);
	const { added, removed } = resolutionGraphDiff;

	deletePackages(removed);

	await downloadPackages(added, globalStore);

	linkPackages(added);

	reporter.reportPostInstall(added, removed);

	return resolutionGraphDiff;
};
