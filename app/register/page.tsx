"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import Head from "next/head";
import Link from "next/link";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
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
    return null;
  }

  return (
    <div className="min-h-screen relative" role="main">
      <Head>
        <title>Sign up for Clarify - AI Educational Assistant</title>
        <meta name="description" content="Create your Clarify account to access personalized AI-powered educational assistance." />
      </Head>

      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/ai-landing.png"
          alt="AI Educational Assistant Background"
          fill
          className="object-cover"
          quality={100}
          priority
          sizes="100vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/30" aria-hidden="true" />

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

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white/30 backdrop-blur-md p-8 rounded-xl">
          <div>
            <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
              Create your account
            </h1>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} aria-label="Sign up form">
            {error && (
              <div className="text-red-500 text-center" role="alert" aria-live="polite">
                {error}
              </div>
            )}
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="relative block w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-required="true"
                  aria-invalid={error ? "true" : "false"}
                />
              </div>
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
                  autoComplete="new-password"
                  required
                  className="relative block w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              aria-label="Create your account"
            >
              Create account
            </Button>
          </form>
          <div className="text-center">
            <Link
              href="/login"
              className="text-emerald-50 hover:text-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none rounded-md px-2 py-1"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}