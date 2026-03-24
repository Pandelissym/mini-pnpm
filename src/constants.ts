import os from "node:os";
import path from "node:path";

export const REGISTRY_URL = "https://registry.npmjs.org/";
export const GLOBAL_STORE_PATH = path.join(os.homedir(), ".mini-pnpm-store");

export const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
export const MAX_REDIRECTS = 5;