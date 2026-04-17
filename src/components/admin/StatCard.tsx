interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}

export default function StatCard({ label, value, sub, color = 'text-blue-400', icon }: StatCardProps) {
  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 border border-white/10">
      <div className="flex items-start justify-between mb-1">
        <p className="text-slate-400 text-sm">{label}</p>
        {icon && <span className="text-xl opacity-60">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}
