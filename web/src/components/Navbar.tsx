"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import CardNav from "./ui/card-nav";

const NAV_ITEMS = [
  {
    label: "Features",
    bgColor: "var(--primary-bg-color)",
    textColor: "var(--primary-text-color)",
    links: [
      { label: "AI Planning", ariaLabel: "AI Planning feature", href: "#features" },
      { label: "Multi-Agent", ariaLabel: "Multi-Agent Engine", href: "#features" },
    ],
  },
  {
    label: "Product",
    bgColor: "var(--primary-color)",
    textColor: "var(--primary-text-color)",
    links: [
      { label: "How It Works", ariaLabel: "How It Works", href: "#how-it-works" },
      { label: "Tech Stack", ariaLabel: "Tech Stack", href: "#tech-stack" },
    ],
  },
  {
    label: "More",
    bgColor: "var(--secondary-color)",
    textColor: "var(--primary-text-color)",
    links: [
      { label: "Use Cases", ariaLabel: "Use Cases", href: "#use-cases" },
      { label: "GitHub", ariaLabel: "GitHub", href: "https://github.com/SuhasKanwar" },
    ],
  },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isLoading = status === "loading";
  const isLoggedIn = !!session;
  const isOnDashboard = pathname?.startsWith("/dashboard");

  const buttonLabel = isLoading
    ? "..."
    : isLoggedIn && isOnDashboard
      ? "Logout"
      : isLoggedIn
        ? "Dashboard"
        : "Get Started";

  const handleCtaClick = () => {
    if (isLoading) return;

    if (isLoggedIn && isOnDashboard) {
      signOut({ callbackUrl: "/" });
    } else if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      signIn("google", { callbackUrl: "/dashboard" });
    }
  };

  return (
    <CardNav
      logo="/logo.png"
      logoAlt="NourishAI"
      items={NAV_ITEMS}
      baseColor="var(--primary-bg-color)"
      menuColor="var(--secondary-color)"
      buttonBgColor="var(--primary-bg-color)"
      buttonTextColor="var(--secondary-color)"
      ease="power3.out"
      buttonLabel={buttonLabel}
      onCtaClick={handleCtaClick}
    />
  );
}