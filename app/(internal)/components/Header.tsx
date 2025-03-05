"use client";

import { User, BookOpen, Home, LogOut, Menu } from "lucide-react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useState, useEffect } from "react";

interface HeaderProps {
  title?: string;
  currentPage: 'dashboard' | 'courses' | 'profile';
}

export default function Header({ currentPage }: HeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          const firstName = data.user.name.split(' ')[0]
          const userName = firstName ? firstName : data.user.email.split('@')[0]
          setUserName(userName);
        } else {
          console.error("Failed to fetch user name");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("token");
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="h-4 w-4" />,
      current: currentPage === 'dashboard'
    },
    {
      name: 'Courses',
      href: '/courses',
      icon: <BookOpen className="h-4 w-4" />,
      current: currentPage === 'courses'
    },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-gray-700 text-white shadow-md">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-5 w-5 text-gray-300" />
          </Button>

          <div className="ml-0 lg:-ml-6">
            <Logo />
          </div>

          <div className="hidden md:flex space-x-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm ${item.current
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-4 lg:pr-6">
          <span className="hidden md:inline text-gray-300">
            {userName ? `Welcome, ${userName}` : "Welcome"}
          </span>
          <Link
            href="/profile"
            className="inline-flex items-center px-3 py-1 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <User className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Profile</span>
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="ml-4 text-gray-500 border-gray-600 hover:bg-gray-700 hover:text-white inline-flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
        {isMenuOpen && (
          <div className="md:hidden py-2 px-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${item.current
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}