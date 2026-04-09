import type { NetworkLog } from "@monitoring/shared";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = {
  background: "rgba(0, 0, 0, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "14px",
  padding: "10px 14px",
};

export function TopSourcesChart({ logs }: { logs: NetworkLog[] }) {
  const counts = new Map<string, number>();

  for (const log of logs) {
    counts.set(log.sourceIp, (counts.get(log.sourceIp) ?? 0) + 1);
  }

  const data = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([ip, count]) => ({ ip, count }));

  return (
    <section className="panel" style={{ padding: 20 }}>
      <div className="panel__header">
        <h2>Top Source IPs</h2>
        <span>Top {data.length} sources</span>
      </div>
      <div className="chart-wrap" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="ip"
              stroke="#666666"
              tick={{ fontSize: 10, fill: "#666666" }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={52}
            />
            <YAxis
              stroke="#666666"
              tick={{ fontSize: 11, fill: "#666666" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(139, 92, 246, 0.06)" }} />
            <Bar dataKey="count" name="Events" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
