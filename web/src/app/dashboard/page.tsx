"use client";

import { FormEvent, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarClock,
  Check,
  ChefHat,
  CloudSun,
  Loader2,
  MapPin,
  RefreshCw,
  Send,
  ShoppingBasket,
  Sparkles,
  WalletCards,
  X,
  Bell,
  ArrowRight,
  Pizza,
  UtensilsCrossed,
  ReceiptText
} from "lucide-react";
import axios from "axios";
import Image from "next/image";

import { useDashboard } from "@/hooks/useDashboard";
import { RecommendationCard } from "@/components/ui/RecommendationCard";
import { MenuModal, CartModal } from "@/components/ui/Modals";
import { TrackingTab } from "@/components/ui/TrackingTab";
import { ContextBadge } from "@/components/ui/ContextBadge";
import { TabButton } from "@/components/ui/TabButton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Dashboard() {
  const {
    data, setData,
    prompt, setPrompt,
    messages, setMessages,
    loading,
    actionLoading,
    activeTab, setActiveTab,
    toasts, setToasts,
    budgetDialogOpen, setBudgetDialogOpen,
    budgetEditing, setBudgetEditing,
    budgetInput, setBudgetInput,
    menuModalOpen, setMenuModalOpen,
    cartModalOpen, setCartModalOpen,
    location, setLocation,
    autoRequestSent,
    addToast,
    runAgent,
    runAction
  } = useDashboard();

  const monthlyBudget = typeof window !== "undefined" ? localStorage.getItem("monthly_budget") : null;

  useEffect(() => {
    if (!monthlyBudget) {
      setBudgetDialogOpen(true);
    } else {
      setBudgetDialogOpen(false);
      setBudgetInput(monthlyBudget);
      loadBudget();
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const label = res.data.display_name.split(",")[0] + ", " + (res.data.address.city || res.data.address.town || res.data.address.village || "");
            setLocation({
              label,
              latitude,
              longitude,
              status: "ready",
            });
          } catch {
            // Fallback to coordinates if reverse geocoding fails
            setLocation({
              label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              latitude,
              longitude,
              status: "ready",
            });
          }
        },
        () => setLocation({ status: "denied" }),
      );
    } else {
      setLocation({ status: "unsupported" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyBudget]);

  useEffect(() => {
    if (autoRequestSent.current || !monthlyBudget || location.status === "detecting") return;
    autoRequestSent.current = true;
    setTimeout(() => {
      void runAgent(
        "Build today's plan using my live location, time, weather, budget, Swiggy restaurants, Dineout, and Instamart.",
        Number(monthlyBudget),
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
      const res = await axios.get("/api/user/budget");
      if (res.data) {
        setData(curr => ({ ...curr, budget: res.data }));
      }
    } catch (err) {
      console.error("Failed to load budget", err);
    }
  }

  async function saveBudget(val: number) {
    try {
      const response = await axios.post("/api/user/budget", { monthly_limit: val });
      localStorage.setItem("monthly_budget", val.toString());
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
    } catch (err) {
      addToast("Failed to save budget", "error");
    }
  }

  const submitBudget = async (e: FormEvent) => {
    e.preventDefault();
    const val = Number(budgetInput);
    if (val > 0) await saveBudget(val);
  };

  const submitPrompt = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const currentPrompt = prompt;
    setPrompt("");
    await runAgent(currentPrompt, limit);
  };

  useEffect(() => {
    const el = document.getElementById("chat-end");
    el?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

      <MenuModal
        isOpen={menuModalOpen}
        onClose={() => setMenuModalOpen(false)}
        menu={data.menu || []}
        actions={data.actions}
        runAction={runAction}
        addToast={addToast}
      />

      <CartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        cart={data.cart}
        runAction={runAction}
      />

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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitBudget(e as any); } }}
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
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveBudget(Number(budgetInput)); } }}
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
                  <EmptyState text="No restaurants found for this request." />
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
                  <EmptyState text="Instamart has no matching products." />
                )
              )}
              {activeTab === "track" && (
                <TrackingTab orders={data.orders} />
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
