import { User, BookOpen, Home, LogOut } from "lucide-react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

interface HeaderProps {
  title?: string;
  userName: string;
  currentPage: 'dashboard' | 'courses' | 'profile';
}

export default function Header({ userName, currentPage }: HeaderProps) {
  const router = useRouter();
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
      <div className="mx-auto max-w-7xl px-2">
        <div className="flex h-14 justify-between items-center">
          <div className="flex items-center space-x-8">
            <Logo />
            <div className="hidden sm:flex space-x-4">
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
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              Welcome, {userName}
            </span>
            {currentPage === 'dashboard' ? (
              <Link
                href="/profile"
                className="inline-flex items-center px-3 py-1 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Link>
            ) : null}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="ml-4 text-gray-500 border-gray-600 hover:bg-gray-700 hover:text-white inline-flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}