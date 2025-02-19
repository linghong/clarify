import { useEffect, useState } from 'react';
// No import from 'next/router'
// Instead, define a type based on useRouter from next/navigation if needed
import type { UserData } from "@/types/auth";

// We assume router is what comes from useRouter in next/navigation
// You can define a type if needed, or just use `any` if you want a quick fix:
type RouterInstance = {
  push: (url: string) => void;
};

interface UseAuthCheckProps {
  loading: boolean;
}

export function useAuthCheck(
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>,
  router: RouterInstance,
  mounted: boolean
): UseAuthCheckProps {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);  // Set loading false before redirect
          router.push("/login");
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          localStorage.removeItem("token");
          setLoading(false);  // Set loading false before redirect
          router.push("/login");
          return;
        }

        setUserData(data.user);
        setLoading(false);
      } catch (error) {
        console.log(error);
        localStorage.removeItem("token");
        setLoading(false);  // Set loading false before redirect
        router.push("/login");
      }
    };

    checkAuth();
  }, [mounted, router, setUserData]);

  return { loading };
}
