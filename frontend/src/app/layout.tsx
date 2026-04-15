import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import AuthGuard from "../components/AuthGuard";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "MediSync360",
  description: "AI-Driven, Blockchain-Backed Unified Healthcare Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${outfit.className} bg-zinc-950 text-zinc-50 min-h-screen flex flex-col relative overflow-x-hidden`}
      >
        {/* Very subtle mesh or gradient if needed, but keeping it clean for premium look */}
        <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none z-0" style={{
          background: 'radial-gradient(ellipse at 50% -20%, rgba(16, 185, 129, 0.1), transparent 70%)'
        }}></div>

        <Navbar />

        {/* Main Content Area */}
        <main className="relative z-10 pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </body>
    </html>
  );
}
