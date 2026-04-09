import { CreateLogStreamCommand, PutLogEventsCommand, CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "../config/env.js";
import { mockLogs } from "../data/mockData.js";

const logsClient = new CloudWatchLogsClient({ region: env.AWS_REGION });
const s3Client = new S3Client({ region: env.AWS_REGION });

function buildRecentLogs() {
  const now = Date.now();
  const oldestOffset = 35 * 60 * 1000;

  return [...mockLogs]
    .reverse()
    .map((log, index, logs) => {
      const step = logs.length > 1 ? (oldestOffset / (logs.length - 1)) * index : 0;
      return {
        ...log,
        timestamp: new Date(now - oldestOffset + step).toISOString()
      };
    })
    .reverse();
}

async function ensureLogStream(logStreamName: string) {
  try {
    await logsClient.send(
      new CreateLogStreamCommand({
        logGroupName: env.CLOUDWATCH_LOG_GROUP,
        logStreamName
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!message.includes("ResourceAlreadyExistsException")) {
      throw error;
    }
  }
}

async function main() {
  const seededLogs = buildRecentLogs().sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const logStreamName = `seed-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  await ensureLogStream(logStreamName);

  await logsClient.send(
    new PutLogEventsCommand({
      logGroupName: env.CLOUDWATCH_LOG_GROUP,
      logStreamName,
      logEvents: seededLogs.map((log) => ({
        timestamp: new Date(log.timestamp).getTime(),
        message: JSON.stringify(log)
      }))
    })
  );

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_ARCHIVE_BUCKET,
      Key: `seed-archives/${logStreamName}.json`,
      Body: JSON.stringify(seededLogs, null, 2),
      ContentType: "application/json"
    })
  );

  console.log(`Seeded ${seededLogs.length} logs into ${env.CLOUDWATCH_LOG_GROUP} and archived them to ${env.S3_ARCHIVE_BUCKET}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
