import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

const envFile = resolve(fileURLToPath(new URL("../.env", import.meta.url)));
loadEnv({ path: envFile });

export const simulatorConfig = {
  port: Number(process.env.PORT ?? 4400),
  sourceBaseUrl: process.env.SOURCE_BASE_URL ?? "http://127.0.0.1:4300"
};
