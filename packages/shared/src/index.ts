export type Severity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type SecurityEventType =
  | "failed_login_attempt"
  | "failed_login_burst"
  | "successful_login"
  | "authenticated_access"
  | "session_logout"
  | "admin_probe"
  | "config_backup_probe"
  | "rate_limit_burst"
  | "path_enumeration"
  | "filesystem_control"
  | "sensitive_data_access";

export interface DeviceSummary {
  id: string;
  name: string;
  type: "router" | "firewall" | "switch" | "collector";
  location: string;
  lastSeen: string;
  health: "healthy" | "warning" | "critical";
}

export interface NetworkLog {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  severity: Severity;
  category: "auth" | "traffic" | "acl" | "config" | "system";
  sourceIp: string;
  destinationIp: string;
  message: string;
  raw: string;
}

export interface AlertSuggestion {
  title: string;
  action: string;
}

export interface SecurityAlert {
  id: string;
  title: string;
  severity: Severity;
  status: AlertStatus;
  deviceName: string;
  detectedAt: string;
  ruleId: string;
  description: string;
  suggestions: AlertSuggestion[];
}

export interface MetricPoint {
  timestamp: string;
  totalLogs: number;
  deniedConnections: number;
  failedLogins: number;
}

export interface OverviewMetrics {
  totalLogs: number;
  highSeverityAlerts: number;
  blockedAttempts: number;
  activeDevices: number;
  structuredEvents: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: Severity;
  sourceIp: string;
  targetPath: string;
  status: "logged" | "blocked" | "simulated";
  actor: string;
  summary: string;
  details: string;
}

export interface DashboardPayload {
  generatedAt: string;
  region: string;
  mode: "mock" | "aws";
  overview: OverviewMetrics;
  devices: DeviceSummary[];
  alerts: SecurityAlert[];
  logs: NetworkLog[];
  traffic: MetricPoint[];
  events: SecurityEvent[];
}
