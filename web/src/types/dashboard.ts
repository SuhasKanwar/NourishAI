export type Recommendation = {
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

export type DashboardAction = {
  id: string;
  label: string;
  type: "order_food" | "order_groceries" | "book_table" | "schedule" | "modify" | "view_menu" | "add_to_cart" | "view_cart" | "checkout" | "track";
  status: "suggested" | "requires_auth" | "ready" | "scheduled" | "completed";
  payload: Record<string, unknown>;
};

export type AgentResponse = {
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

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LocationState = {
  label?: string;
  latitude?: number;
  longitude?: number;
  status: "detecting" | "ready" | "denied" | "unsupported";
};

export type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};
