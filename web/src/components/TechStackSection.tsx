"use client";

import { Database, Network, Server, FlaskConical, GitBranch, Shield } from "lucide-react";

const stack = [
    {
        layer: "Orchestration",
        icon: <GitBranch size={18} />,
        name: "LangGraph",
        detail: "Stateful multi-agent graph execution with conditional edges and human-in-the-loop support.",
        badge: "Core",
    },
    {
        layer: "Language Model",
        icon: <FlaskConical size={18} />,
        name: "LLM",
        detail: "Reasoning-grade LLM powering agent decisions, meal planning, and natural language understanding.",
        badge: "AI",
    },
    {
        layer: "Vector Memory",
        icon: <Database size={18} />,
        name: "FAISS",
        detail: "High-speed in-process similarity search for semantic retrieval of user history and preferences.",
        badge: "Memory",
    },
    {
        layer: "Persistent Storage",
        icon: <Server size={18} />,
        name: "PostgreSQL",
        detail: "Structured storage for user profiles, order history, plans, and longitudinal health data.",
        badge: "Storage",
    },
    {
        layer: "Real-World APIs",
        icon: <Network size={18} />,
        name: "Swiggy MCP",
        detail: "Model Context Protocol integration enabling agents to order food, schedule deliveries, and book tables.",
        badge: "Execution",
    },
    {
        layer: "Auth & Security",
        icon: <Shield size={18} />,
        name: "NextAuth + JWT",
        detail: "Secure session management with encrypted tokens and zero-knowledge data handling principles.",
        badge: "Security",
    },
];

const badgeColor: Record<string, string> = {
    Core: "rgba(247,80,0,0.15)",
    AI: "rgba(120,60,220,0.18)",
    Memory: "rgba(0,160,120,0.15)",
    Storage: "rgba(40,100,220,0.18)",
    Execution: "rgba(220,150,0,0.15)",
    Security: "rgba(200,50,80,0.15)",
};
const badgeText: Record<string, string> = {
    Core: "#f75000",
    AI: "#a87ef5",
    Memory: "#30d4a8",
    Storage: "#6aaaff",
    Execution: "#f5c842",
    Security: "#f06080",
};

export default function TechStackSection() {
    return (
        <section
            id="tech-stack"
            className="relative overflow-hidden px-6 py-28"
            style={{ background: "#0a0d0c" }}
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 45% at 80% 50%, rgba(120,60,220,0.05) 0%, transparent 70%)",
                }}
            />

            <div className="relative z-10 mx-auto max-w-6xl">
                <div className="mb-16 max-w-xl">
                    <span
                        className="mb-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                        style={{
                            borderColor: "rgba(247,80,0,0.35)",
                            color: "#f75000",
                            background: "rgba(247,80,0,0.07)",
                        }}
                    >
                        Under the hood
                    </span>
                    <h2
                        className="mt-4"
                        style={{
                            fontSize: "clamp(1.9rem, 3.8vw, 2.9rem)",
                            fontWeight: 700,
                            color: "#f6f9fc",
                            lineHeight: 1.15,
                        }}
                    >
                        Built on a{" "}
                        <span style={{ color: "#f75000" }}>
                            production-grade AI stack
                        </span>
                    </h2>
                    <p
                        className="mt-4"
                        style={{
                            fontSize: "0.95rem",
                            color: "rgba(246,249,252,0.5)",
                            lineHeight: 1.75,
                        }}
                    >
                        Every layer is chosen for performance, reliability, and the
                        specific demands of agentic, real-time food intelligence.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stack.map((item, i) => (
                        <div
                            key={i}
                            className="group relative flex flex-col gap-3 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5"
                            style={{
                                background: "#0d100f",
                                borderColor: "rgba(255,255,255,0.07)",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLDivElement).style.borderColor =
                                    "rgba(247,80,0,0.25)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow =
                                    "0 0 28px rgba(247,80,0,0.06)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLDivElement).style.borderColor =
                                    "rgba(255,255,255,0.07)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                                        style={{
                                            background: badgeColor[item.badge],
                                            color: badgeText[item.badge],
                                        }}
                                    >
                                        {item.icon}
                                    </div>
                                    <span
                                        className="text-xs font-medium uppercase tracking-wider"
                                        style={{ color: "rgba(246,249,252,0.35)" }}
                                    >
                                        {item.layer}
                                    </span>
                                </div>
                                <span
                                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                    style={{
                                        background: badgeColor[item.badge],
                                        color: badgeText[item.badge],
                                    }}
                                >
                                    {item.badge}
                                </span>
                            </div>

                            <p
                                className="font-semibold"
                                style={{ color: "#f6f9fc", fontSize: "1.05rem" }}
                            >
                                {item.name}
                            </p>

                            <p
                                style={{
                                    fontSize: "0.85rem",
                                    color: "rgba(200,210,205,0.65)",
                                    lineHeight: 1.7,
                                }}
                            >
                                {item.detail}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}