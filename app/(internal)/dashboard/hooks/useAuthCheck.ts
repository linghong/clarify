import { useEffect, useState } from 'react';

type RouterInstance = {
  push: (url: string) => void;
};

interface UseAuthCheckProps {
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuthCheck(
  router: RouterInstance,
  mounted: boolean
): UseAuthCheckProps {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          setIsAuthenticated(false);
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
          setLoading(false);
          setIsAuthenticated(false);
          router.push("/login");
          return;
        }

        setIsAuthenticated(true);
        setLoading(false);
      } catch (error) {
        console.log(error);
        localStorage.removeItem("token");
        setLoading(false);
        setIsAuthenticated(false);
        router.push("/login");
      }
    };

    checkAuth();
  }, [mounted, router]);

  return { loading, isAuthenticated };
}
