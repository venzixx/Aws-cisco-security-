import { FilterLogEventsCommand, type FilteredLogEvent, CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import type { DeviceSummary, NetworkLog } from "@monitoring/shared";

import { env } from "../config/env.js";

const logsClient = new CloudWatchLogsClient({ region: env.AWS_REGION });
const s3Client = new S3Client({ region: env.AWS_REGION });

function inferDeviceType(deviceId: string): DeviceSummary["type"] {
  const normalized = deviceId.toLowerCase();

  if (normalized.startsWith("fw")) {
    return "firewall";
  }

  if (normalized.startsWith("sw")) {
    return "switch";
  }

  if (normalized.startsWith("collector")) {
    return "collector";
  }

  return "router";
}

function inferSeverity(raw: string): NetworkLog["severity"] {
  const match = raw.match(/%[A-Z0-9_-]+-(\d)-/i);
  const level = match ? Number(match[1]) : undefined;

  if (level !== undefined) {
    if (level <= 3) {
      return "critical";
    }

    if (level === 4) {
      return "high";
    }

    if (level === 5) {
      return "medium";
    }
  }

  if (/deny|blocked|failed|rejected/i.test(raw)) {
    return "high";
  }

  return "low";
}

function inferCategory(raw: string): NetworkLog["category"] {
  if (/login|authentication|aaa|ssh|vpn portal|rejected/i.test(raw)) {
    return "auth";
  }

  if (/access-list|deny tcp|deny udp|106023|106100/i.test(raw)) {
    return "acl";
  }

  if (/config_i|configured from|configuration/i.test(raw)) {
    return "config";
  }

  if (/traffic rate|bandwidth|throughput|interface .*threshold/i.test(raw)) {
    return "traffic";
  }

  return "system";
}

function extractSourceDestination(raw: string) {
  const denyPattern = /src [^:]+:([0-9.]+)\/\d+ dst [^:]+:([0-9.]+)\/\d+/i;
  const arrowPattern = /([0-9.]+)\(\d+\)\s*->\s*[^/]+\/([0-9.]+)\(\d+\)/i;
  const vpnPattern = /IP[ =<]+([0-9.]+)[ >]/i;

  const denyMatch = raw.match(denyPattern);

  if (denyMatch) {
    return {
      sourceIp: denyMatch[1],
      destinationIp: denyMatch[2]
    };
  }

  const arrowMatch = raw.match(arrowPattern);

  if (arrowMatch) {
    return {
      sourceIp: arrowMatch[1],
      destinationIp: arrowMatch[2]
    };
  }

  const vpnMatch = raw.match(vpnPattern);

  if (vpnMatch) {
    return {
      sourceIp: vpnMatch[1],
      destinationIp: "0.0.0.0"
    };
  }

  return {
    sourceIp: "0.0.0.0",
    destinationIp: "0.0.0.0"
  };
}

function parseRawSyslogLine(event: FilteredLogEvent): NetworkLog | null {
  if (!event.message) {
    return null;
  }

  const raw = event.message.trim();
  const match =
    raw.match(/^(?<timestamp>[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(?<host>\S+)\s+(?<message>.+)$/) ??
    raw.match(/^(?<timestamp>\d{4}-\d{2}-\d{2}T\S+)\s+(?<host>\S+)\s+(?<message>.+)$/);

  const host = match?.groups?.host ?? "collector-unknown";
  const message = match?.groups?.message ?? raw;
  const rawTimestamp = match?.groups?.timestamp;
  const timestamp =
    rawTimestamp && /^[A-Z][a-z]{2}/.test(rawTimestamp)
      ? new Date(`${new Date().getUTCFullYear()} ${rawTimestamp} UTC`).toISOString()
      : rawTimestamp
        ? new Date(rawTimestamp).toISOString()
        : new Date(event.timestamp ?? Date.now()).toISOString();
  const ips = extractSourceDestination(message);

  return {
    id: event.eventId ?? `event-${event.timestamp ?? Date.now()}`,
    timestamp,
    deviceId: host.toLowerCase(),
    deviceName: host.toUpperCase(),
    severity: inferSeverity(message),
    category: inferCategory(message),
    sourceIp: ips.sourceIp,
    destinationIp: ips.destinationIp,
    message,
    raw
  };
}

function parseCloudWatchEvent(event: FilteredLogEvent): NetworkLog | null {
  if (!event.message) {
    return null;
  }

  try {
    const parsed = JSON.parse(event.message) as NetworkLog;

    if (!parsed.id || !parsed.timestamp || !parsed.deviceId || !parsed.deviceName || !parsed.message) {
      return null;
    }

    return parsed;
  } catch {
    return parseRawSyslogLine(event);
  }
}

export async function fetchAwsLogs(limit = 200): Promise<NetworkLog[]> {
  const events: NetworkLog[] = [];
  let nextToken: string | undefined;
  const startTime = Date.now() - env.AWS_LOOKBACK_HOURS * 60 * 60 * 1000;

  while (events.length < limit) {
    const response = await logsClient.send(
      new FilterLogEventsCommand({
        logGroupName: env.CLOUDWATCH_LOG_GROUP,
        startTime,
        limit: Math.min(50, limit - events.length),
        nextToken
      })
    );

    for (const event of response.events ?? []) {
      const parsed = parseCloudWatchEvent(event);

      if (parsed) {
        events.push(parsed);
      }
    }

    if (!response.nextToken || response.nextToken === nextToken) {
      break;
    }

    nextToken = response.nextToken;
  }

  return events.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function deriveDevices(logs: NetworkLog[]): DeviceSummary[] {
  const devices = new Map<string, DeviceSummary>();

  for (const log of logs) {
    if (devices.has(log.deviceId)) {
      const current = devices.get(log.deviceId)!;
      current.lastSeen = current.lastSeen > log.timestamp ? current.lastSeen : log.timestamp;

      if (log.severity === "critical") {
        current.health = "critical";
      } else if (log.severity === "high" && current.health === "healthy") {
        current.health = "warning";
      }

      continue;
    }

    devices.set(log.deviceId, {
      id: log.deviceId,
      name: log.deviceName,
      type: inferDeviceType(log.deviceId),
      location: "AWS-connected source",
      lastSeen: log.timestamp,
      health: log.severity === "critical" ? "critical" : log.severity === "high" ? "warning" : "healthy"
    });
  }

  devices.set("archive-bucket", {
    id: "archive-bucket",
    name: "S3-ARCHIVE",
    type: "collector",
    location: env.S3_ARCHIVE_BUCKET,
    lastSeen: new Date().toISOString(),
    health: "healthy"
  });

  return Array.from(devices.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export async function countArchiveObjects() {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: env.S3_ARCHIVE_BUCKET,
      MaxKeys: 20
    })
  );

  return response.KeyCount ?? 0;
}
