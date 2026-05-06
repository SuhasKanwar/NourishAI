"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarClock,
  Check,
  ChefHat,
  CloudSun,
  Loader2,
  MapPin,
  ReceiptText,
  RefreshCw,
  Send,
  ShoppingBasket,
  Sparkles,
  Store,
  WalletCards,
  X,
  Bell,
  ArrowRight,
  Pizza,
  UtensilsCrossed
} from "lucide-react";
import axios from "axios";
import Image from "next/image";

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
  category: "meal" | "restaurant" | "dineout" | "grocery" | "menu_item";
  source: "swiggy";
  image_url?: string;
  raw?: any;
};

type DashboardAction = {
  id: string;
  label: string;
  type: "order_food" | "order_groceries" | "book_table" | "schedule" | "modify" | "view_menu" | "add_to_cart" | "view_cart" | "checkout" | "track";
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
  menu?: Recommendation[];
  cart?: any;
  orders?: any[];
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

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
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
  const [location, setLocation] = useState<LocationState>({ status: "detecting" });
  const [budgetInput, setBudgetInput] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(true);
  const [budgetEditing, setBudgetEditing] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"food" | "dineout" | "instamart" | "track">("food");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const autoRequestSent = useRef(false);

  // Modals
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const savedBudget = window.localStorage.getItem("nourishai-monthly-budget");
    if (savedBudget) {
      const parsedBudget = Number(savedBudget);
      if (Number.isFinite(parsedBudget) && parsedBudget > 0) {
        setTimeout(() => {
          setMonthlyBudget(parsedBudget);
          setBudgetInput(String(parsedBudget));
          setBudgetDialogOpen(false);
        }, 0);
      }
    }
    if (!navigator.geolocation) {
      setTimeout(() => {
        setLocation({ status: "unsupported", label: "Browser location unavailable" });
      }, 0);
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
      async (error) => {
        try {
          const res = await axios.get("https://ipapi.co/json/");
          if (res.data && res.data.latitude && res.data.longitude) {
            setLocation({
              status: "ready",
              latitude: res.data.latitude,
              longitude: res.data.longitude,
              label: `${res.data.city}, ${res.data.country_name}`,
            });
            return;
          }
        } catch (e) {
          console.error("IP fallback failed:", e);
        }
        let label = "Location error";
        if (error.code === 1) label = "Location permission denied";
        else if (error.code === 2) label = "Position unavailable";
        else if (error.code === 3) label = "Location request timed out";
        setLocation({ status: "denied", label });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    refreshContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.status]);

  useEffect(() => {
    setTimeout(() => {
      void loadBudget();
    }, 0);
  }, []);

  useEffect(() => {
    if (autoRequestSent.current || !monthlyBudget || location.status === "detecting") return;
    autoRequestSent.current = true;
    setTimeout(() => {
      void runAgent(
        "Build today's plan using my live location, time, weather, budget, Swiggy restaurants, Dineout, and Instamart.",
        monthlyBudget,
        true,
      );
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyBudget, location.status]);

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
      const response = await axios.get("/api/user/context", {
        params: {
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

  async function loadBudget() {
    try {
      const response = await axios.get("/api/user/budget");
      setData((current) => ({
        ...current,
        budget: response.data,
        context: {
          ...current.context,
          budget_remaining: response.data.remaining ?? current.context.budget_remaining,
        },
        ui_patch: {
          ...current.ui_patch,
          budgetRemaining: response.data.remaining,
          totalSpent: response.data.total_spent,
        },
      }));
      if (response.data.monthly_limit) {
        setMonthlyBudget(response.data.monthly_limit);
        setBudgetInput(String(response.data.monthly_limit));
      }
    } catch {
      // The first agent run will still create the budget row if the service is available.
    }
  }

  async function runAgent(nextPrompt: string, budget?: number | null, silent = false) {
    if (!nextPrompt.trim() || loading) return;
    if (!silent) {
      setMessages((current) => [...current, { role: "user", content: nextPrompt }]);
    }
    setLoading(true);
    try {
      const response = await axios.post<AgentResponse>("/api/agent/run", {
        prompt: nextPrompt,
        location: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
        monthly_budget: budget ?? monthlyBudget,
      });
      setData(response.data);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: silent
            ? `Dashboard initialized. ${response.data.reasoning}`
            : response.data.reasoning,
        },
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

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAgent(prompt);
  }

  async function submitBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedBudget = Number(budgetInput);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) return;
    await saveBudget(parsedBudget, true);
  }

  async function saveBudget(parsedBudget: number, initializeAfterSave = false) {
    setBudgetSaving(true);
    try {
      const response = await axios.put("/api/user/budget", {
        monthly_budget: parsedBudget,
      });
      window.localStorage.setItem("nourishai-monthly-budget", String(parsedBudget));
      setMonthlyBudget(parsedBudget);
      setBudgetInput(String(parsedBudget));
      setData((current) => ({
        ...current,
        budget: response.data,
        context: {
          ...current.context,
          budget_remaining: response.data.remaining ?? current.context.budget_remaining,
        },
        ui_patch: {
          ...current.ui_patch,
          budgetRemaining: response.data.remaining,
          totalSpent: response.data.total_spent,
        },
      }));
      setBudgetDialogOpen(false);
      setBudgetEditing(false);
      if (initializeAfterSave && !autoRequestSent.current && location.status !== "detecting") {
        autoRequestSent.current = true;
        await runAgent(
          "Build today's plan using my live location, time, weather, budget, Swiggy restaurants, Dineout, and Instamart.",
          parsedBudget,
          true,
        );
      }
    } finally {
      setBudgetSaving(false);
    }
  }

  async function runAction(action: DashboardAction) {
    setActionLoading(action.id);
    try {
      const response = await axios.post("/api/agent/action", {
        action,
      });
      const result = response.data as { authorization_url?: string; message?: string; status?: string; intent?: string; data?: any };

      if (result.intent === "oauth" || action.payload.intent === "oauth") {
        const authResponse = await axios.get("/api/mcp/auth/start");
        if (authResponse.data.authorization_url) {
          window.location.assign(authResponse.data.authorization_url);
        }
        return;
      }

      if (result.authorization_url) {
        window.location.assign(result.authorization_url);
        return;
      }
      if (result.message) {
        setMessages((current) => [...current, { role: "assistant", content: result.message ?? "" }]);
      }
      if (result.data) {
        setData((current) => ({
          ...current,
          ...result.data,
          actions: result.data.actions || current.actions.map((item: any) =>
            item.id === action.id ? { ...item, status: "completed" } : item,
          ),
        }));
        if (result.data.menu) setMenuModalOpen(true);
        if (result.data.cart) setCartModalOpen(true);
        if (result.data.orders) setActiveTab("track");
      } else {
        setData((current) => ({
          ...current,
          actions: current.actions.map((item) =>
            item.id === action.id ? { ...item, status: "completed" } : item,
          ),
        }));
      }
      addToast(`${action.label} completed.`, "success");
    } catch (err: any) {
      addToast(err.response?.data?.message || `${action.label} failed.`, "error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="fixed inset-x-0 bottom-0 top-[80px] flex overflow-hidden bg-[#070908] text-white">
      {/* Toasts */}
      <div className="fixed right-6 top-[90px] z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`flex items-center gap-3 border border-white/10 px-4 py-3 shadow-2xl ${toast.type === "success" ? "bg-[#0a2e1f] text-[#4ade80]" :
                toast.type === "error" ? "bg-[#2e0a0a] text-[#f87171]" : "bg-[#101312] text-white"
                }`}
            >
              {toast.type === "success" ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              <span className="text-sm font-medium">{toast.message}</span>
              <button onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))} className="ml-2 text-white/40 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Menu Modal */}
      <AnimatePresence>
        {menuModalOpen && data.menu && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl max-h-full flex flex-col bg-[#101312] border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h2 className="text-xl font-bold">Restaurant Menu</h2>
                <button onClick={() => setMenuModalOpen(false)} className="text-white/40 hover:text-white"><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide grid gap-6 sm:grid-cols-2">
                {data.menu.map(item => {
                  const action = data.actions.find(a => a.payload?.recommendationId === item.id);
                  return <RecommendationCard key={item.id} item={item} onAction={() => action ? runAction(action) : addToast("No action available", "info")} />
                })}
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end">
                <button onClick={() => runAction({ id: "view_cart", label: "View Cart", type: "view_cart", status: "ready", payload: { restaurantId: data.menu?.[0]?.raw?.restaurantId } })} className="bg-[#f75000] text-black px-6 py-3 font-bold flex items-center gap-2 hover:bg-[#ff7a3d]">
                  <ShoppingBasket className="h-4 w-4" /> View Cart & Checkout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {cartModalOpen && data.cart && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md max-h-full flex flex-col bg-[#101312] border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h2 className="text-xl font-bold">Your Cart</h2>
                <button onClick={() => setCartModalOpen(false)} className="text-white/40 hover:text-white"><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <p className="text-sm text-white/50 mb-4">Cart Total: <strong className="text-white">Rs {data.cart.cart?.cartTotal || data.cart.cartTotal || 0}</strong></p>
                {data.cart.cart?.cartItems?.map((item: any, i: number) => (
                  <div key={i} className="mb-4 border border-white/5 bg-black/20 p-4">
                    <p className="font-bold text-sm">{item.name || "Item"}</p>
                    <p className="text-xs text-white/40 mt-1">Qty: {item.quantity} • Rs {item.subTotal || item.price}</p>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-white/10">
                <button onClick={() => {
                  setCartModalOpen(false);
                  runAction({ id: "checkout", label: "Checkout", type: "order_food", status: "ready", payload: { estimatedPrice: data.cart.cart?.cartTotal } });
                }} className="w-full bg-[#f75000] text-black px-6 py-3 font-bold flex items-center justify-center gap-2 hover:bg-[#ff7a3d]">
                  <Check className="h-4 w-4" /> Place Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {budgetDialogOpen && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/85 backdrop-blur-sm px-4">
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md border border-white/10 bg-[#101312] p-6 shadow-2xl"
          >
            <div className="mb-6">
              <p className="flex items-center gap-2 text-sm font-semibold tracking-wider text-[#f75000] uppercase">
                <WalletCards className="h-4 w-4" />
                Initialize Budget
              </p>
              <h2 className="mt-2 text-2xl font-bold">Set your monthly limit</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                NourishAI will track your Swiggy orders and Instamart spends against this goal.
              </p>
            </div>
            <form onSubmit={submitBudget} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">Rs</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(event.target.value.replace(/\D/g, ""))}
                  className="h-14 w-full border border-white/10 bg-black/40 pl-10 pr-4 text-xl font-bold text-white outline-none focus:border-[#f75000] transition-colors"
                  placeholder="0"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#f75000] px-6 font-bold text-black transition hover:bg-[#ff7a3d]"
              >
                Launch Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </motion.section>
        </div>
      )}

      {/* Sidebar - Left (Stats & Actions) */}
      <aside className="flex w-80 flex-col border-r border-white/10 bg-[#0a0c0b]">
        <div className="flex items-center gap-3 border-b border-white/10 p-6">
          <div className="grid h-10 w-10 place-items-center bg-[#f75000] text-black">
            <Image src="/short-logo.png" alt="Logo" width={500} height={500} />
          </div>
          <div>
            <h1 className="text-lg font-bold">NourishAI</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Autonomous Dashboard</p>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6 scrollbar-hide">
          {/* Context Stats */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Live Context</h3>
            <div className="grid grid-cols-2 gap-2">
              <ContextBadge icon={<CloudSun />} label="Weather" value={data.context.weather} />
              <ContextBadge icon={<ChefHat />} label="Meal" value={data.context.meal_type} />
              <div className="col-span-2">
                <ContextBadge icon={<MapPin />} label="Location" value={data.context.location || location.label || "Locating..."} />
              </div>
            </div>
          </section>

          {/* Budget Widget */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Budget Tracker</h3>
              <button onClick={() => setBudgetEditing(!budgetEditing)} className="text-[10px] font-bold text-[#f75000] hover:underline">
                ADJUST
              </button>
            </div>
            <div className="border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">Rs {remaining}</span>
                <span className="text-xs text-white/40">of Rs {limit}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usage}%` }}
                  className="h-full bg-[#f75000]"
                />
              </div>
              <p className="mt-2 text-[10px] text-white/30 font-medium">You have used {usage.toFixed(1)}% of your limit.</p>

              <AnimatePresence>
                {budgetEditing && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={async (e) => { e.preventDefault(); await saveBudget(Number(budgetInput)); }}
                    className="mt-4 space-y-2 overflow-hidden"
                  >
                    <input
                      inputMode="numeric"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value.replace(/\D/g, ""))}
                      className="h-9 w-full border border-white/10 bg-black/40 px-3 text-xs outline-none focus:border-[#f75000]"
                      placeholder="New budget"
                    />
                    <button className="h-9 w-full bg-[#f75000] text-black text-[10px] font-bold">UPDATE</button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Pending Actions */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Pending Actions</h3>
            <div className="space-y-2">
              {data.actions.length === 0 ? (
                <p className="text-xs text-white/20 italic">No actions queued.</p>
              ) : (
                data.actions.map((action) => (
                  <motion.div key={action.id} layout className="group relative border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#f75000]/50">
                    <p className="text-xs font-bold">{action.label}</p>
                    <p className="mt-0.5 text-[10px] text-white/40 uppercase tracking-tighter">{action.status}</p>
                    <button
                      onClick={() => runAction(action)}
                      disabled={actionLoading === action.id}
                      className="mt-3 flex h-8 w-full items-center justify-center gap-2 bg-white text-[10px] font-bold text-black transition hover:bg-[#f75000] hover:text-white"
                    >
                      {actionLoading === action.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      EXECUTE
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>

      {/* Main Content - Discovery Area */}
      <section className="flex flex-1 flex-col bg-[#070908]">
        {/* Navigation Tabs */}
        <header className="flex h-16 items-center border-b border-white/10 px-8">
          <div className="flex h-full gap-8">
            <TabButton
              active={activeTab === "food"}
              onClick={() => setActiveTab("food")}
              icon={<Pizza />}
              label="Food"
              count={data.restaurants.length}
            />
            <TabButton
              active={activeTab === "dineout"}
              onClick={() => setActiveTab("dineout")}
              icon={<UtensilsCrossed />}
              label="Dineout"
              count={data.dineouts.length}
            />
            <TabButton
              active={activeTab === "instamart"}
              onClick={() => setActiveTab("instamart")}
              icon={<ShoppingBasket />}
              label="Instamart"
              count={data.groceries.length}
            />
            <TabButton
              active={activeTab === "track"}
              onClick={() => {
                setActiveTab("track");
                runAction({ id: "track_orders", label: "Track Orders", type: "track", status: "ready", payload: {} } as any);
              }}
              icon={<ReceiptText />}
              label="Track"
              count={data.orders?.length || 0}
            />
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
            >
              {activeTab === "food" && (
                data.restaurants.length > 0 ? (
                  data.restaurants.map((item) => {
                    const action = data.actions.find(a => a.payload?.recommendationId === item.id);
                    return (
                      <RecommendationCard
                        key={item.id}
                        item={item}
                        onAction={() => action ? runAction(action) : addToast("No action available for this item", "info")}
                      />
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center border border-dashed border-white/10">
                    <Store className="mx-auto h-12 w-12 text-white/10 mb-4" />
                    <p className="text-sm text-white/30">No restaurants found for this request.</p>
                  </div>
                )
              )}
              {activeTab === "dineout" && (
                data.dineouts.length > 0 ? (
                  data.dineouts.map((item) => (
                    <RecommendationCard
                      key={item.id}
                      item={item}
                      onAction={() => addToast("Dineout booking coming soon", "info")}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center border border-dashed border-white/10">
                    <CalendarClock className="mx-auto h-12 w-12 text-white/10 mb-4" />
                    <p className="text-sm text-white/30">No dineout options available.</p>
                  </div>
                )
              )}
              {activeTab === "instamart" && (
                data.groceries.length > 0 ? (
                  data.groceries.map((item) => {
                    const action = data.actions.find(a => a.payload?.recommendationId === item.id);
                    return (
                      <RecommendationCard
                        key={item.id}
                        item={item}
                        onAction={() => action ? runAction(action) : addToast("No action available for this item", "info")}
                      />
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center border border-dashed border-white/10">
                    <ShoppingBasket className="mx-auto h-12 w-12 text-white/10 mb-4" />
                    <p className="text-sm text-white/30">Instamart has no matching products.</p>
                  </div>
                )
              )}
              {activeTab === "track" && (
                data.orders && data.orders.length > 0 ? (
                  data.orders.map((order) => (
                    <div key={order.orderId} className="col-span-full mb-4 border border-white/10 bg-white/[0.02] p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{order.restaurantName || "Swiggy Order"}</h3>
                          <p className="text-xs text-white/50 mt-1">Order #{order.orderId}</p>
                        </div>
                        <span className="bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">{order.orderStatus}</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-white/80">{order.statusMessage || "Order is in progress"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center border border-dashed border-white/10">
                    <MapPin className="mx-auto h-12 w-12 text-white/10 mb-4" />
                    <p className="text-sm text-white/30">No active orders found.</p>
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Chat Sidebar - Right (Copilot) */}
      <aside className="flex w-96 flex-col border-l border-white/10 bg-[#0d100f]">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#f75000]" />
            <h2 className="font-bold">Nourish Copilot</h2>
          </div>
          <button onClick={refreshContext} className="text-white/40 hover:text-white">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <Sparkles className="h-10 w-10 text-white/5 mb-4" />
              <p className="text-sm text-white/30 leading-6">
                Ask Copilot to find high protein dinner, check grocery deals, or suggest a weekend dineout.
              </p>
            </div>
          ) : (
            messages.map((message, i) => (
              <div key={i} className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "bg-[#f75000] text-black font-medium" : "bg-white/5 text-white/80 border border-white/10"
                  }`}>
                  {message.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-3 text-xs text-white/30 font-medium italic">
              <Loader2 className="h-3 w-3 animate-spin" />
              Agent is thinking...
            </div>
          )}
          <div id="chat-end" />
        </div>

        <div className="p-6">
          <form onSubmit={submitPrompt} className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitPrompt(e as any); } }}
              className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 pb-12 text-sm text-white outline-none focus:border-[#f75000] transition-all"
              placeholder="Ask anything..."
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-xl bg-[#f75000] text-black transition hover:bg-[#ff7a3d] disabled:opacity-20"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>
    </main>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: any, label: string, count: number }) {
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

function RecommendationCard({ item, onAction }: { item: Recommendation, onAction: () => void }) {
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
