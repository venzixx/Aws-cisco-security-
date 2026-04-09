import { useEffect, useRef } from "react";

interface MetricCardProps {
  label: string;
  value: number | string;
  accent: string;
  icon: string;
}

export function MetricCard({ label, value, accent, icon }: MetricCardProps) {
  const valueRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || typeof value !== "number" || !valueRef.current) {
      return;
    }

    startedRef.current = true;
    const target = value;
    const duration = 900;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (valueRef.current) {
        valueRef.current.textContent = String(Math.round(target * eased));
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [value]);

  return (
    <div className="metric-card">
      <div className="metric-card__header">
        <div className="metric-card__label">{label}</div>
        <div
          className="metric-card__icon"
          style={{ background: `${accent}18`, color: accent }}
        >
          {icon}
        </div>
      </div>
      <div
        ref={valueRef}
        className="metric-card__value"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div
        className="metric-card__accent"
        style={{
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }}
      />
    </div>
  );
}
