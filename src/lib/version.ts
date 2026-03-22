import pjson from "../../package.json" with { type: "json" };

export const printVersion = () => {
	console.log(pjson.version);
};
