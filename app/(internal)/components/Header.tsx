import { User } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  userName: string;
  currentPage: 'dashboard' | 'profile';
}

export default function Header({ title, userName, currentPage }: HeaderProps) {
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 justify-between items-center">
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-xl font-bold">{title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">
              Welcome, {userName}
            </span>
            {currentPage === 'dashboard' ? (
              <Link
                href="/profile"
                className="inline-flex items-center px-3 py-1 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex items-center px-3 py-1 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                Dashboard
              </Link>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="ml-4"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}