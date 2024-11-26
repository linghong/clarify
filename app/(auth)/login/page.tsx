"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white/30 backdrop-blur-md p-8 rounded-xl">
        <div>
          <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Sign in to your account
          </h1>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} aria-label="Sign in form">
          {error && (
            <div className="text-red-500 text-center" role="alert" aria-live="polite">
              {error}
            </div>
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
                className="relative block w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                autoComplete="current-password"
                required
                className="relative block w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
  );
}
