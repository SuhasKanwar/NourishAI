import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NourishAI",
  description: "Autonomous AI system that plans and manages daily food, groceries, and dining decisions using LLMs and multi-agent reasoning. It learns user habits, optimizes budget and health, and executes actions via Swiggy MCP APIs, shifting from passive suggestions to proactive, real-world automation.",
  authors: [
    {
      name: "Suhas Kanwar",
      url: "https://github.com/SuhasKanwar"
    },
    {
      name: "Suhas Kanwar",
      url: "https://suhaskanwar.vercel.app"
    }
  ],
  keywords: ["AI", "Autonomous Agents", "LLMs", "Multi-Agent Systems", "Food Management", "Grocery Planning", "Dining Decisions", "Health Optimization", "Budget Optimization", "Swiggy MCP APIs"]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-(--primary-bg-color)`}
      >
        <Providers>
          <Navbar />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}