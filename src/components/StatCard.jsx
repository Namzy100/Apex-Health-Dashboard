export default function StatCard({ label, value, unit, sub, accent, icon: Icon, progress, progressMax }) {
  const pct = progress != null && progressMax ? Math.min((progress / progressMax) * 100, 100) : null;

  return (
    <div className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: "#111118", border: "1px solid #1e1e2e" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider" style={{ color: "#475569" }}>{label}</span>
        {Icon && <Icon size={14} style={{ color: accent || "#6366f1" }} />}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold" style={{ color: accent || "#e2e8f0" }}>{value}</span>
        {unit && <span className="text-sm mb-0.5" style={{ color: "#64748b" }}>{unit}</span>}
      </div>
      {sub && <p className="text-xs" style={{ color: "#64748b" }}>{sub}</p>}
      {pct != null && (
        <div className="h-1 rounded-full mt-1" style={{ background: "#1e1e2e" }}>
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${pct}%`, background: accent || "#6366f1" }}
          />
        </div>
      )}
    </div>
  );
}
