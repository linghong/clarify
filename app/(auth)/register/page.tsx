"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUpperCase: true,
  hasLowerCase: true,
  hasNumber: true,
  hasSpecialChar: true
};


export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Validate password against requirements
  const validatePassword = (pass: string): string[] => {
    const errors: string[] = [];

    if (pass.length < PASSWORD_REQUIREMENTS.minLength) {
      errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
    }
    if (PASSWORD_REQUIREMENTS.hasUpperCase && !/[A-Z]/.test(pass)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (PASSWORD_REQUIREMENTS.hasLowerCase && !/[a-z]/.test(pass)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (PASSWORD_REQUIREMENTS.hasNumber && !/\d/.test(pass)) {
      errors.push("Password must contain at least one number");
    }
    if (PASSWORD_REQUIREMENTS.hasSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(pass)) {
      errors.push("Password must contain at least one special character");
    }

    return errors;
  };

  // Handle password change with validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordErrors(validatePassword(newPassword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password before submission
    const errors = validatePassword(password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsLoading(true);

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

      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="sr-only">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                disabled={isLoading}
                className="relative block w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-required="true"
                aria-invalid={error ? "true" : "false"}
              />
            </div>

            {/* Email Input */}
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
                disabled={isLoading}
                className="relative block w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-required="true"
                aria-invalid={error ? "true" : "false"}
              />
            </div>

            {/* Password Input */}
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
                disabled={isLoading}
                className="relative block w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                aria-required="true"
                aria-invalid={passwordErrors.length > 0 ? "true" : "false"}
                aria-describedby="password-requirements"
              />
              {/* Password Requirements */}
              {passwordErrors.length > 0 && (
                <ul
                  id="password-requirements"
                  className="mt-2 text-sm text-red-400 space-y-1"
                  role="alert"
                >
                  {passwordErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || passwordErrors.length > 0}
            className="w-full bg-emerald-600 hover:bg-emerald-800 text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Create your account"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="text-gray-400 hover:text-emerald-500"
            tabIndex={isLoading ? -1 : 0}
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}