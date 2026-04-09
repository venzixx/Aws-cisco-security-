import { env } from "../config/env.js";
import { mockDevices, mockLogs } from "../data/mockData.js";
import { deriveDevices, fetchAwsLogs } from "./awsDataSource.js";
import { fetchSecurityEvents } from "./securityEventsDataSource.js";
import { buildDashboardPayload } from "./ruleEngine.js";

export async function getDashboardPayload() {
  if (env.DATA_MODE === "aws") {
    const [logs, events] = await Promise.all([fetchAwsLogs(), fetchSecurityEvents()]);

    return buildDashboardPayload({
      region: env.AWS_REGION,
      mode: "aws",
      devices: deriveDevices(logs),
      logs,
      events
    });
  }

  return buildDashboardPayload({
    region: env.AWS_REGION,
    mode: "mock",
    devices: mockDevices,
    logs: mockLogs,
    events: []
  });
}
