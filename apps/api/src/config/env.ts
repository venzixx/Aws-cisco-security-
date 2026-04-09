import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { z } from "zod";

const envFile = resolve(fileURLToPath(new URL("../../.env", import.meta.url)));
loadEnv({ path: envFile });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  AWS_REGION: z.string().default("ap-south-1"),
  DATA_MODE: z.enum(["mock", "aws"]).default("mock"),
  CLOUDWATCH_LOG_GROUP: z.string().default("/cisco/secure-monitoring/logs"),
  S3_ARCHIVE_BUCKET: z.string().default("cisco-secure-monitoring-961457613870-ap-south-1"),
  AWS_LOOKBACK_HOURS: z.coerce.number().int().positive().default(24),
  DYNAMODB_EVENTS_TABLE: z.string().default("cisco-security-events")
});

export const env = envSchema.parse(process.env);
