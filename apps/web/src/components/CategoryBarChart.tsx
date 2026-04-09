import type { NetworkLog } from "@monitoring/shared";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = {
  background: "rgba(0, 0, 0, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "14px",
  padding: "10px 14px",
};

export function CategoryBarChart({ logs }: { logs: NetworkLog[] }) {
  const counts = new Map<string, number>();

  for (const log of logs) {
    counts.set(log.category, (counts.get(log.category) ?? 0) + 1);
  }

  const data = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return (
    <section className="panel" style={{ padding: 20 }}>
      <div className="panel__header">
        <h2>Events by Category</h2>
        <span>{data.length} categories</span>
      </div>
      <div className="chart-wrap" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barCategoryGap="18%">
            <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis
              type="number"
              stroke="#666666"
              tick={{ fontSize: 11, fill: "#666666" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#666666"
              tick={{ fontSize: 12, fill: "#a0a0a0" }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0, 188, 235, 0.06)" }} />
            <Bar dataKey="count" name="Events" fill="#00bceb" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
