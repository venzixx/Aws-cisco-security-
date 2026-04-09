import type { DeviceSummary, NetworkLog } from "@monitoring/shared";

export const mockDevices: DeviceSummary[] = [
  {
    id: "rtr-edge-01",
    name: "RTR-EDGE-01",
    type: "router",
    location: "Campus Edge",
    lastSeen: "2026-04-08T10:15:00.000Z",
    health: "healthy"
  },
  {
    id: "fw-core-01",
    name: "FW-CORE-01",
    type: "firewall",
    location: "Security Perimeter",
    lastSeen: "2026-04-08T10:14:25.000Z",
    health: "warning"
  },
  {
    id: "collector-local-01",
    name: "COLLECTOR-LOCAL-01",
    type: "collector",
    location: "Laptop Collector",
    lastSeen: "2026-04-08T10:15:10.000Z",
    health: "healthy"
  }
];

export const mockLogs: NetworkLog[] = [
  {
    id: "log-001",
    timestamp: "2026-04-08T09:46:05.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "high",
    category: "acl",
    sourceIp: "91.210.14.88",
    destinationIp: "10.0.10.20",
    message: "ACL denied inbound RDP attempt to protected internal host.",
    raw: "%ASA-4-106023: Deny tcp src outside:91.210.14.88/50111 dst inside:10.0.10.20/3389 by access-group \"outside_access_in\""
  },
  {
    id: "log-002",
    timestamp: "2026-04-08T09:48:18.000Z",
    deviceId: "rtr-edge-01",
    deviceName: "RTR-EDGE-01",
    severity: "low",
    category: "config",
    sourceIp: "10.0.1.5",
    destinationIp: "10.0.1.1",
    message: "Configuration change detected on edge router.",
    raw: "%SYS-5-CONFIG_I: Configured from console by admin on vty0 (10.0.1.5)"
  },
  {
    id: "log-003",
    timestamp: "2026-04-08T09:51:10.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "high",
    category: "auth",
    sourceIp: "185.23.44.10",
    destinationIp: "10.0.10.12",
    message: "Failed SSH management login detected.",
    raw: "%ASA-4-113019: Group = admin, Username = admin, IP = 185.23.44.10, Session disconnected. Authentication failed."
  },
  {
    id: "log-004",
    timestamp: "2026-04-08T09:52:14.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "high",
    category: "auth",
    sourceIp: "185.23.44.10",
    destinationIp: "10.0.10.12",
    message: "Second failed SSH management login detected.",
    raw: "%ASA-4-113019: Group = admin, Username = admin, IP = 185.23.44.10, Session disconnected. Authentication failed."
  },
  {
    id: "log-005",
    timestamp: "2026-04-08T09:53:26.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "high",
    category: "auth",
    sourceIp: "185.23.44.10",
    destinationIp: "10.0.10.12",
    message: "Third failed SSH management login detected.",
    raw: "%ASA-4-113019: Group = admin, Username = admin, IP = 185.23.44.10, Session disconnected. Authentication failed."
  },
  {
    id: "log-006",
    timestamp: "2026-04-08T09:56:43.000Z",
    deviceId: "rtr-edge-01",
    deviceName: "RTR-EDGE-01",
    severity: "medium",
    category: "traffic",
    sourceIp: "172.16.1.44",
    destinationIp: "52.95.110.1",
    message: "Outbound traffic exceeded baseline for the last 5 minutes.",
    raw: "%IOSXE-5-PLATFORM: Interface GigabitEthernet1 traffic rate crossed threshold: 89 Mbps outbound."
  },
  {
    id: "log-007",
    timestamp: "2026-04-08T10:00:02.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "high",
    category: "acl",
    sourceIp: "91.210.14.88",
    destinationIp: "10.0.10.20",
    message: "ACL denied repeated RDP probing activity.",
    raw: "%ASA-4-106023: Deny tcp src outside:91.210.14.88/51514 dst inside:10.0.10.20/3389 by access-group \"outside_access_in\""
  },
  {
    id: "log-008",
    timestamp: "2026-04-08T10:02:58.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "medium",
    category: "system",
    sourceIp: "10.0.10.1",
    destinationIp: "10.0.10.1",
    message: "CPU utilization returned to normal after packet inspection burst.",
    raw: "%ASA-6-302013: Built inbound TCP connection after inspection queue recovered."
  },
  {
    id: "log-009",
    timestamp: "2026-04-08T10:05:11.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "high",
    category: "traffic",
    sourceIp: "103.51.78.201",
    destinationIp: "10.0.10.40",
    message: "Burst of denied HTTP requests suggests reconnaissance activity.",
    raw: "%ASA-6-106100: access-list outside_access_in denied tcp outside/103.51.78.201(49813) -> inside/10.0.10.40(80) hit-cnt 48"
  },
  {
    id: "log-010",
    timestamp: "2026-04-08T10:08:41.000Z",
    deviceId: "rtr-edge-01",
    deviceName: "RTR-EDGE-01",
    severity: "medium",
    category: "traffic",
    sourceIp: "172.16.1.44",
    destinationIp: "52.95.110.1",
    message: "Outbound traffic remains above the expected operating threshold.",
    raw: "%IOSXE-5-PLATFORM: Interface GigabitEthernet1 traffic rate crossed threshold: 93 Mbps outbound."
  },
  {
    id: "log-011",
    timestamp: "2026-04-08T10:11:33.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "critical",
    category: "acl",
    sourceIp: "91.210.14.88",
    destinationIp: "10.0.10.20",
    message: "Firewall blocked a third wave of RDP attempts from the same external IP.",
    raw: "%ASA-4-106023: Deny tcp src outside:91.210.14.88/52220 dst inside:10.0.10.20/3389 by access-group \"outside_access_in\""
  },
  {
    id: "log-012",
    timestamp: "2026-04-08T10:14:55.000Z",
    deviceId: "fw-core-01",
    deviceName: "FW-CORE-01",
    severity: "high",
    category: "auth",
    sourceIp: "203.44.90.18",
    destinationIp: "10.0.10.12",
    message: "Failed VPN portal login detected for disabled account.",
    raw: "%ASA-4-722051: Group <RA-VPN> User <contractor-test> IP <203.44.90.18> Authentication rejected."
  }
];
