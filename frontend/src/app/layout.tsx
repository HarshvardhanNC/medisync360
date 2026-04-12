import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import AuthGuard from "../components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white flex flex-col`}>
        <Navbar />

        {/* Main Content Area */}
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <AuthGuard>
            {children}
          </AuthGuard>
        </main>
      </body>
    </html>
  );
}
