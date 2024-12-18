import { useEffect, useState } from 'react';
// No import from 'next/router'
// Instead, define a type based on useRouter from next/navigation if needed

interface UserData {
  id: number;
  email: string;
  name: string | null;
}

// We assume router is what comes from useRouter in next/navigation
// You can define a type if needed, or just use `any` if you want a quick fix:
type RouterInstance = {
  push: (url: string) => void;
};

export function useAuthCheck(
  setUserData: (data: UserData | null) => void,
  router: RouterInstance // or use a more specific type if available
) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    return () => { };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Authentication failed");
        }

        const data = await response.json();
        setUserData(data.user);
      } catch (error) {
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, mounted]);

  return { mounted, loading };
}
