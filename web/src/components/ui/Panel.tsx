import { ReactNode } from "react";

export function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-white/10 bg-[#101312] p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <span className="text-[#f75000]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}
