"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LockKeyhole, LogIn, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl: params.get("callbackUrl") || "/admin",
    });

    setLoading(false);

    if (result?.error) {
      setError("Username atau password tidak cocok.");
      return;
    }

    router.push(result?.url || "/admin");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-7 shadow-xs">
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-xl font-medium tracking-tight text-slate-900">
          Console Operator
        </h2>
        <p className="mt-1 text-xs font-normal text-slate-500">
          Masuk untuk mengelola alur dan hasil perlombaan.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-xs font-medium text-slate-700">
            Username
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="Masukkan username"
              required
              className="h-10 border-slate-200 pl-9 pr-3 text-sm focus-visible:ring-1 focus-visible:ring-[#c41f2e] focus-visible:border-[#c41f2e]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-slate-700">
            Password
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <LockKeyhole className="h-4 w-4" />
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan password"
              required
              className="h-10 border-slate-200 pl-9 pr-9 text-sm focus-visible:ring-1 focus-visible:ring-[#c41f2e] focus-visible:border-[#c41f2e]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-hidden"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 font-medium">
            {error}
          </div>
        ) : null}

        <Button
          className="mt-2 h-10 w-full bg-[#c41f2e] hover:bg-[#a81926] text-white font-medium text-sm transition-colors shadow-none"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Memproses...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4" />
              Masuk
            </span>
          )}
        </Button>
      </form>

      {/* Footer Logo */}
      <div className="mt-6 border-t border-slate-100 pt-4 text-center">
        <div className="relative mx-auto h-7 w-32">
          <Image
            src="/brand/wig-logo.png"
            alt="PT Wijaya Inovasi Gemilang"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}


