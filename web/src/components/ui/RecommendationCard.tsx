import { Sparkles } from "lucide-react";
import { Recommendation } from "@/types/dashboard";

interface RecommendationCardProps {
  item: Recommendation;
  onAction: () => void;
}

export function RecommendationCard({ item, onAction }: RecommendationCardProps) {
  return (
    <article className="group flex flex-col border border-white/10 bg-white/[0.02] p-5 transition hover:border-[#f75000]/50 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-4">
        {item.image_url && (
          <div className="mb-4 h-32 w-full shrink-0 overflow-hidden rounded-xl bg-black/40">
            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover opacity-80 transition hover:opacity-100" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold">{item.title}</h3>
          <p className="mt-1 truncate text-xs text-white/40 font-medium uppercase tracking-wider">{item.vendor}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-[#f75000]">Rs {item.price}</p>
          <p className="text-[10px] text-white/30 font-bold">{item.eta_minutes || "--"} MIN</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 flex-1 text-xs leading-5 text-white/50">{item.description}</p>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/5 pt-4">
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#f75000]" />
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Healthy Pick</span>
        </div>
        <button onClick={onAction} className="flex items-center gap-2 bg-white px-3 py-1.5 text-[10px] font-bold text-black transition group-hover:bg-[#f75000] group-hover:text-white uppercase">
          {item.category === "restaurant" ? "View Menu" : item.category === "menu_item" ? "Add" : "Select"}
        </button>
      </div>
    </article>
  );
}
