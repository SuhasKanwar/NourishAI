import { ReactNode } from "react";

export function ContextBadge({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-h-20 border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex h-5 w-5 items-center justify-center text-[#f75000] [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
      <p className="truncate text-xs text-white/45">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
