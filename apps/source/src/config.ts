import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

const envFile = resolve(fileURLToPath(new URL("../.env", import.meta.url)));
loadEnv({ path: envFile });

export const sourceConfig = {
  port: Number(process.env.PORT ?? 4300),
  appName: process.env.APP_NAME ?? "AWS-ACCESS-PORTAL",
  collectorHost: process.env.COLLECTOR_HOST ?? "13.233.230.28",
  collectorPort: Number(process.env.COLLECTOR_PORT ?? 514),
  securityGroupName: process.env.SECURITY_GROUP_NAME ?? "web-app-guard",
  awsRegion: process.env.AWS_REGION ?? "ap-south-1",
  vpcId: process.env.VPC_ID ?? "vpc-0674422f23a65f05f",
  collectorInstanceId: process.env.COLLECTOR_INSTANCE_ID ?? "i-0196594d0ab6ada82",
  collectorPrivateIp: process.env.COLLECTOR_PRIVATE_IP ?? "172.31.39.53",
  protectedServiceLabel: process.env.PROTECTED_SERVICE_LABEL ?? "Secure Analytics Workload",
  portalUsername: process.env.PORTAL_USERNAME ?? "viewer",
  portalPassword: process.env.PORTAL_PASSWORD ?? "viewer123",
  protectedFilePath: process.env.PROTECTED_FILE_PATH ?? "/opt/protected-source/secure-workload-note.txt",
  dynamoDbEventsTable: process.env.DYNAMODB_EVENTS_TABLE ?? "cisco-security-events"
};
