import dgram from "node:dgram";

import { sourceConfig } from "../config.js";
import { writeToCloudWatch } from "./cloudwatchLogs.js";

function formatSyslogLine(host: string, message: string) {
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

  return `<166>${timestamp.replace(",", "")} ${host} ${message}`;
}

export async function emitSyslog(message: string) {
  const payload = formatSyslogLine(sourceConfig.appName, message);

  // Send via UDP to the EC2 collector (original path)
  const udpPromise = new Promise<void>((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    const buffer = Buffer.from(payload, "ascii");

    client.send(buffer, sourceConfig.collectorPort, sourceConfig.collectorHost, (error) => {
      client.close();

      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  // Also write directly to CloudWatch (reliable path)
  const cwPromise = writeToCloudWatch(message).catch((error) => {
    console.error("Direct CloudWatch write failed (non-blocking):", error);
  });

  // Wait for both, but don't let either failure block the other
  await Promise.allSettled([udpPromise, cwPromise]);
}
