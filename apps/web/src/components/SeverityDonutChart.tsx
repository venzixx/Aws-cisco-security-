import type { NetworkLog } from "@monitoring/shared";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff4d6d",
  high: "#ff9e00",
  medium: "#00bceb",
  low: "#90be6d",
};

const tooltipStyle = {
  background: "rgba(0, 0, 0, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "14px",
  padding: "10px 14px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
};

export function SeverityDonutChart({ logs }: { logs: NetworkLog[] }) {
  const counts = new Map<string, number>();

  for (const log of logs) {
    counts.set(log.severity, (counts.get(log.severity) ?? 0) + 1);
  }

  const data = Array.from(counts.entries()).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: SEVERITY_COLORS[name] ?? "#8b5cf6",
  }));

  return (
    <section className="panel" style={{ padding: 20 }}>
      <div className="panel__header">
        <h2>Severity Breakdown</h2>
        <span>{logs.length} logs</span>
      </div>
      <div className="chart-wrap" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={tooltipStyle} 
              itemStyle={{ color: "#ffffff", fontSize: "0.82rem" }}
              labelStyle={{ display: "none" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: "0.78rem", color: "#a0a0a0", paddingTop: "10px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
