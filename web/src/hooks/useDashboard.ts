import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { AgentResponse, ChatMessage, LocationState, Toast, DashboardAction } from "@/types/dashboard";

export function useDashboard() {
  const [data, setData] = useState<AgentResponse>({
    recommendations: [],
    restaurants: [],
    dineouts: [],
    groceries: [],
    actions: [],
    reasoning: "Awaiting your first request...",
    context: { location: "Initializing...", weather: "Detecting...", budget_remaining: 0, meal_type: "daily" },
    budget: {},
    ui_patch: {},
  });

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"food" | "dineout" | "instamart" | "track">("food");
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetEditing, setBudgetEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);
  
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  
  const [location, setLocation] = useState<LocationState>({ status: "detecting" });
  const autoRequestSent = useRef(false);

  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const runAgent = async (userPrompt: string, budgetLimit: number, isAuto = false) => {
    setLoading(true);
    if (!isAuto) {
      setMessages((current) => [...current, { role: "user", content: userPrompt }]);
    }
    try {
      const response = await axios.post("/api/agent/run", {
        prompt: userPrompt,
        location: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
        budget_limit: budgetLimit,
        swiggy_token: null,
      });

      setData((current) => ({
        ...current,
        ...response.data,
      }));
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.data.reasoning },
      ]);
    } catch (err: any) {
      addToast(err.response?.data?.message || "Agent failed to respond.", "error");
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: DashboardAction) => {
    setActionLoading(action.id);
    try {
      const response = await axios.post("/api/agent/action", { action });
      const result = response.data;

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
        setMessages((current) => [...current, { role: "assistant", content: result.message }]);
      }

      if (result.data) {
        setData((current) => ({
          ...current,
          ...result.data,
          actions: result.data.actions || current.actions.map((item) =>
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
  };

  return {
    data, setData,
    prompt, setPrompt,
    messages, setMessages,
    loading, setLoading,
    actionLoading, setActionLoading,
    activeTab, setActiveTab,
    toasts, setToasts,
    budgetDialogOpen, setBudgetDialogOpen,
    budgetEditing, setBudgetEditing,
    budgetInput, setBudgetInput,
    budgetSaving, setBudgetSaving,
    menuModalOpen, setMenuModalOpen,
    cartModalOpen, setCartModalOpen,
    location, setLocation,
    autoRequestSent,
    addToast,
    runAgent,
    runAction
  };
}
