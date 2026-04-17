interface UsageBarProps {
  used: number;
  max: number;
  label: string;
  unit?: string;
}

export default function UsageBar({ used, max, label, unit = '' }: UsageBarProps) {
  const pct = Math.min((used / max) * 100, 100);
  const color = pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{used.toFixed(2)}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
