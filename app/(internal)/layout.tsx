"use client";

import Header from "@/app/(internal)/components/Header";
import { usePathname } from "next/navigation";

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Determine current page from pathname
  const pathname = usePathname();
  const currentPage = pathname.includes('/courses')
    ? 'courses'
    : pathname.includes('/profile')
      ? 'profile'
      : 'dashboard';

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage={currentPage} />
      {children}
    </div>
  );
} 