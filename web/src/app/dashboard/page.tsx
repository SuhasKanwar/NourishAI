"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarClock,
  Check,
  ChefHat,
  CloudSun,
  Compass,
  IndianRupee,
  Loader2,
  MapPin,
  PlugZap,
  ReceiptText,
  RefreshCw,
  Send,
  ShoppingBasket,
  Sparkles,
  Store,
  Utensils,
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
  category: "meal" | "restaurant" | "dineout" | "grocery";
  source: "swiggy";
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
  restaurants: Recommendation[];
  dineouts: Recommendation[];
  groceries: Recommendation[];
  actions: DashboardAction[];
  reasoning: string;
  context: {
    location: string;
    latitude?: number;
    longitude?: number;
    meal_type: string;
    local_time?: string;
    weather: string;
    temperature_c?: number;
    budget_remaining: number;
  };
  budget: {
    monthly_limit?: number;
    total_spent?: number;
    remaining?: number;
    usage_percent?: number;
  };
  ui_patch: {
    todayPlan?: string;
    budgetRemaining?: number;
    totalSpent?: number;
    copilotState?: string;
  };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type LocationState = {
  label?: string;
  latitude?: number;
  longitude?: number;
  status: "detecting" | "ready" | "denied" | "unsupported";
};

const emptyAgentData: AgentResponse = {
  recommendations: [],
  restaurants: [],
  dineouts: [],
  groceries: [],
  actions: [],
  reasoning: "Ask Copilot to fetch live Swiggy MCP data for your current context.",
  context: {
    location: "Detecting location",
    meal_type: "current",
    weather: "checking",
    budget_remaining: 0,
  },
  budget: {},
  ui_patch: {
    todayPlan: "Waiting for live context",
    copilotState: "idle",
  },
};

