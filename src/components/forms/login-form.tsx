"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    console.log("LoginForm mounted on client");
    // Test if JavaScript is working
    if (typeof window !== "undefined") {
      console.log("Window object available - JavaScript is working");
    }
  }, []);

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

      login(result.user);
      router.push("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccountClick = (account: DemoAccount) => {
    console.log("Demo account clicked:", account);
    
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
    
    console.log("Values set - email:", account.email, "password:", account.password);
    console.log("After setValue - email watch:", watch("email"), "password watch:", watch("password"));
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
                alert(`Button clicked for: ${account.email}`);
                console.log("Button clicked for:", account.email);
                handleDemoAccountClick(account);
              }}
              onMouseDown={() => console.log("Mouse down on:", account.email)}
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
            console.log("Email input render - field.value:", field.value, "email state:", email, "inputValue:", inputValue);
            return (
              <Input
                id="email"
                name={field.name}
                type="email"
                placeholder="you@example.com"
                value={inputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log("Email onChange - newValue:", newValue);
                  setEmail(newValue);
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
            console.log("Password input render - field.value:", field.value, "password state:", password, "inputValue:", inputValue);
            return (
              <Input
                id="password"
                name={field.name}
                type="password"
                placeholder="••••••••"
                value={inputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log("Password onChange - newValue:", newValue);
                  setPassword(newValue);
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

