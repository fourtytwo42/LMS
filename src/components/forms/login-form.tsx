"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/utils/validation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

interface DemoAccount {
  email: string;
  password: string;
  role: string;
  name: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@lms.com",
    password: "admin123",
    role: "ADMIN",
    name: "Admin User",
  },
  {
    email: "instructor@lms.com",
    password: "instructor123",
    role: "INSTRUCTOR",
    name: "Instructor Demo",
  },
  {
    email: "learner@lms.com",
    password: "learner123",
    role: "LEARNER",
    name: "Learner Demo",
  },
];

export function LoginForm() {
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Sync local state with form
  const emailValue = watch("email");
  const passwordValue = watch("password");
  
  // Update local state when form values change
  useEffect(() => {
    if (emailValue !== undefined && emailValue !== email) {
      setEmail(emailValue || "");
    }
  }, [emailValue, email]);
  
  useEffect(() => {
    if (passwordValue !== undefined && passwordValue !== password) {
      setPassword(passwordValue || "");
    }
  }, [passwordValue, password]);

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Login failed");
        return;
      }

      // Update auth store
      login(result.user);
      
      // Log success
      console.log("Login successful, user:", result.user);
      console.log("Response status:", response.status);
      
      // Note: Set-Cookie header is not accessible to JavaScript for security reasons
      // But cookies should still be set automatically by the browser
      console.log("Cookies should be set automatically by browser (httpOnly cookies)");
      
      // Test if we can make an authenticated request to verify cookies are set
      try {
        console.log("Testing if cookies are set by making a test API call...");
        const testResponse = await fetch("/api/analytics/overview", {
          method: "GET",
          credentials: "include", // Important: include cookies
        });
        console.log("Test API call status:", testResponse.status);
        if (testResponse.ok) {
          console.log("✅ Cookies are working! API call succeeded.");
        } else {
          console.warn("⚠️ Cookies might not be set. API call failed with status:", testResponse.status);
        }
      } catch (testErr) {
        console.error("❌ Error testing cookies:", testErr);
      }
      
      // Wait a moment to ensure cookies are set
      console.log("Waiting 1 second before redirect...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use window.location for a full page reload to ensure cookies are available
      console.log("Redirecting to dashboard...");
      window.location.href = "/dashboard";
    } catch (err) {
      // Log the full error before setting error message
      console.error("Login error:", err);
      if (err instanceof Error) {
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
      }
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleDemoAccountClick = (account: DemoAccount) => {
    // Update form state first - this is what Controller uses
    setValue("email", account.email, { 
      shouldValidate: false, 
      shouldDirty: true,
      shouldTouch: true 
    });
    setValue("password", account.password, { 
      shouldValidate: false, 
      shouldDirty: true,
      shouldTouch: true 
    });
    
    // Also update local state to keep in sync
    setEmail(account.email);
    setPassword(account.password);
    
    // Also reset form to ensure everything is in sync
    reset({
      email: account.email,
      password: account.password,
    }, {
      keepDefaultValues: false,
    });
    
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Demo Accounts Section */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">Demo Accounts (Click to fill)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDemoAccountClick(account);
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
            >
              <div className="font-medium text-gray-900">{account.name}</div>
              <div className="text-xs text-gray-500">{account.role}</div>
              <div className="mt-1 truncate text-xs text-gray-400">{account.email}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => {
            // Use field.value directly from Controller
            const inputValue = field.value ?? "";
            return (
              <Input
                id="email"
                name={field.name}
                type="email"
                placeholder="you@example.com"
                value={inputValue}
                onChange={(e) => {
                  setEmail(e.target.value);
                  field.onChange(e);
                }}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.email?.message}
              />
            );
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => {
            // Use field.value directly from Controller
            const inputValue = field.value ?? "";
            return (
              <Input
                id="password"
                name={field.name}
                type="password"
                placeholder="••••••••"
                value={inputValue}
                onChange={(e) => {
                  setPassword(e.target.value);
                  field.onChange(e);
                }}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.password?.message}
              />
            );
          }}
        />
      </div>

      <div className="pt-2">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log in"}
        </Button>
      </div>
    </form>
    </div>
  );
}

