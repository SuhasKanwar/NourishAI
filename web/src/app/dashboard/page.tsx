"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  CalendarClock,
  Check,
  ChefHat,
  CloudSun,
  IndianRupee,
  Loader2,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { api } from "@/lib/api";

type Recommendation = {
  id: string;
  title: string;
  vendor: string;
  description: string;
  price: number;
  calories?: number;
  rating?: number;
  eta_minutes?: number;
  tags: string[];
  source: "swiggy" | "fallback";
};

type DashboardAction = {
  id: string;
  label: string;
  type: "order_food" | "order_groceries" | "book_table" | "schedule" | "modify";
  status: "suggested" | "requires_auth" | "ready" | "scheduled" | "completed";
  payload: Record<string, unknown>;
};

type AgentResponse = {
  recommendations: Recommendation[];
  actions: DashboardAction[];
  reasoning: string;
  context: {
    location: string;
    meal_type: string;
    weather: string;
    temperature_c?: number;
    budget_remaining: number;
  };
  ui_patch: {
    todayPlan?: string;
    budgetRemaining?: number;
    copilotState?: string;
  };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const initialData: AgentResponse = {
  recommendations: [
    {
      id: "seed-1",
      title: "Paneer protein bowl",
      vendor: "NourishAI baseline",
      description: "Balanced dinner candidate under budget until Copilot fetches live Swiggy MCP options.",
      price: 185,
      calories: 560,
      rating: 4.4,
      eta_minutes: 26,
      tags: ["balanced", "under Rs 200", "high satiety"],
      source: "fallback",
    },
    {
      id: "seed-2",
      title: "Mini thali",
      vendor: "NourishAI baseline",
      description: "Comfort meal with portion control and predictable spend.",
      price: 160,
      calories: 640,
      rating: 4.2,
      eta_minutes: 30,
      tags: ["budget", "dinner", "vegetarian"],
      source: "fallback",
    },
  ],
  actions: [
    {
      id: "seed-order",
      label: "Order now",
      type: "order_food",
      status: "suggested",
      payload: {},
    },
  ],
  reasoning:
    "Copilot is ready. Ask for a meal, budget, grocery run, or table booking and the dashboard will update from structured agent output.",
  context: {
    location: "Bengaluru, India",
    meal_type: "dinner",
    weather: "seasonal",
    budget_remaining: 1200,
  },
  ui_patch: {
    todayPlan: "Dinner plan ready",
    budgetRemaining: 1015,
    copilotState: "idle",
  },
};

export default function DashboardPage() {
  const [prompt, setPrompt] = useState("Suggest dinner under Rs 200");
  const [data, setData] = useState<AgentResponse>(initialData);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Tell me what to optimize: price, health, cravings, schedule, groceries, or dineout.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const spentToday = useMemo(() => {
    const remaining = data.ui_patch.budgetRemaining ?? data.context.budget_remaining;
    return Math.max(data.context.budget_remaining - remaining, 0);
  }, [data]);

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || loading) return;
    const nextPrompt = prompt.trim();
    setMessages((current) => [...current, { role: "user", content: nextPrompt }]);
    setLoading(true);
    try {
      const response = await api.post<AgentResponse>("/agent/run", {
        prompt: nextPrompt,
        user_id: "demo-user",
        location: data.context.location,
      });
      setData(response.data);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.data.reasoning },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I could not reach the agent service. Keep the FastAPI service running on the configured microservice URL.",
        },
      ]);
    } finally {
      setLoading(false);
      setPrompt("");
    }
  }

  async function runAction(action: DashboardAction) {
    setActionLoading(action.id);
    try {
      const response = await api.post("/agent/action", {
        action,
        user_id: "demo-user",
      });
      const result = response.data as { authorization_url?: string };
      if (result.authorization_url) {
        window.location.assign(result.authorization_url);
        return;
      }
      setData((current) => ({
        ...current,
        actions: current.actions.map((item) =>
          item.id === action.id ? { ...item, status: "completed" } : item,
        ),
      }));
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Action completed: ${action.label}.` },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Action needs review before I can run: ${action.label}.` },
      ]);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#070908] px-4 pb-8 pt-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/30"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm text-[#f75000]">
                  <Sparkles className="h-4 w-4" />
                  Autonomous food operating system
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                  Today&apos;s Plan
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                  {data.ui_patch.todayPlan}. The copilot updates recommendations, budget, and actions as it reasons.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                <ContextBadge icon={<CloudSun />} label={data.context.weather} value={`${data.context.temperature_c ?? "--"} C`} />
                <ContextBadge icon={<ChefHat />} label="Meal" value={data.context.meal_type} />
                <ContextBadge icon={<MapPin />} label="Location" value={data.context.location} />
                <ContextBadge icon={<WalletCards />} label="Budget left" value={`Rs ${data.ui_patch.budgetRemaining ?? data.context.budget_remaining}`} />
              </div>
            </div>
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recommended meals</h2>
                <span className="text-xs text-white/45">{data.recommendations.length} ranked options</span>
              </div>
              <AnimatePresence mode="popLayout">
                {data.recommendations.map((meal, index) => (
                  <motion.article
                    layout
                    key={meal.id}
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.04 }}
                    className="border border-white/10 bg-[#101312] p-4 shadow-xl shadow-black/20"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold">{meal.title}</h3>
                          <span className="border border-[#f75000]/35 bg-[#f75000]/10 px-2 py-1 text-xs text-[#ffb28e]">
                            {meal.source === "swiggy" ? "Swiggy MCP" : "Fallback"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-white/50">{meal.vendor}</p>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">{meal.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {meal.tags.map((tag) => (
                            <span key={tag} className="bg-white/[0.06] px-2.5 py-1 text-xs text-white/65">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid min-w-[170px] grid-cols-3 gap-2 text-center sm:grid-cols-1">
                        <Metric icon={<IndianRupee />} label="Price" value={`${meal.price}`} />
                        <Metric label="ETA" value={`${meal.eta_minutes ?? "--"}m`} />
                        <Metric label="Rating" value={meal.rating?.toFixed(1) ?? "--"} />
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </section>

            <aside className="space-y-4">
              <Panel title="Budget tracker" icon={<WalletCards className="h-4 w-4" />}>
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-white/55">Today spent</span>
                    <strong className="text-2xl">Rs {spentToday}</strong>
                  </div>
                  <div className="h-2 bg-white/10">
                    <motion.div
                      className="h-full bg-[#f75000]"
                      animate={{ width: `${Math.min((spentToday / data.context.budget_remaining) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs leading-5 text-white/50">
                    Budget agent filters options before the health and preference agents rank them.
                  </p>
                </div>
              </Panel>

              <Panel title="Scheduled actions" icon={<CalendarClock className="h-4 w-4" />}>
                <div className="space-y-3">
                  {data.actions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.03] p-3">
                      <div>
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-white/45">{action.status.replace("_", " ")}</p>
                      </div>
                      <button
                        onClick={() => runAction(action)}
                        className="inline-flex h-9 items-center gap-2 bg-white px-3 text-sm font-semibold text-black transition hover:bg-[#ffcfbd]"
                        disabled={actionLoading === action.id}
                      >
                        {actionLoading === action.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Approve
                      </button>
                    </div>
                  ))}
                  <div className="border border-dashed border-white/15 p-3 text-xs leading-5 text-white/45">
                    Grocery restock tomorrow: fruit, curd, oats. Copilot can convert it into Instamart checkout.
                  </div>
                </div>
              </Panel>
            </aside>
          </div>
        </section>

        <aside className="flex min-h-[720px] flex-col border border-white/10 bg-[#0d100f] shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center bg-[#f75000] text-black">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Nourish Copilot</h2>
                  <p className="text-xs text-white/45">Controls dashboard state</p>
                </div>
              </div>
              <ShieldCheck className="h-5 w-5 text-[#ff9b6e]" />
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[92%] p-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-[#f75000] text-black"
                    : "border border-white/10 bg-white/[0.04] text-white/75"
                }`}
              >
                {message.content}
              </motion.div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running planner, context, decision, and executor agents
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <form onSubmit={submitPrompt} className="space-y-3">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-24 w-full resize-none border border-white/10 bg-black/30 p-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#f75000]"
                placeholder="Suggest dinner under Rs 200"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#f75000] px-4 font-semibold text-black transition hover:bg-[#ff7a3d] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Run Copilot
              </button>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ContextBadge({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-h-20 border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex h-5 w-5 items-center justify-center text-[#f75000] [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-2">
      <p className="flex items-center justify-center gap-1 text-xs text-white/42">
        <span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
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
