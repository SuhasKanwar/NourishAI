"use client";

import Image from "next/image";

const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Tech Stack", href: "#tech-stack" },
    { label: "Use Cases", href: "#use-cases" },
];

const legalLinks = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
];

const GithubIcon = () => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const LinkedinIcon = () => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
);

const socials = [
    { icon: <GithubIcon />, href: "https://github.com/SuhasKanwar", label: "GitHub" },
    { icon: <LinkedinIcon />, href: "https://www.linkedin.com/in/suhas-kanwar-4a3a09291", label: "LinkedIn" },
];

export default function Footer() {
    return (
        <footer
            style={{ background: "#060908", borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
            <div
                className="h-px w-full"
                style={{
                    background:
                        "linear-gradient(90deg, transparent 0%, rgba(247,80,0,0.4) 50%, transparent 100%)",
                }}
            />

            <div className="mx-auto max-w-6xl px-6 py-14">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg"
                                style={{ background: "rgba(247,80,0,0.15)", color: "#f75000" }}
                            >
                                <Image src="/short-logo.png" alt="Logo" width={20} height={20} />
                            </div>
                            <span
                                className="text-lg font-bold tracking-tight"
                                style={{ color: "#f6f9fc" }}
                            >
                                NourishAI
                            </span>
                        </div>
                        <p
                            style={{
                                fontSize: "0.875rem",
                                color: "rgba(246,249,252,0.4)",
                                lineHeight: 1.75,
                                maxWidth: "30ch",
                            }}
                        >
                            An autonomous, multi-agent nutrition companion that plans,
                            orders, and adapts — so you can focus on living well.
                        </p>

                        <div className="flex gap-3 pt-1">
                            {socials.map((s, i) => (
                                <a
                                    key={i}
                                    href={s.href}
                                    aria-label={s.label}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 hover:border-orange-500/30 hover:bg-white/5"
                                    style={{
                                        borderColor: "rgba(255,255,255,0.08)",
                                        color: "rgba(246,249,252,0.5)",
                                    }}
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p
                            className="mb-5 text-xs font-semibold uppercase tracking-widest"
                            style={{ color: "rgba(246,249,252,0.3)" }}
                        >
                            Navigation
                        </p>
                        <ul className="flex flex-col gap-3">
                            {navLinks.map((l, i) => (
                                <li key={i}>
                                    <a
                                        href={l.href}
                                        className="text-sm transition-colors duration-150 hover:text-orange-400"
                                        style={{ color: "rgba(246,249,252,0.55)" }}
                                    >
                                        {l.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p
                            className="mb-5 text-xs font-semibold uppercase tracking-widest"
                            style={{ color: "rgba(246,249,252,0.3)" }}
                        >
                            Legal
                        </p>
                        <ul className="flex flex-col gap-3">
                            {legalLinks.map((l, i) => (
                                <li key={i}>
                                    <a
                                        href={l.href}
                                        className="text-sm transition-colors duration-150 hover:text-orange-400"
                                        style={{ color: "rgba(246,249,252,0.55)" }}
                                    >
                                        {l.label}
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <div
                            className="mt-8 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                            style={{
                                borderColor: "rgba(48,212,168,0.25)",
                                background: "rgba(48,212,168,0.06)",
                            }}
                        >
                            <span
                                className="h-1.5 w-1.5 animate-pulse rounded-full"
                                style={{ background: "#30d4a8" }}
                            />
                            <span
                                className="text-xs font-medium"
                                style={{ color: "#30d4a8" }}
                            >
                                All systems operational
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                    <p
                        className="text-xs"
                        style={{ color: "rgba(246,249,252,0.25)" }}
                    >
                        © {new Date().getFullYear()} NourishAI. All rights reserved.
                    </p>
                    <p
                        className="text-xs"
                        style={{ color: "rgba(246,249,252,0.2)" }}
                    >
                        Built with LangGraph · Gemini · FAISS · Next.js
                    </p>
                </div>
            </div>
        </footer>
    );
}