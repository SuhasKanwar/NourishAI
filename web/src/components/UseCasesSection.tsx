"use client";

import { Dumbbell, Briefcase, HeartPulse, GraduationCap } from "lucide-react";

const cases = [
    {
        icon: <Dumbbell size={22} />,
        persona: "Fitness Enthusiast",
        headline: "Hit macros without tracking every bite",
        description:
            "NourishAI auto-schedules high-protein meals around your workout calendar. When you log a PR, it recalibrates your calorie surplus — no spreadsheets needed.",
        tags: ["Macro tracking", "Workout sync", "Auto-reorder"],
        accent: "#f75000",
        accentBg: "rgba(247,80,0,0.1)",
    },
    {
        icon: <Briefcase size={22} />,
        persona: "Busy Professional",
        headline: "Healthy eating on a packed schedule",
        description:
            "Tell NourishAI your weekly budget and working hours. It plans lunches, places Swiggy orders before your meeting gaps, and handles grocery restocks in the background.",
        tags: ["Budget control", "Auto-ordering", "Zero effort"],
        accent: "#f75000",
        accentBg: "rgba(247,80,0,0.1)",
    },
    {
        icon: <HeartPulse size={22} />,
        persona: "Health-Conscious Family",
        headline: "One plan that works for everyone",
        description:
            "Set individual dietary profiles for each family member. The multi-agent engine finds meals that satisfy allergies, preferences, and nutrition goals all at once.",
        tags: ["Multi-profile", "Allergy-aware", "Family recipes"],
        accent: "#f75000",
        accentBg: "rgba(247,80,0,0.1)",
    },
    {
        icon: <GraduationCap size={22} />,
        persona: "Student on a Budget",
        headline: "Eat well without overspending",
        description:
            "The budget agent monitors daily spend in real time. It swaps ingredients, finds offers, and still keeps meals balanced — perfect for hostel life or shared kitchens.",
        tags: ["Budget alerts", "Smart swaps", "Quick meals"],
        accent: "#f75000",
        accentBg: "rgba(247,80,0,0.1)",
    },
];

export default function UseCasesSection() {
    return (
        <section
            id="use-cases"
            className="relative overflow-hidden px-6 py-28"
            style={{ background: "#080b0a" }}
        >
            {/* ambient glow */}
            <div
                className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2"
                style={{
                    background:
                        "linear-gradient(90deg, transparent, rgba(247,80,0,0.35), transparent)",
                }}
            />

            <div className="relative z-10 mx-auto max-w-6xl">
                {/* heading */}
                <div className="mb-16 text-center">
                    <span
                        className="mb-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                        style={{
                            borderColor: "rgba(247,80,0,0.35)",
                            color: "#f75000",
                            background: "rgba(247,80,0,0.07)",
                        }}
                    >
                        Who it's for
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
                        Built for every{" "}
                        <span style={{ color: "#f75000" }}>lifestyle</span>
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
                        Whether you're chasing performance, saving time, or watching
                        your wallet — NourishAI adapts its agents to your reality.
                    </p>
                </div>

                {/* cards grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {cases.map((c, i) => (
                        <div
                            key={i}
                            className="group relative overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-0.5"
                            style={{
                                background: "#0d100f",
                                borderColor: "rgba(255,255,255,0.07)",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLDivElement).style.borderColor = `${c.accent}40`;
                                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 32px ${c.accent}10`;
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                            }}
                        >
                            {/* background accent blob */}
                            <div
                                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                                style={{ background: c.accentBg }}
                            />

                            <div className="relative z-10 flex flex-col gap-4">
                                {/* persona + icon */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                                        style={{ background: c.accentBg, color: c.accent }}
                                    >
                                        {c.icon}
                                    </div>
                                    <span
                                        className="text-xs font-semibold uppercase tracking-widest"
                                        style={{ color: c.accent }}
                                    >
                                        {c.persona}
                                    </span>
                                </div>

                                {/* headline */}
                                <h3
                                    className="font-semibold leading-snug"
                                    style={{ color: "#f6f9fc", fontSize: "1.15rem" }}
                                >
                                    {c.headline}
                                </h3>

                                {/* body */}
                                <p
                                    style={{
                                        fontSize: "0.875rem",
                                        color: "rgba(200,210,205,0.65)",
                                        lineHeight: 1.75,
                                    }}
                                >
                                    {c.description}
                                </p>

                                {/* tags */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {c.tags.map((tag, t) => (
                                        <span
                                            key={t}
                                            className="rounded-full px-3 py-1 text-xs font-medium"
                                            style={{
                                                background: c.accentBg,
                                                color: c.accent,
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
