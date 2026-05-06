export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/42">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
