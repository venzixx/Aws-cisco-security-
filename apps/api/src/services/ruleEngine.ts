import type { DashboardPayload, DeviceSummary, MetricPoint, NetworkLog, SecurityAlert, SecurityEvent, Severity } from "@monitoring/shared";

interface AlertSeed {
  title: string;
  severity: Severity;
  deviceName: string;
  detectedAt: string;
  ruleId: string;
  description: string;
  suggestions: SecurityAlert["suggestions"];
}

function createAlert(id: string, seed: AlertSeed): SecurityAlert {
  return {
    id,
    status: "open",
    ...seed
  };
}

function buildFailedLoginAlerts(logs: NetworkLog[]) {
  const authLogs = logs.filter((log) => log.category === "auth");
  const groups = new Map<string, NetworkLog[]>();

  for (const log of authLogs) {
    const key = `${log.deviceName}:${log.sourceIp}`;
    const list = groups.get(key) ?? [];
    list.push(log);
    groups.set(key, list);
  }

  return Array.from(groups.values())
    .filter((group) => group.length >= 3)
    .map((group, index) =>
      createAlert(`auth-burst-${index + 1}`, {
        title: "Repeated management login failures",
        severity: "high",
        deviceName: group[0].deviceName,
        detectedAt: group[group.length - 1].timestamp,
        ruleId: "auth-failed-burst",
        description: `${group.length} failed login attempts were observed from ${group[0].sourceIp} against ${group[0].deviceName}.`,
        suggestions: [
          {
            title: "Restrict access",
            action: `Limit management access to trusted IP ranges and review whether ${group[0].sourceIp} should be blocked.`
          },
          {
            title: "Review AAA policy",
            action: "Verify MFA, lockout thresholds, and local fallback accounts for the affected management plane."
          }
        ]
      })
    );
}

function buildAclBurstAlerts(logs: NetworkLog[]) {
  const aclLogs = logs.filter((log) => log.category === "acl");
  const groups = new Map<string, NetworkLog[]>();

  for (const log of aclLogs) {
    const key = `${log.deviceName}:${log.sourceIp}:${log.destinationIp}`;
    const list = groups.get(key) ?? [];
    list.push(log);
    groups.set(key, list);
  }

  return Array.from(groups.values())
    .filter((group) => group.length >= 2)
    .map((group, index) =>
      createAlert(`acl-burst-${index + 1}`, {
        title: "Repeated blocked access pattern",
        severity: "critical",
        deviceName: group[0].deviceName,
        detectedAt: group[group.length - 1].timestamp,
        ruleId: "acl-deny-burst",
        description: `${group.length} denied connection attempts were blocked from ${group[0].sourceIp} toward ${group[0].destinationIp}.`,
        suggestions: [
          {
            title: "Confirm policy",
            action: "Verify the deny rule is intentional and that no alternate exposure exists for the protected destination."
          },
          {
            title: "Investigate destination",
            action: `Check the target host ${group[0].destinationIp} for suspicious inbound activity and corresponding endpoint logs.`
          }
        ]
      })
    );
}

function buildTrafficAlerts(logs: NetworkLog[]) {
  return logs
    .filter((log) => log.category === "traffic")
    .map((log, index) =>
      createAlert(`traffic-threshold-${index + 1}`, {
        title: "Traffic threshold exceeded",
        severity: log.severity === "high" ? "high" : "medium",
        deviceName: log.deviceName,
        detectedAt: log.timestamp,
        ruleId: "traffic-threshold",
        description: `${log.deviceName} reported traffic above the expected threshold from ${log.sourceIp} to ${log.destinationIp}.`,
        suggestions: [
          {
            title: "Validate workload",
            action: "Compare the spike against approved backup, synchronization, or patching schedules."
          }
        ]
      })
    );
}

export function buildAlertsFromLogs(logs: NetworkLog[]) {
  return [...buildFailedLoginAlerts(logs), ...buildAclBurstAlerts(logs), ...buildTrafficAlerts(logs)].sort((left, right) =>
    right.detectedAt.localeCompare(left.detectedAt)
  );
}

export function buildTrafficSeries(logs: NetworkLog[]): MetricPoint[] {
  const buckets = new Map<string, MetricPoint>();

  for (const log of logs) {
    const date = new Date(log.timestamp);
    date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 5) * 5, 0, 0);
    const bucketKey = date.toISOString();
    const bucket = buckets.get(bucketKey) ?? {
      timestamp: bucketKey,
      totalLogs: 0,
      deniedConnections: 0,
      failedLogins: 0
    };

    bucket.totalLogs += 1;

    if (log.category === "acl") {
      bucket.deniedConnections += 1;
    }

    if (log.category === "auth") {
      bucket.failedLogins += 1;
    }

    buckets.set(bucketKey, bucket);
  }

  return Array.from(buckets.values()).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function buildDashboardPayload({
  region,
  mode,
  devices,
  logs,
  events
}: {
  region: string;
  mode: DashboardPayload["mode"];
  devices: DeviceSummary[];
  logs: NetworkLog[];
  events: SecurityEvent[];
}): DashboardPayload {
  const alerts = buildAlertsFromLogs(logs);
  const traffic = buildTrafficSeries(logs);

  return {
    generatedAt: new Date().toISOString(),
    region,
    mode,
    overview: {
      totalLogs: logs.length,
      highSeverityAlerts: alerts.filter((alert) => alert.severity === "high" || alert.severity === "critical").length,
      blockedAttempts: logs.filter((log) => log.category === "acl").length,
      activeDevices: devices.length,
      structuredEvents: events.length
    },
    devices,
    alerts,
    logs: [...logs].sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
    traffic,
    events: [...events].sort((left, right) => right.timestamp.localeCompare(left.timestamp))
  };
}
