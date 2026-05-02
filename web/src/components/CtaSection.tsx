"use client";

import { ArrowRight, Sparkles } from "lucide-react";

const stats = [
    { value: "6+", label: "AI Agents" },
    { value: "10k+", label: "Recipes" },
    { value: "3", label: "MCP APIs" },
    { value: "< 2s", label: "Response Time" },
];

export default function CtaSection() {
    return (
        <section
            id="cta"
            className="relative overflow-hidden px-6 py-28"
            style={{ background: "#080b0a" }}
        >
            {/* decorative blobs */}
            <div
                className="pointer-events-none absolute -left-40 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
                style={{ background: "radial-gradient(circle, #f75000, transparent 70%)" }}
            />
            <div
                className="pointer-events-none absolute -right-40 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
                style={{ background: "radial-gradient(circle, #7830dc, transparent 70%)" }}
            />

            <div className="relative z-10 mx-auto max-w-5xl">
                {/* stats bar */}
                <div
                    className="mb-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4"
                    style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
                >
                    {stats.map((s, i) => (
                        <div
                            key={i}
                            className="flex flex-col items-center gap-1 px-6 py-6"
                            style={{ background: "#0d100f" }}
                        >
                            <span
                                className="font-mono text-3xl font-bold"
                                style={{ color: "#f75000" }}
                            >
                                {s.value}
                            </span>
                            <span
                                className="text-xs uppercase tracking-widest"
                                style={{ color: "rgba(246,249,252,0.4)" }}
                            >
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* CTA block */}
                <div
                    className="relative overflow-hidden rounded-3xl border p-12 text-center"
                    style={{
                        borderColor: "rgba(247,80,0,0.2)",
                        background:
                            "linear-gradient(135deg, rgba(247,80,0,0.06) 0%, rgba(13,16,15,0.95) 50%, rgba(120,48,220,0.04) 100%)",
                    }}
                >
                    {/* inner glow */}
                    <div
                        className="pointer-events-none absolute inset-0 rounded-3xl"
                        style={{
                            background:
                                "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(247,80,0,0.08) 0%, transparent 70%)",
                        }}
                    />

                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div
                            className="flex items-center gap-2 rounded-full border px-4 py-1.5"
                            style={{
                                borderColor: "rgba(247,80,0,0.3)",
                                background: "rgba(247,80,0,0.08)",
                            }}
                        >
                            <Sparkles size={14} style={{ color: "#f75000" }} />
                            <span
                                className="text-xs font-semibold uppercase tracking-widest"
                                style={{ color: "#f75000" }}
                            >
                                Early Access Open
                            </span>
                        </div>

                        <h2
                            style={{
                                fontSize: "clamp(2rem, 4.5vw, 3.4rem)",
                                fontWeight: 800,
                                color: "#f6f9fc",
                                lineHeight: 1.1,
                                maxWidth: "16ch",
                            }}
                        >
                            Let AI handle your{" "}
                            <span style={{ color: "#f75000" }}>nutrition</span> — fully.
                        </h2>

                        <p
                            style={{
                                fontSize: "1rem",
                                color: "rgba(246,249,252,0.5)",
                                maxWidth: "48ch",
                                lineHeight: 1.8,
                            }}
                        >
                            Join the waitlist and be the first to experience a nutrition
                            companion that plans, orders, and adapts — all on its own.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                            <button
                                className="flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.03] hover:brightness-110"
                                style={{
                                    background:
                                        "linear-gradient(135deg, #f75000, #c93e00)",
                                    color: "#fff",
                                    boxShadow: "0 4px 24px rgba(247,80,0,0.35)",
                                }}
                            >
                                Join the Waitlist
                                <ArrowRight size={16} />
                            </button>

                            <button
                                className="rounded-full border px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:border-orange-500/40 hover:bg-white/5"
                                style={{
                                    borderColor: "rgba(255,255,255,0.12)",
                                    color: "rgba(246,249,252,0.75)",
                                }}
                            >
                                View on GitHub
                            </button>
                        </div>
                    </div>
                </div>

                {/* footer note */}
                <p
                    className="mt-8 text-center text-xs"
                    style={{ color: "rgba(246,249,252,0.25)" }}
                >
                    No credit card required · Open-source core · Privacy-first by design
                </p>
            </div>
        </section>
    );
}
