"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Pages that don't require authentication
  const publicPages = ["/", "/login", "/register"];

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isPublicPage =
      publicPages.includes(pathname) || pathname.startsWith("/emergency");

    if (!token && !isPublicPage) {
      // Redirect to login if trying to access a protected route without a token
      router.push("/login?redirect=" + encodeURIComponent(pathname));
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Optionally show a loading spinner while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
