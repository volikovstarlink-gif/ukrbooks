interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatCard({ label, value, sub, color = 'text-blue-400', icon, size = 'md' }: StatCardProps) {
  const valueSize =
    size === 'lg'
      ? 'text-3xl sm:text-4xl'
      : size === 'sm'
      ? 'text-xl sm:text-2xl'
      : 'text-2xl sm:text-3xl';
  return (
    <div className="bg-[#1e293b] rounded-2xl p-4 sm:p-5 border border-white/10 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-slate-400 text-xs sm:text-sm leading-tight min-w-0 break-words">{label}</p>
        {icon && <span className="text-lg sm:text-xl opacity-60 shrink-0">{icon}</span>}
      </div>
      <p className={`${valueSize} font-bold tabular-nums leading-tight ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1 break-words">{sub}</p>}
    </div>
  );
}
