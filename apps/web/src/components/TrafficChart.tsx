import type { MetricPoint } from "@monitoring/shared";
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

export function TrafficChart({ data }: { data: MetricPoint[] }) {
  const chartData = data.map((point) => ({
    ...point,
    time: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <section className="panel" style={{ padding: 20 }}>
      <div className="panel__header">
        <h2>Security Event Trend</h2>
        <span>5-minute windows</span>
      </div>

      <div className="chart-wrap" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="logsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00bceb" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#00bceb" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="deniedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff9e00" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ff9e00" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="totalLogs" name="Total Logs" stroke="#00bceb" fill="url(#logsGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="deniedConnections" name="Denied" stroke="#ff9e00" fill="url(#deniedGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="failedLogins" name="Failed Logins" stroke="#ff4d6d" fill="url(#failedGrad)" strokeWidth={2} />
            <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: "0.82rem", color: "#a0a0a0" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
