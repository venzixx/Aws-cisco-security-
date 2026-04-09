import type { DashboardPayload } from "@monitoring/shared";

export async function fetchDashboard(): Promise<DashboardPayload> {
  const response = await fetch("/api/dashboard");

  if (!response.ok) {
    throw new Error("Failed to load dashboard data.");
  }

  return response.json() as Promise<DashboardPayload>;
}
