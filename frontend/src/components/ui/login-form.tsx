"use client"

import * as React from "react"
import { useState } from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get table number from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get('table');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Handle HTTP error responses (like 401 for wrong credentials)
        setError(data.message || `Login failed (${res.status})`);
      } else if (!data.success) {
        // Handle successful HTTP response but failed login
        setError(data.message || "Login failed");
      } else {
        // Successful login - redirect
        if (tableFromUrl) {
          window.location.href = `/customer/menu?table=${tableFromUrl}`;
        } else {
          window.location.href = "/customer/dashboard";
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      // Only show network error for actual connection issues
      if (err instanceof Error && err.message.includes('fetch')) {
        setError("Cannot connect to server. Please check your connection and try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:gap-6 max-w-md w-full mx-auto p-3 sm:p-0", className)} {...props}>
      <Card>
        <CardHeader className="px-3 pt-3 pb-1 sm:px-6 sm:pt-6 sm:pb-2">
          <CardTitle className="text-lg sm:text-2xl">Login to your account</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pt-1 pb-3 sm:px-6 sm:pt-2 sm:pb-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2 sm:gap-6">
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-12 h-10 sm:h-11 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              <div className="text-right">
                <Link
                  to="/customer/forgot-password"
                  className="inline-block text-xs sm:text-sm underline-offset-4 hover:underline text-[#a87437]"
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="flex flex-col gap-2 sm:gap-3">
                <Button type="submit" className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white h-10 sm:h-11 text-sm sm:text-base" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <Button variant="outline" className="w-full border-[#a87437] text-[#a87437] hover:bg-[#f6efe7] h-10 sm:h-11 text-sm sm:text-base" type="button" disabled={loading} onClick={() => window.location.href = "/api/auth/google"}>
                  Login with Google
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-xs sm:text-sm">
              Don&apos;t have an account?{" "}
              <a href="/customer-signup" className="underline underline-offset-4 text-[#a87437] hover:text-[#8f652f]">
                Sign up
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-xs sm:text-sm text-[#6B5B5B] mt-1 sm:mt-2 mb-6 sm:mb-8 md:mb-10">
        <a href="/privacy" className="hover:text-[#a87437] underline underline-offset-4">Privacy Policy</a>
        <span className="mx-2">•</span>
        <a href="/terms" className="hover:text-[#a87437] underline underline-offset-4">Terms of Service</a>
        <span className="mx-2">•</span>
        <a href="/accessibility" className="hover:text-[#a87437] underline underline-offset-4">Accessibility</a>
      </div>
    </div>
  );
} 