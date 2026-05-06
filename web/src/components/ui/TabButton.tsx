import { motion } from "framer-motion";

export function TabButton({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: any, label: string, count: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 h-full text-sm font-bold transition-all ${active ? "text-white" : "text-white/40 hover:text-white/60"
        }`}
    >
      {icon}
      <span>{label}</span>
      <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>
      {active && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f75000]" />}
    </button>
  );
}