export default function DashboardPage() {
  const [prompt, setPrompt] = useState("");
  const [data, setData] = useState<AgentResponse>(emptyAgentData);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationState>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { status: "unsupported", label: "Browser location unavailable" };
    }
    return { status: "detecting" };
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLocation({
          status: "ready",
          latitude,
          longitude,
          label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
      },
      () => setLocation({ status: "denied", label: "Location permission denied" }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    refreshContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.status]);

  const budget = data.budget;
  const spent = budget.total_spent ?? data.ui_patch.totalSpent ?? 0;
  const limit = budget.monthly_limit ?? 0;
  const remaining = budget.remaining ?? data.ui_patch.budgetRemaining ?? data.context.budget_remaining ?? 0;
  const usage = useMemo(() => {
    if (!limit) return 0;
    return Math.min((spent / limit) * 100, 100);
  }, [limit, spent]);

  async function refreshContext() {
    try {
      const response = await api.get("/user/context", {
        params: {
          user_id: "demo-user",
          location: location.label,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
      setData((current) => ({
        ...current,
        context: {
          ...current.context,
          ...response.data,
        },
      }));
    } catch {
      setData((current) => ({
        ...current,
        context: { ...current.context, weather: "backend unavailable" },
      }));
    }
  }

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
        location: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
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
          content: "The agent service is unreachable. Start FastAPI and run the prompt again.",
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
      setMessages((current) => [...current, { role: "assistant", content: `${action.label} completed.` }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `${action.label} could not be completed yet.` },
      ]);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#070908] px-4 pb-6 pt-24 text-white sm:px-6">
      <div className="grid w-full gap-4 2xl:grid-cols-[1fr_420px]">
        <section className="min-w-0 space-y-4">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="grid gap-4 xl:grid-cols-[1fr_760px] xl:items-end">
              <div>
                <p className="flex items-center gap-2 text-sm text-[#f75000]">
                  <Sparkles className="h-4 w-4" />
                  Live autonomous dashboard
                </p>
                <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Today&apos;s Plan</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
                  {data.ui_patch.todayPlan}. Every card below is driven by the latest agent response and Swiggy MCP data.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <ContextBadge icon={<CloudSun />} label={data.context.weather} value={formatTemp(data.context.temperature_c)} />
                <ContextBadge icon={<ChefHat />} label="Meal" value={data.context.meal_type} />
                <ContextBadge icon={<MapPin />} label="Location" value={data.context.location || location.label || location.status} />
                <ContextBadge icon={<WalletCards />} label="Budget left" value={remaining ? `Rs ${remaining}` : "Not set"} />
              </div>
            </div>
          </motion.section>

          <section className="grid gap-4 xl:grid-cols-4">
            <StatCard icon={<ReceiptText />} label="Monthly budget" value={limit ? `Rs ${limit}` : "Not set"} />
            <StatCard icon={<IndianRupee />} label="Total spent" value={`Rs ${spent}`} />
            <StatCard icon={<Compass />} label="Location status" value={location.status} />
            <StatCard icon={<PlugZap />} label="Copilot state" value={data.ui_patch.copilotState ?? "idle"} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <RecommendationSection title="Recommended meals" icon={<Utensils />} items={data.recommendations} empty="No live meal recommendations yet. Ask Copilot after connecting Swiggy." />
              <div className="grid gap-4 xl:grid-cols-2">
                <RecommendationSection title="Restaurants" icon={<Store />} items={data.restaurants} compact empty="No live restaurants returned yet." />
                <RecommendationSection title="Dineout" icon={<CalendarClock />} items={data.dineouts} compact empty="No live Dineout options returned yet." />
              </div>
              <RecommendationSection title="Groceries and Instamart" icon={<ShoppingBasket />} items={data.groceries} compact empty="No live Instamart products returned yet." />
            </div>

            <aside className="space-y-4">
              <Panel title="Budget and spend" icon={<WalletCards className="h-4 w-4" />}>
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-white/55">Usage</span>
                    <strong className="text-2xl">{usage.toFixed(0)}%</strong>
                  </div>
                  <div className="h-2 bg-white/10">
                    <motion.div className="h-full bg-[#f75000]" animate={{ width: `${usage}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <MiniStat label="Spent" value={`Rs ${spent}`} />
                    <MiniStat label="Remaining" value={remaining ? `Rs ${remaining}` : "Not set"} />
                  </div>
                </div>
              </Panel>

              <Panel title="AI actions" icon={<Check className="h-4 w-4" />}>
                <div className="space-y-3">
                  {data.actions.length === 0 ? (
                    <EmptyState text="No executable actions yet. Ask Copilot to plan an order, grocery run, or table booking." />
                  ) : (
                    data.actions.map((action) => (
                      <div key={action.id} className="border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3">
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
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel title="Reasoning" icon={<Bot className="h-4 w-4" />}>
                <p className="text-sm leading-6 text-white/62">{data.reasoning}</p>
              </Panel>
            </aside>
          </section>
        </section>

        <aside className="flex min-h-[760px] flex-col border border-white/10 bg-[#0d100f]">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center bg-[#f75000] text-black">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Nourish Copilot</h2>
                  <p className="text-xs text-white/45">Updates the dashboard, not just chat</p>
                </div>
              </div>
              <button
                onClick={refreshContext}
                className="grid h-9 w-9 place-items-center border border-white/10 text-white/60 hover:text-white"
                title="Refresh context"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <EmptyState text="Ask for live recommendations, budget changes, Dineout options, restaurants, or groceries." />
            ) : (
              messages.map((message, index) => (
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
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running live agent pipeline
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <form onSubmit={submitPrompt} className="space-y-3">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-28 w-full resize-none border border-white/10 bg-black/30 p-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#f75000]"
                placeholder="Suggest dinner under Rs 200, find healthy restaurants nearby, or book a table tonight"
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

function RecommendationSection({
  title,
  icon,
  items,
  compact = false,
  empty,
}: {
  title: string;
  icon: ReactNode;
  items: Recommendation[];
  compact?: boolean;
  empty: string;
}) {
  return (
    <section className="border border-white/10 bg-[#101312] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className="text-[#f75000] [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
          {title}
        </h2>
        <span className="text-xs text-white/45">{items.length} live</span>
      </div>
      {items.length === 0 ? (
        <EmptyState text={empty} />
      ) : (
        <div className={compact ? "grid gap-3 md:grid-cols-2 xl:grid-cols-1" : "grid gap-3 xl:grid-cols-2"}>
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.article
                layout
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                className="border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{item.title}</h3>
                    <p className="mt-1 truncate text-sm text-white/45">{item.vendor}</p>
                  </div>
                  <span className="shrink-0 border border-[#f75000]/35 bg-[#f75000]/10 px-2 py-1 text-xs text-[#ffb28e]">
                    MCP
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/62">{item.description}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Price" value={`Rs ${item.price}`} />
                  <Metric label="ETA" value={item.eta_minutes ? `${item.eta_minutes}m` : "--"} />
                  <Metric label="Rating" value={item.rating?.toFixed(1) ?? "--"} />
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function ContextBadge({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
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

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <section className="border border-white/10 bg-[#101312] p-4">
      <div className="mb-3 text-[#f75000] [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/42">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-2">
      <p className="text-xs text-white/42">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-white/15 p-4 text-sm leading-6 text-white/45">
      {text}
    </div>
  );
}

function formatTemp(value?: number) {
  return typeof value === "number" ? `${value.toFixed(1)} C` : "--";
}
