import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeLogStreamsCommand
} from "@aws-sdk/client-cloudwatch-logs";

import { sourceConfig } from "../config.js";

const LOG_GROUP = "/cisco/secure-monitoring/logs";

const cwlClient = new CloudWatchLogsClient({ region: sourceConfig.awsRegion });

let logStreamName: string | null = null;
let sequenceToken: string | undefined;

async function ensureLogStream() {
  if (logStreamName) return logStreamName;

  const streamName = `source-direct-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  try {
    await cwlClient.send(
      new CreateLogStreamCommand({
        logGroupName: LOG_GROUP,
        logStreamName: streamName
      })
    );
  } catch (error: any) {
    // ResourceAlreadyExistsException is fine
    if (error.name !== "ResourceAlreadyExistsException") {
      console.error("Failed to create log stream:", error.message);
      throw error;
    }
  }

  logStreamName = streamName;
  return streamName;
}

/**
 * Writes a syslog-formatted message directly to CloudWatch Logs
 * alongside the existing UDP syslog path (which goes via rsyslog on EC2).
 */
export async function writeToCloudWatch(message: string) {
  try {
    const stream = await ensureLogStream();

    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC"
    });

    const syslogLine = `<166>${timestamp.replace(",", "")} ${sourceConfig.appName} ${message}`;

    const response = await cwlClient.send(
      new PutLogEventsCommand({
        logGroupName: LOG_GROUP,
        logStreamName: stream,
        logEvents: [
          {
            timestamp: Date.now(),
            message: syslogLine
          }
        ],
        sequenceToken
      })
    );

    sequenceToken = response.nextSequenceToken;
  } catch (error: any) {
    // If sequence token is invalid, reset and retry once
    if (error.name === "InvalidSequenceTokenException") {
      sequenceToken = error.expectedSequenceToken;

      try {
        const stream = await ensureLogStream();
        const response = await cwlClient.send(
          new PutLogEventsCommand({
            logGroupName: LOG_GROUP,
            logStreamName: stream,
            logEvents: [
              {
                timestamp: Date.now(),
                message: message
              }
            ],
            sequenceToken
          })
        );
        sequenceToken = response.nextSequenceToken;
      } catch (retryError) {
        console.error("CloudWatch retry failed:", retryError);
      }
    } else {
      console.error("CloudWatch write failed:", error.message);
    }
  }
}
