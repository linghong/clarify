"use client";

import { useEffect } from "react";
import Header from "@/app/(internal)/components/Header";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/components/Toast";

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const currentPage = pathname.includes('/dashboard')
    ? 'dashboard'
    : pathname.includes('/courses')
      ? 'courses'
      : pathname.includes('/profile')
        ? 'profile'
        : 'dashboard';

  useEffect(() => {
    // Reset scroll position on route changes within internal pages
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <ToastProvider>
        <Header currentPage={currentPage as 'dashboard' | 'courses' | 'profile'} />
        {children}
      </ToastProvider>
    </div>
  );
} 