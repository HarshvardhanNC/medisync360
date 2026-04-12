import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import AuthGuard from "../components/AuthGuard";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "900"] });

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
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen text-white flex flex-col relative overflow-x-hidden`}
        style={{
          background:
            "linear-gradient(135deg, #0d1321 0%, #0f172a 30%, #091120 60%, #04080f 100%)",
        }}
      >
        {/* Animated ambient orbs that sit behind all content */}
        <div
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          {/* Large teal orb */}
          <div
            className="animate-orb-drift absolute rounded-full"
            style={{
              width: "700px",
              height: "700px",
              top: "40%",
              left: "50%",
              background:
                "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          {/* Deep blue orb — top-right */}
          <div
            className="absolute rounded-full"
            style={{
              width: "500px",
              height: "500px",
              top: "-10%",
              right: "-10%",
              background:
                "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "orb-drift 11s ease-in-out infinite reverse",
            }}
          />
          {/* Subtle purple orb — bottom-left */}
          <div
            className="absolute rounded-full"
            style={{
              width: "400px",
              height: "400px",
              bottom: "0%",
              left: "-5%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
              filter: "blur(60px)",
              animation: "orb-drift 14s ease-in-out infinite",
            }}
          />
        </div>

        <Navbar />

        {/* Main Content Area */}
        <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </body>
    </html>
  );
}
