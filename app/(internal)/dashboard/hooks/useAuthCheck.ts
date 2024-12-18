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
  setUserData: (userData: UserData | null) => void,
  router: RouterInstance,
  mounted: boolean
) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        const data = await response.json();
        setUserData(data.user);
      } catch (error) {
        console.log(error)
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [mounted, router, setUserData]);

  return { mounted, loading };
}
