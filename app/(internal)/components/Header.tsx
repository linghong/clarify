import { User, BookOpen, Home, LogOut, Menu } from "lucide-react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useState } from "react";

interface HeaderProps {
  title?: string;
  userName: string;
  currentPage: 'dashboard' | 'courses' | 'profile';
}

export default function Header({ userName, currentPage }: HeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <nav className="bg-gray-600/95 shadow-md">
      <div className="w-full px-2 lg:px-8">
        <div className="flex h-14 justify-between items-center">
          <div className="flex items-center space-x-8">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                variant="ghost"
                className="md:hidden -ml-2"
              >
                <Menu className="h-5 w-5 text-gray-300" />
              </Button>
              <div className="ml-0 lg:-ml-6">
                <Logo />
              </div>
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
              Welcome, {userName}
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