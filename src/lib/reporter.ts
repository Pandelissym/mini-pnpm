import type { ResolutionGraphDiff } from "../types.js";

export type Reporter = {
	reportPostInstall: (
		added: ResolutionGraphDiff["added"],
		removed: ResolutionGraphDiff["removed"],
	) => void;
};

export const reporter: Reporter = {
	reportPostInstall: (added, removed) => {
		const depRemoves = removed
			.filter(({ pkg }) => pkg.dependencyType === "dependencies")
			.map(({ pkg }) => `  - ${pkg.name}@${pkg.version}`)
			.join("\n");
		const depAdds = added
			.filter((pkg) => pkg.dependencyType === "dependencies")
			.map((pkg) => `  + ${pkg.name}@${pkg.version}`)
			.join("\n");
		const devDepRemoves = removed
			.filter(({ pkg }) => pkg.dependencyType === "devDependencies")
			.map(({ pkg }) => `  - ${pkg.name}@${pkg.version}`)
			.join("\n");
		const devDepAdds = added
			.filter((pkg) => pkg.dependencyType === "devDependencies")
			.map((pkg) => `  + ${pkg.name}@${pkg.version}`)
			.join("\n");

		if (depRemoves || depAdds) {
			console.log();
			console.log("dependencies");
			console.log(
				`${depRemoves}${depRemoves.length && depAdds.length ? "\n" : ""}${depAdds}`,
			);
			console.log();
		}
		if (devDepAdds || devDepRemoves) {
			console.log("devDependencies");
			console.log(
				`${devDepRemoves}${devDepRemoves.length && devDepAdds.length ? "\n" : ""}${devDepAdds}`,
			);
		}
	},
};
