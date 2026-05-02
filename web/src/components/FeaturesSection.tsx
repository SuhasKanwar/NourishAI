"use client";

import MagicBento from "@/components/ui/magic-bento";
import type { BentoCardProps } from "@/components/ui/magic-bento";
import {
    BadgeCheck,
    Users,
    Zap,
    BrainCircuit,
    Lightbulb,
    BellRing,
} from "lucide-react";

const CARD_BG = "#0d100f";
const ICON_SIZE = 22;

const nourishCards: BentoCardProps[] = [
    {
        color: CARD_BG,
        label: "Autonomous Planning",
        title: "Autonomous Goal-Based Planning",
        description:
            "Users define high-level goals such as budget limits or dietary preferences, and the system automatically generates structured daily plans for meals, groceries, and dining, executing them over time without constant user input.",
        icon: <BadgeCheck size={ICON_SIZE} />,
    },
    {
        color: CARD_BG,
        label: "Multi-Agent AI",
        title: "Multi-Agent Decision Engine",
        description:
            "Multiple specialized agents (budget, health, preference) evaluate available options independently and collaboratively select the most optimal action, enabling balanced and context-aware decision-making.",
        icon: <Users size={ICON_SIZE} />,
    },
    {
        color: CARD_BG,
        label: "MCP Integration",
        title: "Real-World Execution via MCP APIs",
        description:
            "NourishAI integrates with Swiggy MCP APIs to directly perform actions such as ordering food, scheduling grocery deliveries, and booking restaurants, moving beyond recommendations to actual execution.",
        icon: <Zap size={ICON_SIZE} />,
    },
    {
        color: CARD_BG,
        label: "Memory & Learning",
        title: "Adaptive Memory and Personalization",
        description:
            "The system leverages FAISS for vector memory and PostgreSQL for structured storage to learn user habits, preferences, and spending patterns, continuously improving decision quality over time.",
        icon: <BrainCircuit size={ICON_SIZE} />,
    },
    {
        color: CARD_BG,
        label: "Context Awareness",
        title: "Context-Aware Intelligence",
        description:
            "Decisions are dynamically adjusted based on real-time context such as time of day, user activity, and usage patterns, ensuring that suggestions and actions remain relevant and timely.",
        icon: <Lightbulb size={ICON_SIZE} />,
    },
    {
        color: CARD_BG,
        label: "Automation",
        title: "Event-Driven Automation System",
        description:
            "Background workers monitor triggers such as low inventory, recurring routines, or scheduled plans, enabling proactive actions like automatic reordering and timely notifications without manual intervention.",
        icon: <BellRing size={ICON_SIZE} />,
    },
];

export default function FeaturesSection() {
    return (
        <section
            id="features"
            className="relative flex flex-col items-center overflow-hidden px-6 py-28"
            style={{ background: "#0a0d0c" }}
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(247,80,0,0.06) 0%, transparent 70%)",
                }}
            />

            <div className="relative z-10 w-full max-w-5xl text-center mb-4">
                <h2
                    style={{
                        fontSize: "clamp(1.9rem, 3.8vw, 2.9rem)",
                        fontWeight: 700,
                        color: "#f6f9fc",
                        lineHeight: 1.15,
                        margin: "0 0 0.85rem 0",
                    }}
                >
                    Everything your nutrition{" "}
                    <span style={{ color: "#f75000" }}>journey needs</span>
                </h2>
                <p
                    style={{
                        fontSize: "0.95rem",
                        color: "rgba(246,249,252,0.5)",
                        maxWidth: "44ch",
                        lineHeight: 1.75,
                        margin: "0 auto",
                    }}
                >
                    NourishAI combines cutting-edge AI with deep nutritional science to
                    give you a truly personalised health companion — not just a calorie counter.
                </p>
            </div>

            <div className="relative z-10 w-full flex justify-center">
                <MagicBento
                    textAutoHide={false}
                    enableStars
                    enableSpotlight
                    enableBorderGlow
                    enableTilt={false}
                    enableMagnetism={false}
                    clickEffect
                    spotlightRadius={400}
                    particleCount={12}
                    glowColor="247, 80, 0"
                    disableAnimations={false}
                    cards={nourishCards}
                />
            </div>
        </section>
    );
}