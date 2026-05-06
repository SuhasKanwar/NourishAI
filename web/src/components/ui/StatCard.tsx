import { ReactNode } from "react";

export function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <section className="border border-white/10 bg-[#101312] p-4">
      <div className="mb-3 text-[#f75000] [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p>
    </section>
  );
}
