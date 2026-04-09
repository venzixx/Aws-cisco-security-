import type { SecurityEvent } from "@monitoring/shared";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "rgba(0, 0, 0, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "14px",
  padding: "10px 14px",
};

function bucketEvents(events: SecurityEvent[]) {
  const buckets = new Map<string, { logins: number; access: number; blocked: number }>();

  for (const event of events) {
    const time = new Date(event.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!buckets.has(time)) {
      buckets.set(time, { logins: 0, access: 0, blocked: 0 });
    }

    const bucket = buckets.get(time)!;

    if (event.eventType === "successful_login" || event.eventType === "failed_login_attempt" || event.eventType === "failed_login_burst") {
      bucket.logins += 1;
    } else if (event.status === "blocked") {
      bucket.blocked += 1;
    } else {
      bucket.access += 1;
    }
  }

  return Array.from(buckets.entries()).map(([time, counts]) => ({
    time,
    ...counts,
  }));
}

export function AccessTimelineChart({ events }: { events: SecurityEvent[] }) {
  const data = bucketEvents(events);

  return (
    <section className="panel" style={{ padding: 20 }}>
      <div className="panel__header">
        <h2>Access Timeline</h2>
        <span>{events.length} events</span>
      </div>
      <div className="chart-wrap" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#90be6d" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#90be6d" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="accessGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#666666"
              tick={{ fontSize: 11, fill: "#666666" }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              stroke="#666666"
              tick={{ fontSize: 11, fill: "#666666" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="logins" name="Logins" stroke="#90be6d" fill="url(#loginGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="access" name="Access" stroke="#8b5cf6" fill="url(#accessGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#ff4d6d" fill="url(#blockedGrad)" strokeWidth={2} />
            <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: "0.82rem", color: "#a0a0a0" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
