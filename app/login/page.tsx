"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "An error occurred");
      }

      // Only run on client side
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!mounted) {
    return null; // or return a loading spinner
  }

  return (
    <div className="min-h-screen relative" role="main">
      {/* Add background and overlay similar to landing page */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/ai-landing.png"
          alt="AI Educational Assistant Site Background"
          fill
          className="object-cover"
          quality={100}
          priority
          sizes="100vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/20" aria-hidden="true" />

      {/* Add home link */}
      <div className="relative z-10 pt-4 px-4">
        <Link
          href="/"
          className={`${playfair.className} text-3xl italic hover:scale-105 transition-all duration-300`}
          aria-label="Return to Clarify home page"
        >
          <span className="bg-gradient-to-r from-emerald-300 via-white to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]">
            Clarify
          </span>
        </Link>
      </div>
      {/* Main content */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white/30 backdrop-blur-md p-8 rounded-xl">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
              Sign in to your account
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} aria-label="Sign in form">
            {error && (
              <div className="text-red-500 text-center" role="alert"
                aria-live="polite">{error}</div>
            )}
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-required="true"
                  aria-invalid={error ? "true" : "false"}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="relative block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-required="true"
                  aria-invalid={error ? "true" : "false"}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-800 text-white py-3 rounded-lg"
              aria-label="Sign in to your account"
            >
              Sign in
            </Button>
          </form>
          <div className="text-center">
            <Link href="/register" className="text-emerald-50 hover:text-emerald-200">
              Don't have an account? Sign up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
