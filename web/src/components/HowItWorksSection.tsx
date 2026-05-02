"use client";

import {
    Target,
    Brain,
    Cpu,
    ShoppingCart,
    ArrowRight,
} from "lucide-react";

const steps = [
    {
        number: "01",
        icon: <Target size={20} />,
        title: "Set Your Goals",
        description:
            "Define dietary preferences, budget limits, health targets, and cuisine choices. NourishAI maps them into a structured user profile.",
    },
    {
        number: "02",
        icon: <Brain size={20} />,
        title: "Agents Analyse & Plan",
        description:
            "Specialised AI agents for budget, health, and preference independently evaluate options and reach a consensus on the optimal daily plan.",
    },
    {
        number: "03",
        icon: <Cpu size={20} />,
        title: "Context Is Applied",
        description:
            "Real-time signals — time of day, activity, inventory levels, past patterns — refine the plan before any action is taken.",
    },
    {
        number: "04",
        icon: <ShoppingCart size={20} />,
        title: "Actions Execute Automatically",
        description:
            "MCP API integrations place orders, schedule deliveries, and send reminders — no manual steps required from you.",
    },
];

export default function HowItWorksSection() {
    return (
        <section
            id="how-it-works"
            className="relative overflow-hidden px-6 py-28"
            style={{ background: "#080b0a" }}
        >
            {/* subtle grid texture */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(247,80,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(247,80,0,0.8) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
            />

            <div className="relative z-10 mx-auto max-w-6xl">
                {/* heading */}
                <div className="mb-20 text-center">
                    <span
                        className="mb-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                        style={{
                            borderColor: "rgba(247,80,0,0.35)",
                            color: "#f75000",
                            background: "rgba(247,80,0,0.07)",
                        }}
                    >
                        How it works
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
                        From goal to action —{" "}
                        <span style={{ color: "#f75000" }}>fully automated</span>
                    </h2>
                    <p
                        className="mx-auto mt-4"
                        style={{
                            fontSize: "0.95rem",
                            color: "rgba(246,249,252,0.5)",
                            maxWidth: "46ch",
                            lineHeight: 1.75,
                        }}
                    >
                        Four intelligent stages turn a simple preference into real-world
                        nutrition decisions without you lifting a finger.
                    </p>
                </div>

                {/* steps */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {steps.map((step, i) => (
                        <div key={i} className="group relative flex flex-col gap-5">
                            {/* connector line (not on last card) */}
                            {i < steps.length - 1 && (
                                <div
                                    className="pointer-events-none absolute right-0 top-8 hidden h-px w-6 translate-x-full lg:block"
                                    style={{ background: "rgba(247,80,0,0.25)" }}
                                />
                            )}

                            <div
                                className="flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-300 group-hover:-translate-y-1"
                                style={{
                                    background: "#0d100f",
                                    borderColor: "rgba(255,255,255,0.07)",
                                    boxShadow: "0 0 0 0 rgba(247,80,0,0)",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLDivElement).style.borderColor =
                                        "rgba(247,80,0,0.3)";
                                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                                        "0 0 24px rgba(247,80,0,0.08)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLDivElement).style.borderColor =
                                        "rgba(255,255,255,0.07)";
                                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                                        "0 0 0 0 rgba(247,80,0,0)";
                                }}
                            >
                                {/* step number + icon */}
                                <div className="flex items-center justify-between">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                                        style={{
                                            background: "rgba(247,80,0,0.12)",
                                            color: "#f75000",
                                        }}
                                    >
                                        {step.icon}
                                    </div>
                                    <span
                                        className="font-mono text-3xl font-bold leading-none"
                                        style={{ color: "rgba(247,80,0,0.15)" }}
                                    >
                                        {step.number}
                                    </span>
                                </div>

                                <div>
                                    <h3
                                        className="mb-2 font-semibold"
                                        style={{ color: "#f6f9fc", fontSize: "1rem" }}
                                    >
                                        {step.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: "0.875rem",
                                            color: "rgba(200,210,205,0.7)",
                                            lineHeight: 1.7,
                                        }}
                                    >
                                        {step.description}
                                    </p>
                                </div>
                            </div>

                            {/* mobile arrow */}
                            {i < steps.length - 1 && (
                                <div className="flex justify-center lg:hidden">
                                    <ArrowRight
                                        size={16}
                                        style={{ color: "rgba(247,80,0,0.4)" }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
